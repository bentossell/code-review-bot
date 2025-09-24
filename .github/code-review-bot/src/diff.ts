import { minimatch } from 'minimatch';
import type { AnalyzerFinding, ReviewConfig } from './types.js';

export type FileChange = {
  filePath: string;
  additions: number;
  deletions: number;
  hunks: string[];
};

export const parseDiff = (diff: string, config: ReviewConfig): FileChange[] => {
  const files: FileChange[] = [];
  const fileDiffs = diff.split(/^diff --git/m).slice(1);

  for (const chunk of fileDiffs) {
    const lines = chunk.split('\n');
    const header = lines.find((line) => line.startsWith('+++ b/'));
    if (!header) continue;

    const filePath = header.replace('+++ b/', '').trim();
    if (!shouldIncludeFile(filePath, config)) continue;

    let additions = 0;
    let deletions = 0;
    const hunks: string[] = [];
    let currentHunk: string[] = [];

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentHunk.length) {
          hunks.push(currentHunk.join('\n'));
          currentHunk = [];
        }
        currentHunk.push(line);
      } else if (line.startsWith('+')) {
        additions += 1;
        currentHunk.push(line);
      } else if (line.startsWith('-')) {
        deletions += 1;
      } else if (currentHunk.length) {
        currentHunk.push(line);
      }
    }

    if (currentHunk.length) {
      hunks.push(currentHunk.join('\n'));
    }

    files.push({ filePath, additions, deletions, hunks });
  }

  return files;
};

export const shouldIncludeFile = (filePath: string, config: ReviewConfig): boolean => {
  if (config.exclude.some((pattern) => minimatch(filePath, pattern))) {
    return false;
  }
  if (!config.include.some((pattern) => minimatch(filePath, pattern))) {
    return false;
  }
  return true;
};

export const filterFindingsBySeverity = (
  findings: AnalyzerFinding[],
  threshold: ReviewConfig['severityThreshold'],
): AnalyzerFinding[] => {
  const order = { info: 0, warning: 1, error: 2 };
  const thresholdValue = order[threshold];
  return findings.filter((finding) => order[finding.severity] >= thresholdValue);
};
