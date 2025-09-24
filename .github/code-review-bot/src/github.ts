import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PullRequestContext } from './types.js';

export const getPullRequestContext = (): PullRequestContext => {
  const { pull_request: pr } = github.context.payload;
  if (!pr) {
    throw new Error('No pull request context available.');
  }

  return {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pullNumber: pr.number,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
  };
};

export const getOctokit = (token: string) => {
  if (!token) {
    throw new Error('GitHub token is required.');
  }
  return github.getOctokit(token);
};

export const fetchPullRequestDiff = async (
  token: string,
  ctx: PullRequestContext,
): Promise<string> => {
  const octokit = getOctokit(token);
  const response = await octokit.rest.pulls.get({
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    mediaType: {
      format: 'patch',
    },
  });
  if (typeof response.data !== 'string') {
    throw new Error('Expected diff string from GitHub API.');
  }
  return response.data;
};

export const createOrUpdateReviewComment = async (
  token: string,
  ctx: PullRequestContext,
  body: string,
  event: 'COMMENT' | 'REQUEST_CHANGES' | 'APPROVE' = 'COMMENT',
) => {
  const octokit = getOctokit(token);
  core.info('Submitting pull request review.');
  await octokit.rest.pulls.createReview({
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    event,
    body,
  });
};
