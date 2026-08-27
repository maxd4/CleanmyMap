import assert from 'node:assert/strict';

import { escapeTableCell, markdownTable } from './cicd-metrics-report.mjs';

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
