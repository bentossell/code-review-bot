import type { ExecaError } from 'execa';
import { execa } from 'execa';
import * as core from '@actions/core';
import type { AnalyzerFinding, ReviewConfig } from '../types.js';

export const runTypescriptChecker = async (): Promise<AnalyzerFinding[]> => {
  try {
    const result = await execa('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });
    if (result.exitCode === 0) {
      return [];
    }
  } catch (error) {
    const output = (error as ExecaError).stdout ?? '';
    return parseTscOutput(output);
  }
  return [];
};

const parseTscOutput = (output: string): AnalyzerFinding[] => {
  const findings: AnalyzerFinding[] = [];
  const lines = output.split('\n');
  const regex = /(.*)\((\d+),(\d+)\): error (TS\d+): (.*)/;
  for (const line of lines) {
    const match = line.match(regex);
    if (!match) continue;
    const [, file, lineNumber, , code, message] = match;
    findings.push({
      source: 'typescript',
      file,
      line: Number(lineNumber),
      severity: 'error',
      message: `${code}: ${message}`,
      ruleId: code,
    });
  }
  return findings;
};

export const runTypescriptAnalyzer = async (config: ReviewConfig): Promise<AnalyzerFinding[]> => {
  if (!config.enabledAnalyzers.typescript) {
    core.info('TypeScript analyzer disabled.');
    return [];
  }
  return runTypescriptChecker();
};
