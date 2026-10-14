import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./route-markdown";

describe("documentation markdown links", () => {
  it("keeps valid links and titles equivalent to the supported markdown contract", () => {
    expect(renderMarkdown("[CleanMyMap](https://cleanmymap.fr)")).toContain(
      '<a href="https://cleanmymap.fr" target="_blank" rel="noopener noreferrer">CleanMyMap</a>',
    );
  });

  it("handles a long malformed label without pathological backtracking", () => {
    const input = `[${"x".repeat(200_000)}`;
    const output = renderMarkdown(input);
    expect(output).toContain("x".repeat(200_000));
  });
});
