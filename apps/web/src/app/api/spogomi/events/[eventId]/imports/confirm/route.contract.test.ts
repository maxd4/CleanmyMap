import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("SPOGOMI roster confirmation API STATIC_CONTRACT", () => {
  it("re-reads the original private file and accepts only a server-validated mapping", () => {
    expect(route).toContain("request.formData()");
    expect(route).toContain('form.get("file")');
    expect(route).toContain('form.get("mapping")');
    expect(route).toContain("parseSpogomiImportMapping");
    expect(route).toContain("const mapping = mappingResult.mapping");
    expect(route).toContain("mapping,");
    expect(route).not.toContain("request.json()");
    expect(route).not.toContain("rows");
    expect(route).not.toContain("contentHash");
    expect(route).not.toContain("sourceFingerprint");
    expect(route).not.toContain("as never");
  });
});
