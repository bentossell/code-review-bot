## Code Review Bot Plan

### 1. Objectives
- Automatically analyze pull requests and provide actionable review comments.
- Operate entirely via GitHub (no external hosting required for v1).
- Offer configurable rules for files, severity levels, and LLM usage.

### 2. High-Level Architecture
- **GitHub Action Workflow** triggered on `pull_request` (`opened`, `synchronize`, `ready_for_review`).
- **Action Runner (TypeScript/Node)** inside repo using a reusable composite action.
- **LLM Review Service** (OpenAI/Anthropic via HTTPS) invoked from the action when enabled.
- **Rule-Based Checks** using ESLint/Prettier/TypeScript diagnostics to supplement LLM feedback.
- **GitHub REST API Client** posts summary + inline review comments.

### 3. Repository Structure
```
.github/
  workflows/
    review.yml              # entry workflow
  code-review-bot/
    action.yml              # composite action definition
    package.json            # dependencies & scripts
    src/
      index.ts              # action entry
      diff.ts               # PR diff extraction utilities
      analyzers/
        eslint.ts
        typescript.ts
      reviewers/
        llmReviewer.ts      # optional LLM integration
      report.ts             # formats output -> comments
      github.ts             # REST helpers
    config/
      defaultRules.json     # default rule set
    tests/
      fixtures/             # sample payloads
      index.test.ts         # unit tests with jest
```

### 4. Workflow Outline (`.github/workflows/review.yml`)
1. Trigger on PR events (exclude draft).
2. Jobs:
   - `run-review` on latest `ubuntu-latest`.
   - Steps: checkout, use Node 20, install deps with caching, run `npm run review` (calls action).
3. Secrets required:
   - `GITHUB_TOKEN` (provided by Actions) for posting comments.
   - Optional `LLM_API_KEY` for AI review (stored as repository secret).
4. Outputs: job summary, annotations, comment ID for updates.

### 5. Review Flow (within action)
1. Fetch PR metadata + patch diff via GitHub REST.
2. Filter files based on config (include/exclude patterns, size guardrails).
3. Run static analyzers:
   - ESLint (JS/TS) respecting repo config.
   - TypeScript `tsc --noEmit` when tsconfig found.
   - Optional custom rule engine (e.g., regex heuristics).
4. Aggregate diagnostics into structured findings (type, file, line, message, severity).
5. If `LLM_API_KEY` available and diff size < threshold:
   - Chunk diff/context (max tokens), send prompt to LLM for review suggestions.
   - Parse response into findings with source = `ai`.
6. Deduplicate/conflict resolution between analyzers and LLM suggestions.
7. Post results:
   - Inline review comments (batch) for actionable findings (use `pulls.createReview`).
   - Single summary comment with table of issues + remediation tips.
   - Update existing bot comment if rerun (store comment ID via marker string).

### 6. Configuration Strategy
- Default behavior defined in `defaultRules.json`.
- Allow per-repo override via `.github/code-review-bot.json` supporting:
  - `enabledAnalyzers`, `llm: { enabled, provider, model, maxDiffBytes }`.
  - `fileFilters`, `severityThreshold`, `maxComments`.
- Validate config schema with Zod before running.

### 7. Testing Plan
- Unit tests (Jest) for diff parsing, config validation, LLM response parsing.
- Integration tests using `@actions/github` mocks for posting reviews.
- Workflow smoke test with `act` locally on sample PR event.
- Dry-run mode (`INPUT_DRY_RUN=true`) logs findings instead of commenting, used in CI before enabling real comments.

### 8. Documentation Deliverables
- `README.md` describing setup, required secrets, permissions, configuration examples.
- Example PR showcasing bot comments (screenshots or text sample).

### 9. Future Enhancements (post-v1)
- Support for language-specific linters (Go, Python) via plugin interface.
- Auto-fix suggestions (GitHub Suggested Changes) for simple issues.
- Metrics dashboard (number of comments, time saved) via GitHub Insights.
- Slack/Teams notifications when high-severity issues found.

### 10. Risks & Mitigations
- **LLM Latency/Cost**: guard by file-size thresholds and concurrency limits.
- **Duplicate Comments**: track comment IDs with unique markers and clean prior runs.
- **Token Leaks**: use GitHub secrets, avoid logging request payloads.
- **Action Timeout**: parallelize analyzers, short-circuit when diff > limit.
