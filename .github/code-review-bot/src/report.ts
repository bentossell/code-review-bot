import type { AnalyzerFinding, ReviewResult } from './types.js';

const severityEmoji: Record<AnalyzerFinding['severity'], string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
};

export const buildReviewSummary = (findings: AnalyzerFinding[]): ReviewResult => {
  if (!findings.length) {
    return {
      findings,
      summary: '✅ No issues detected by the review bot.',
    };
  }

  const grouped = findings.reduce<Record<string, AnalyzerFinding[]>>((acc, finding) => {
    const key = `${finding.file}:${finding.line}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(finding);
    return acc;
  }, {});

  const summaryLines = Object.entries(grouped).map(([key, items]) => {
    const [file, line] = key.split(':');
    const topFinding = items[0];
    return `- ${severityEmoji[topFinding.severity]} \
**${file}** line ${line}: ${topFinding.message} (${topFinding.source})`;
  });

  return {
    findings,
    summary: ['### Code Review Bot Findings', ...summaryLines].join('\n'),
  };
};

export const truncateFindings = (findings: AnalyzerFinding[], max: number): AnalyzerFinding[] =>
  findings.slice(0, max);
