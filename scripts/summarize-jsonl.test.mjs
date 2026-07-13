import assert from 'node:assert/strict';

import { escapeCell, table } from './summarize-jsonl.mjs';

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
