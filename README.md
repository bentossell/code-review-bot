# Code Review Bot

A GitHub Action that reviews pull requests by combining static analysis (ESLint, TypeScript) and optional LLM feedback, then leaves a summary comment on the PR.

## How It Works

1. Workflow in `.github/workflows/review.yml` triggers on pull request events.
2. Composite action in `.github/code-review-bot/` installs dependencies, builds the TypeScript sources, and runs the review script.
3. The script collects findings from analyzers and (optionally) an LLM, filters them by severity, and posts a review comment via the GitHub API.

## Setup

1. Ensure the repository has the workflow intact (`.github/workflows/review.yml`).
2. Configure secrets:
   - `GITHUB_TOKEN` is provided automatically by GitHub Actions.
   - `LLM_API_KEY` *(optional)* – required only if LLM reviews are enabled in config.
3. Merge the workflow into the default branch. All future PRs will be reviewed automatically.

## Configuration

Default settings live in `.github/code-review-bot/config/defaultRules.json`:

- Enable/disable analyzers (`eslint`, `typescript`, `llm`).
- Include/exclude file globs.
- LLM model and diff size guardrails.
- Severity threshold and maximum comments.

Override rules by adding `.github/code-review-bot.json` in the target repository (follow the same schema as the default file).

## Development

```bash
cd .github/code-review-bot
npm install
npm run build
node dist/index.js # requires PR event context + tokens
```

Use local tooling like [`act`](https://github.com/nektos/act) to simulate pull request events:

```bash
act pull_request -j run-review \
  -s GITHUB_TOKEN=ghp_your_token \
  -s LLM_API_KEY=your_llm_key
```

## Roadmap

- Implement configurable overrides per repo (plan step 6).
- Add automated tests and dry-run mode (plan steps 7+).
- Support additional language analyzers and auto-fix suggestions.
