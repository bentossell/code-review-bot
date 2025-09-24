export type AnalyzerFinding = {
  source: 'eslint' | 'typescript' | 'llm';
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  ruleId?: string;
};

export type PullRequestContext = {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  baseSha: string;
};

export type ReviewConfig = {
  enabledAnalyzers: {
    eslint: boolean;
    typescript: boolean;
    llm: boolean;
  };
  include: string[];
  exclude: string[];
  llm?: {
    model: string;
    maxDiffBytes: number;
  };
  severityThreshold: 'info' | 'warning' | 'error';
  maxComments: number;
};

export type ReviewResult = {
  findings: AnalyzerFinding[];
  summary: string;
};
