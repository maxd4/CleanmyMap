import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync(new URL("./legal-content-report-form.tsx", import.meta.url), "utf8");

describe("legal content report form anti-spam contract", () => {
  it("sends the form start time instead of the click time", () => {
    expect(form).toContain('import { useEffect, useState } from "react";');
    expect(form).toMatch(/useEffect\(\(\) => \{\s*setFormStartedAt\(Date\.now\(\)\);\s*\}, \[\]\);/);
    expect(form).toContain("submittedAt: formStartedAt ?? Date.now(),");
    expect(form).not.toContain("submittedAt: Date.now(),");
    expect(form).toContain("response.json().catch(() => null)");
    expect(form).toContain("body?.error ?? \"Impossible d'envoyer la notification.\"");
    expect(form).toContain("!body?.trackingId");
  });

  it("starts a fresh anti-spam window when another notification is displayed", () => {
    expect(form).toMatch(/setState\("idle"\);\s*setFormStartedAt\(Date\.now\(\)\);/);
  });
});
