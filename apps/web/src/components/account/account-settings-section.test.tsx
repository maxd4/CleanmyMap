import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./account-settings-section.tsx", import.meta.url), "utf8");

describe("account settings surface contract", () => {
  it("keeps the compact entry point on the canonical settings route", () => {
    expect(source).toContain("compact = false");
    expect(source).toContain('href=\"/reglages\"');
    expect(source).toContain("Ouvrir les réglages");
  });

  it("keeps privacy and account deletion on the full settings surface", () => {
    expect(source).toContain("Confidentialité");
    expect(source).toContain("Demander la suppression de mon compte");
    expect(source).toContain('href=\"/contact\"');
  });
});
