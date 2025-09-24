import type { ExecaError } from 'execa';
import { execa } from 'execa';
import * as core from '@actions/core';
import type { AnalyzerFinding, ReviewConfig } from '../types.js';

export const runEslint = async (config: ReviewConfig): Promise<AnalyzerFinding[]> => {
  if (!config.enabledAnalyzers.eslint) {
    core.info('ESLint analyzer disabled.');
    return [];
  }

  try {
    const result = await execa('npx', ['eslint', '--format', 'json', ...config.include], {
      stdio: 'pipe',
    });
    if (!result.stdout) return [];
    const reports = JSON.parse(result.stdout) as Array<{
      filePath: string;
      messages: Array<{
        ruleId: string | null;
        message: string;
        line: number;
        severity: number;
      }>;
    }>;

    return reports.flatMap((report) =>
      report.messages.map((message) => ({
        source: 'eslint' as const,
        file: report.filePath,
        line: message.line ?? 1,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
        ruleId: message.ruleId ?? undefined,
      })),
    );
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      const stdout = (error as ExecaError).stdout;
      if (stdout) {
        const reports = JSON.parse(stdout);
        return reports.flatMap((report: any) =>
          report.messages.map((message: any) => ({
            source: 'eslint' as const,
            file: report.filePath,
            line: message.line ?? 1,
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            ruleId: message.ruleId ?? undefined,
          })),
        );
      }
    }
    core.warning(`ESLint execution failed: ${(error as Error).message}`);
    return [];
  }
};
