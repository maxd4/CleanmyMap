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

test('CI reliability classifies failures, retries, and slowest jobs', () => {
  assert.equal(classifyRunFailure('cancelled', 1, []), 'CANCELLED');
  assert.equal(classifyRunFailure('timed_out', 1, []), 'INFRA_OR_TIMEOUT');
  assert.equal(classifyRunFailure('failure', 2, ['failure']), 'FLAKY_OR_INDETERMINATE');
  assert.equal(classifyRunFailure('failure', 1, ['failure']), 'REGRESSION_OR_PERSISTENT_FAIL');

  const summary = summarizeCicdReliability([
    {
      workflowName: 'CI',
      headSha: 'abc',
      attempt: 2,
      conclusion: 'failure',
      jobs: [{ name: 'web-tests', labels: ['ubuntu-latest'], conclusion: 'failure', started_at: '2026-11-26T00:00:00Z', completed_at: '2026-11-26T00:05:00Z' }],
    },
    {
      workflowName: 'CI',
      headSha: 'def',
      attempt: 1,
      conclusion: 'cancelled',
      jobs: [{ name: 'mobile-quality', labels: ['ubuntu-latest'], conclusion: 'cancelled', started_at: '2026-11-26T00:00:00Z', completed_at: '2026-11-26T00:01:00Z' }],
    },
  ]);
  assert.equal(summary.retriedRuns, 1);
  assert.equal(summary.failureBreakdown.FLAKY_OR_INDETERMINATE, 1);
  assert.equal(summary.failureBreakdown.CANCELLED, 1);
  assert.equal(summary.slowestJobs[0].job, 'web-tests');
  assert.equal(summary.slowestJobs[0].avgDurationMs, 300000);
  assert.equal(summary.recurringFailures[0].failures, 1);
});
