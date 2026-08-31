import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourceBadge } from "./page-structure";

describe("SourceBadge", () => {
  it("keeps its public API while delegating to the canonical compact badge", () => {
    const markup = renderToStaticMarkup(
      <SourceBadge tone="rose" className="consumer-class">
        Sans source
      </SourceBadge>,
    );

    expect(markup).toContain('<span class="cmm-badge consumer-class"');
    expect(markup).toContain('data-badge-tone="rose"');
    expect(markup).toContain('data-badge-size="sm"');
    expect(markup).toContain('data-badge-shape="rounded"');
    expect(markup).toContain("Sans source");
    expect(markup).not.toContain('role="status"');
  });
});
