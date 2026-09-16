import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { auditDevcontainer } from "./check-devcontainer.mjs";

const current = readFileSync(resolve(".devcontainer/devcontainer.json"), "utf8");

test("current devcontainer follows the CleanMyMap Next.js contract", () => {
  assert.deepEqual(auditDevcontainer(current, "24"), []);
});

test("devcontainer guard rejects the obsolete Streamlit contract", () => {
  const issues = auditDevcontainer(JSON.stringify({
    image: "mcr.microsoft.com/devcontainers/python:1-3.11-bookworm",
    postAttachCommand: "streamlit run app.py",
    forwardPorts: [8501],
  }), "24");
  assert.ok(issues.length >= 4);
});
