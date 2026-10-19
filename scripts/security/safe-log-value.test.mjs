import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeLogValue } from "./safe-log-value.mjs";

test("safe log values stay on one line and neutralize terminal controls", () => {
  const value = sanitizeLogValue("safe\nforged\r\u001b[31mred\u0000");

  assert.equal(value, "safe\\u000aforged\\u000d\\u001b[31mred\\u0000");
  assert.doesNotMatch(value, /[\r\n\u0000-\u001f\u007f-\u009f]/);
});

test("safe log values are bounded without changing field labels", () => {
  assert.equal(sanitizeLogValue("x".repeat(20), 8), "xxxxxxxx…[truncated]");
  assert.throws(() => sanitizeLogValue("value", 0), /maxLength/);
});
