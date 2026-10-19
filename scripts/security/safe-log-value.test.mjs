import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeLogValue } from "./safe-log-value.mjs";

test("safe log values stay on one line and neutralize terminal controls", () => {
  const value = sanitizeLogValue("safe\nforged\r\u001b[31mred\u0000");

  assert.equal(value, "safe\\u000aforged\\u000d\\u001b[31mred\\u0000");
  assert.doesNotMatch(value, /[\r\n\u0000-\u001f\u007f-\u009f]/);
});

test("safe log values are bounded without changing field labels", () => {
  assert.equal(sanitizeLogValue("x".repeat(20), 8), "…[trunca");
  assert.equal(sanitizeLogValue("xx", 1), "…");
  assert.equal(sanitizeLogValue("x".repeat(256), 256).length, 256);
  assert.equal(sanitizeLogValue("x".repeat(300)).length, 256);
  assert.equal(sanitizeLogValue("short", 256), "short");
  assert.throws(() => sanitizeLogValue("value", 0), /maxLength/);
});

test("safe log truncation preserves escape-token and Unicode boundaries", () => {
  const value = sanitizeLogValue(`😀😀\r\n\u0000\u001b[31m\u0085${"x".repeat(300)}`, 20);

  assert.ok(value.length <= 20);
  assert.doesNotMatch(value, /[\r\n\u0000-\u001f\u007f-\u009f]/);
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      assert.ok(value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff);
      index += 1;
    } else {
      assert.ok(codeUnit < 0xdc00 || codeUnit > 0xdfff);
    }
  }
  assert.equal(value, sanitizeLogValue(`😀😀\r\n\u0000\u001b[31m\u0085${"x".repeat(300)}`, 20));
});
