import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./accueil-map-preview.tsx", import.meta.url), "utf8");

describe("homepage map preview", () => {
  it("fades only the outer 3.5 percent while keeping the center unmasked", () => {
    expect(source).toContain("#000 3.5%, #000 96.5%");
    expect(source).not.toContain("#000 8%");
    expect(source).not.toContain("#000 12%");
    expect(source).not.toContain("rgba(10,147,107");
  });
});
