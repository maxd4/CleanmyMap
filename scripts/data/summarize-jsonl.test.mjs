import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ALL_TOKEN_FIELDS, NA, analyzeRoot, escapeCell, table } from './summarize-jsonl.mjs';

const escaped = escapeCell('a\\b|c`d');
assert.ok(escaped.includes('\\\\'));
assert.ok(escaped.includes('\\|'));
assert.ok(escaped.includes('\\`'));
assert.equal(escapeCell('line1\nline2'), 'line1 line2');

const rendered = table(['col|1', 'col`2'], [['x\\y', 'z|w']]);
assert.ok(rendered.includes('col\\|1'));
assert.ok(rendered.includes('col\\`2'));
assert.ok(rendered.includes('x\\\\y'));
assert.ok(rendered.includes('z\\|w'));

const SESSION_ID = '00000000-0000-4000-8000-000000000001';

function counters(input, cached, cacheWrite, output, reasoning) {
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    cache_write_input_tokens: cacheWrite,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: input + output,
  };
}

function sessionMeta(sessionId = SESSION_ID) {
  return {
    timestamp: '2026-09-18T00:00:00.000Z',
    ordinal: 0,
    type: 'session_meta',
    payload: {
      id: sessionId,
      session_id: sessionId,
      timestamp: '2026-09-18T00:00:00.000Z',
      cwd: 'C:\\\\workspace\\\\example',
      model_provider: 'test-provider',
      git: { repository_url: 'https://example.invalid/repo.git', branch: 'main', commit_hash: 'abc123' },
    },
  };
}

function tokenEvent(ordinal, value, sessionId = SESSION_ID, timestamp) {
  return {
    timestamp: timestamp ?? '2026-09-18T00:00:' + String(ordinal).padStart(2, '0') + '.000Z',
    ordinal,
    type: 'token_usage_record',
    payload: {
      response_id: 'response-' + ordinal,
      session_id: sessionId,
      turn_id: 'turn-' + ordinal,
      usage: value,
      turn_token_usage: value,
      thread_token_usage: value,
    },
  };
}

function writeRollout(root, area, name, events, suffix = '') {
  const dir = path.join(root, area, '2026', '09');
  mkdirSync(dir, { recursive: true });
  const fileName = 'rollout-2026-09-18T00-00-00-' + name + suffix + '.jsonl';
  const filePath = path.join(dir, fileName);
  writeFileSync(filePath, events.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8');
  return filePath;
}

function tempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), 'summarize-jsonl-'));
}

function analyze(events, options = {}) {
  const root = tempRoot();
  writeRollout(root, 'sessions', '00000000-0000-4000-8000-000000000001', [sessionMeta(), ...events]);
  if (options.archived) {
    writeRollout(root, 'archived_sessions', '00000000-0000-4000-8000-000000000001', [sessionMeta(), ...events], '-copy');
  }
  return analyzeRoot(root);
}

test('simple counter is reconstructed exactly', () => {
  const report = analyze([tokenEvent(1, counters(100, 40, 2, 20, 7))]);
  const session = report.sessions[0];
  assert.deepEqual(session.token_counters, {
    input_tokens: 100,
    cached_input_tokens: 40,
    cache_write_input_tokens: 2,
    uncached_input_tokens: 60,
    output_tokens: 20,
    reasoning_output_tokens: 7,
    total_tokens: 120,
  });
  assert.equal(session.tokenReconstruction.quality.status, 'DERIVED_FROM_CUMULATIVE_COUNTER');
});

test('cumulative counter uses deltas instead of summing snapshots', () => {
  const report = analyze([
    tokenEvent(1, counters(100, 50, 0, 10, 4)),
    tokenEvent(2, counters(160, 90, 0, 25, 9)),
  ]);
  assert.equal(report.sessions[0].token_counters.input_tokens, 160);
  assert.equal(report.sessions[0].token_counters.output_tokens, 25);
  assert.equal(report.sessions[0].token_counters.total_tokens, 185);
});

test('repeated active and archived copies are deduplicated before aggregation', () => {
  const report = analyze([tokenEvent(1, counters(100, 0, 0, 10, 2))], { archived: true });
  assert.equal(report.deduplication.rawRolloutFiles, 2);
  assert.equal(report.deduplication.uniqueSessions, 1);
  assert.equal(report.deduplication.duplicateSessionCopies, 1);
  assert.equal(report.deduplication.crossSourceDuplicateSessions, 1);
  assert.equal(report.sessions[0].token_counters.total_tokens, 110);
});

test('counter reset is handled as a new cumulative segment', () => {
  const report = analyze([
    tokenEvent(1, counters(100, 0, 0, 10, 2)),
    tokenEvent(2, counters(150, 0, 0, 20, 4)),
    tokenEvent(3, counters(20, 0, 0, 5, 1)),
  ]);
  const session = report.sessions[0];
  assert.equal(session.token_counters.input_tokens, 170);
  assert.equal(session.token_counters.output_tokens, 25);
  assert.ok(session.tokenReconstruction.quality.reasons.some((reason) => reason.includes('reset')));
});

test('non-monotone decrease is never silently treated as a negative delta', () => {
  const report = analyze([
    tokenEvent(1, counters(100, 0, 0, 10, 2)),
    tokenEvent(2, counters(80, 0, 0, 8, 1)),
    tokenEvent(3, counters(90, 0, 0, 12, 3)),
  ]);
  assert.equal(report.sessions[0].token_counters.input_tokens, 190);
  assert.equal(report.sessions[0].tokenReconstruction.stats.input_tokens.decreases, 1);
});

test('cached input is included in input and subtracted for uncached input', () => {
  const report = analyze([tokenEvent(1, counters(100, 60, 0, 10, 2))]);
  assert.equal(report.sessions[0].token_counters.input_tokens, 100);
  assert.equal(report.sessions[0].token_counters.cached_input_tokens, 60);
  assert.equal(report.sessions[0].token_counters.uncached_input_tokens, 40);
  assert.notEqual(report.sessions[0].token_counters.total_tokens, 160);
});

test('reasoning output is not added a second time to output or total', () => {
  const report = analyze([tokenEvent(1, counters(100, 0, 0, 20, 15))]);
  assert.equal(report.sessions[0].token_counters.output_tokens, 20);
  assert.equal(report.sessions[0].token_counters.reasoning_output_tokens, 15);
  assert.equal(report.sessions[0].token_counters.total_tokens, 120);
});

test('missing fields are represented as NA', () => {
  const partial = { input_tokens: 100, output_tokens: 20, total_tokens: 120 };
  const report = analyze([tokenEvent(1, partial)]);
  const countersFound = report.sessions[0].token_counters;
  for (const field of ['cached_input_tokens', 'cache_write_input_tokens', 'uncached_input_tokens', 'reasoning_output_tokens']) {
    assert.equal(countersFound[field], NA);
  }
  assert.equal(report.sessions[0].tokenReconstruction.quality.status, 'PARTIAL');
});

test('per-event usage without cumulative fields is exact and is not treated as a snapshot', () => {
  const root = tempRoot();
  const event = tokenEvent(1, counters(100, 20, 0, 10, 3));
  delete event.payload.thread_token_usage;
  delete event.payload.turn_token_usage;
  writeRollout(root, 'sessions', '00000000-0000-4000-8000-000000000001', [sessionMeta(), event]);
  const report = analyzeRoot(root);
  assert.equal(report.sessions[0].tokenReconstruction.source, 'token_usage_record.usage');
  assert.equal(report.sessions[0].tokenReconstruction.quality.status, 'EXACT');
  assert.equal(report.sessions[0].token_counters.total_tokens, 110);
});

test('event_msg total_token_usage is used when token_usage_record is absent', () => {
  const root = tempRoot();
  const totals = counters(100, 20, 0, 10, 3);
  const event = {
    timestamp: '2026-09-18T00:00:01.000Z',
    ordinal: 1,
    type: 'event_msg',
    payload: { info: { total_token_usage: totals, last_token_usage: totals } },
  };
  writeRollout(root, 'sessions', '00000000-0000-4000-8000-000000000001', [sessionMeta(), event]);
  const report = analyzeRoot(root);
  assert.equal(report.sessions[0].tokenReconstruction.source, 'event_msg.info.total_token_usage');
  assert.equal(report.sessions[0].token_counters.total_tokens, 110);
});

test('multiple models in one session are retained as metadata', () => {
  const events = [
    { timestamp: '2026-09-18T00:00:01.000Z', ordinal: 1, type: 'turn_context', payload: { model: 'model-a', cwd: 'C:\\\\workspace\\\\example' } },
    tokenEvent(2, counters(100, 0, 0, 10, 2)),
    { timestamp: '2026-09-18T00:00:03.000Z', ordinal: 3, type: 'turn_context', payload: { model: 'model-b', cwd: 'C:\\\\workspace\\\\example' } },
    tokenEvent(4, counters(150, 0, 0, 20, 4)),
  ];
  const report = analyze(events);
  assert.deepEqual(report.sessions[0].models, ['model-a', 'model-b']);
});

test('partially invalid JSONL is counted without discarding valid metadata', () => {
  const root = tempRoot();
  const dir = path.join(root, 'sessions', '2026', '09');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'rollout-2026-09-18T00-00-00-00000000-0000-4000-8000-000000000001.jsonl');
  const valid = [sessionMeta(), tokenEvent(1, counters(100, 0, 0, 10, 2))].map((event) => JSON.stringify(event));
  writeFileSync(file, valid.concat('{invalid json').join('\n') + '\n', 'utf8');
  const report = analyzeRoot(root);
  assert.equal(report.schemaAudit.invalidJsonLines, 1);
  assert.equal(report.sessions[0].token_counters.total_tokens, 110);
});

test('normalized output never exposes prompt or response content', () => {
  const root = tempRoot();
  const secret = 'SECRET_PROMPT_OR_RESPONSE_CONTENT';
  const contentEvent = {
    timestamp: '2026-09-18T00:00:01.000Z',
    ordinal: 1,
    type: 'response_item',
    payload: { id: 'response-content', text: secret, content: secret },
  };
  writeRollout(root, 'sessions', '00000000-0000-4000-8000-000000000001', [sessionMeta(), contentEvent, tokenEvent(2, counters(100, 0, 0, 10, 2))]);
  const report = analyzeRoot(root);
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.deepEqual(Object.keys(report.sessions[0]).sort(), ['cwd', 'end', 'git', 'models', 'provenance', 'rollout_identity', 'schema', 'session_id', 'start', 'tokenReconstruction', 'token_counters'].sort());
  assert.deepEqual(Object.keys(report.sessions[0].token_counters).sort(), ALL_TOKEN_FIELDS.sort());
});
