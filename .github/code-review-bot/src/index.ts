import * as core from '@actions/core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getPullRequestContext, fetchPullRequestDiff, createOrUpdateReviewComment } from './github.js';
import { parseDiff, filterFindingsBySeverity } from './diff.js';
import { runEslint } from './analyzers/eslint.js';
import { runTypescriptAnalyzer } from './analyzers/typescript.js';
import { runLlmReview } from './reviewers/llmReviewer.js';
import { buildReviewSummary, truncateFindings } from './report.js';
import type { ReviewConfig } from './types.js';

const configSchema = z.object({
  enabledAnalyzers: z.object({
    eslint: z.boolean().default(true),
    typescript: z.boolean().default(true),
    llm: z.boolean().default(false),
  }),
  include: z.array(z.string()).default(['**/*.ts', '**/*.tsx']),
  exclude: z.array(z.string()).default(['**/node_modules/**', '**/dist/**']),
  llm: z
    .object({
      model: z.string().default('gpt-4o-mini'),
      maxDiffBytes: z.number().default(60000),
    })
    .optional(),
  severityThreshold: z.enum(['info', 'warning', 'error']).default('warning'),
  maxComments: z.number().int().positive().default(15),
});

const loadConfig = async (): Promise<ReviewConfig> => {
  const defaultConfigPath = path.join(process.cwd(), 'config', 'defaultRules.json');
  const content = await readFile(defaultConfigPath, 'utf8');
  const parsed = configSchema.parse(JSON.parse(content));
  return parsed;
};

const run = async () => {
  try {
    const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
    if (!githubToken) {
      throw new Error('GitHub token missing. Provide via input or env.');
    }
    const llmApiKey = core.getInput('llm-api-key') || process.env.LLM_API_KEY;

    const config = await loadConfig();
    const prContext = getPullRequestContext();
    const diff = await fetchPullRequestDiff(githubToken, prContext);
    const files = parseDiff(diff, config);
    core.info(`Analyzing ${files.length} files from diff.`);

    const [eslintFindings, tsFindings, llmFindings] = await Promise.all([
      runEslint(config),
      runTypescriptAnalyzer(config),
      runLlmReview(config, diff, llmApiKey, prContext),
    ]);

    const findings = filterFindingsBySeverity(
      [...eslintFindings, ...tsFindings, ...llmFindings],
      config.severityThreshold,
    );
    const limitedFindings = truncateFindings(findings, config.maxComments);
    const { summary } = buildReviewSummary(limitedFindings);

    await createOrUpdateReviewComment(githubToken, prContext, summary);
    core.info('Review posted successfully.');
  } catch (error) {
    core.setFailed((error as Error).message);
  }
};

void run();
