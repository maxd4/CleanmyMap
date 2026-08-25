import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("action creation entry point", () => {
  it("does not expose the former clean-place mode", () => {
    expect(source).not.toContain('params?.["mode"]');
    expect(source).not.toContain("mode=propre");
    expect(source).not.toContain('initialRecordType={initialRecordType}');
  });
});
