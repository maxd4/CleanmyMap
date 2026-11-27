import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyRunFailure, escapeTableCell, markdownTable, summarizeCicdReliability } from './cicd-metrics-report.mjs';

test('CI metrics markdown escapes table content', () => {
const escaped = escapeTableCell('a\\b|c`d\nnext');
assert.ok(escaped.includes('\\\\'));
assert.ok(escaped.includes('\\|'));
assert.ok(escaped.includes('\\`'));
assert.ok(escaped.includes('next'));

const rendered = markdownTable(['col|1', 'col`2'], [['x\\y', 'z|w']]);
assert.ok(rendered.includes('col\\|1'));
assert.ok(rendered.includes('col\\`2'));
assert.ok(rendered.includes('x\\\\y'));
assert.ok(rendered.includes('z\\|w'));
});

test('CI reliability classifies failures, pending runs, retries, workflow/OS separation, and API completeness', () => {
  assert.equal(classifyRunFailure('cancelled', 1, []), 'CANCELLED');
  assert.equal(classifyRunFailure('timed_out', 1, []), 'INFRA_OR_TIMEOUT');
  assert.equal(classifyRunFailure('failure', 2, ['failure']), 'FLAKY_OR_INDETERMINATE');
  assert.equal(classifyRunFailure('failure', 1, ['failure']), 'REGRESSION_OR_PERSISTENT_FAIL');
  assert.equal(classifyRunFailure(null, 1, []), 'INCOMPLETE_OR_PENDING');
  assert.equal(classifyRunFailure(undefined, 1, []), 'INCOMPLETE_OR_PENDING');

  const summary = summarizeCicdReliability([
    {
      workflowName: 'CI',
      headSha: 'abc',
      attempt: 2,
      conclusion: 'failure',
      jobs: [{ name: 'build', labels: ['ubuntu-latest'], conclusion: 'failure', started_at: '2026-11-26T00:00:00Z', completed_at: '2026-11-26T00:05:00Z' }],
    },
    {
      workflowName: 'CodeQL',
      headSha: 'abc',
      attempt: 1,
      conclusion: 'success',
      jobs: [{ name: 'build', labels: ['macos-latest'], conclusion: 'success', started_at: '2026-11-26T00:00:00Z', completed_at: '2026-11-26T00:10:00Z' }],
    },
    {
      workflowName: 'CI',
      headSha: 'def',
      attempt: 1,
      conclusion: 'cancelled',
      jobs: [{ name: 'mobile-quality', labels: ['ubuntu-latest'], conclusion: 'cancelled', started_at: '2026-11-26T00:00:00Z', completed_at: '2026-11-26T00:01:00Z' }],
    },
    {
      workflowName: 'CI',
      headSha: 'ghi',
      attempt: 1,
      conclusion: null,
      jobs: [],
    },
  ], { githubLimit: 4 });
  assert.equal(summary.retriedRuns, 1);
  assert.equal(summary.incompleteRuns, 1);
  assert.equal(summary.failureBreakdown.FLAKY_OR_INDETERMINATE, 1);
  assert.equal(summary.failureBreakdown.CANCELLED, 1);
  assert.equal(summary.failureBreakdown.INCOMPLETE_OR_PENDING, 1);
  assert.equal(summary.apiCompleteness.truncated, true);
  assert.equal(summary.apiCompleteness.jobsUnavailableRuns, 1);
  assert.equal(summary.slowestJobs.length, 3);
  assert.equal(summary.slowestJobs[0].workflow, 'CodeQL');
  assert.equal(summary.slowestJobs[0].runnerOs, 'macos-latest');
  assert.equal(summary.slowestJobs[0].avgDurationMs, 600000);
  assert.equal(summary.slowestJobs[1].workflow, 'CI');
  assert.equal(summary.slowestJobs[1].runnerOs, 'ubuntu-latest');
  assert.equal(summary.slowestJobs[1].avgDurationMs, 300000);
  assert.equal(summary.recurringFailures[0].failures, 1);
});
