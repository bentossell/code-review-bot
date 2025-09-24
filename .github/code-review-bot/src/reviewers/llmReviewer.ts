import * as core from '@actions/core';
import type { AnalyzerFinding, ReviewConfig, PullRequestContext } from '../types.js';
import { createHash } from 'crypto';

const DEFAULT_MODEL = 'gpt-4o-mini';

export const runLlmReview = async (
  config: ReviewConfig,
  diff: string,
  llmApiKey?: string,
  ctx?: PullRequestContext,
): Promise<AnalyzerFinding[]> => {
  if (!config.enabledAnalyzers.llm) {
    core.info('LLM reviewer disabled.');
    return [];
  }
  if (!llmApiKey) {
    core.warning('LLM reviewer enabled but no API key provided. Skipping.');
    return [];
  }

  const maxBytes = config.llm?.maxDiffBytes ?? 60000;
  const diffBytes = Buffer.byteLength(diff, 'utf8');
  if (diffBytes > maxBytes) {
    core.warning(`Diff size ${diffBytes} exceeds max LLM limit ${maxBytes}. Skipping.`);
    return [];
  }

  const prompt = buildPrompt(diff, ctx);
  const model = config.llm?.model ?? DEFAULT_MODEL;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      core.warning(`LLM review failed: ${errorText}`);
      return [];
    }

    const data = (await response.json()) as { output: Array<{ content: Array<{ text: string }> }> };
    const text = data.output?.[0]?.content?.[0]?.text;
    if (!text) {
      core.warning('LLM response did not include content.');
      return [];
    }

    return parseLlmOutput(text);
  } catch (error) {
    core.warning(`LLM request failed: ${(error as Error).message}`);
    return [];
  }
};

const buildPrompt = (diff: string, ctx?: PullRequestContext): string => {
  const contextInfo = ctx ? `Repo: ${ctx.owner}/${ctx.repo}, PR: #${ctx.pullNumber}` : '';
  return `You are a meticulous code reviewer.
${contextInfo}
Review the following diff and identify potential bugs, security issues, or code smells.
Respond using JSON with an array under key "findings". Each finding should have fields: file, line, severity (info|warning|error), message.

Diff:
${diff}`;
};

const parseLlmOutput = (text: string): AnalyzerFinding[] => {
  try {
    const jsonStart = text.indexOf('{');
    if (jsonStart === -1) throw new Error('No JSON detected.');
    const jsonString = text.slice(jsonStart);
    const parsed = JSON.parse(jsonString) as { findings?: AnalyzerFinding[] };
    if (!parsed.findings) return [];
    return parsed.findings.map((finding) => ({
      ...finding,
      source: 'llm' as const,
      line: finding.line ?? 1,
      message: finding.message ?? 'LLM review comment',
      severity: finding.severity ?? 'info',
      file: finding.file ?? 'unknown',
      ruleId: finding.ruleId ?? `llm-${createHash('md5').update(finding.message ?? '').digest('hex').slice(0, 8)}`,
    }));
  } catch (error) {
    core.warning(`Failed to parse LLM output: ${(error as Error).message}`);
    return [];
  }
};
