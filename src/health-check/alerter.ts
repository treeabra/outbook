/**
 * Health check alerter.
 * Creates a GitHub Issue when publishers fail the health check.
 */

import type { PublisherHealthStatus, HealthCheckResult } from './runner.js';

/**
 * Process health check results: create GitHub Issue on failures, log success otherwise.
 */
export async function processHealthCheckResults(result: HealthCheckResult): Promise<void> {
  if (result.failed.length === 0) {
    console.log(`[HealthCheck] All ${result.passed.length} publishers passed.`);
    return;
  }

  console.warn(`[HealthCheck] ${result.failed.length} publisher(s) failed.`);

  const issueBody = buildIssueBody(result.failed);
  await createGitHubIssue(
    `Health Check: ${result.failed.length} publisher(s) failing`,
    issueBody,
  );
}

/**
 * Build the GitHub Issue body listing all failures.
 */
export function buildIssueBody(failures: PublisherHealthStatus[]): string {
  const lines = [
    '## Monthly Health Check Failures',
    '',
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    `**Failed:** ${failures.length} publisher(s)`,
    '',
    '### Failing Publishers',
    '',
  ];

  for (const failure of failures) {
    lines.push(`- **${failure.publisherName}**: ${failure.error ?? 'Unknown error'}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*This issue was automatically created by the health check workflow.*');

  return lines.join('\n');
}

/**
 * Create a GitHub Issue using the GitHub API.
 * Requires GITHUB_TOKEN environment variable.
 */
async function createGitHubIssue(title: string, body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.warn('[HealthCheck] GITHUB_TOKEN or GITHUB_REPOSITORY not set. Printing alert to console:');
    console.warn(`Title: ${title}`);
    console.warn(body);
    return;
  }

  const url = `https://api.github.com/repos/${repo}/issues`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['health-check', 'automated'],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[HealthCheck] Failed to create GitHub Issue: ${response.status} ${text}`);
    } else {
      const data = await response.json() as { html_url: string };
      console.log(`[HealthCheck] Created issue: ${data.html_url}`);
    }
  } catch (err) {
    console.error(`[HealthCheck] Error creating GitHub Issue: ${(err as Error).message}`);
  }
}
