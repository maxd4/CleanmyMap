import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmCountBadge } from "./cmm-count-badge";

const indicatorsCss = readFileSync(
  new URL("../../styles/indicators.css", import.meta.url),
  "utf8",
);

describe("CmmCountBadge", () => {
  it("omits non-positive counters and renders positive values exactly", () => {
    expect(renderToStaticMarkup(<CmmCountBadge count={0} />)).toBe("");
    expect(renderToStaticMarkup(<CmmCountBadge count={-1} />)).toBe("");
    expect(renderToStaticMarkup(<CmmCountBadge count={1} />)).toContain(">1</span>");
    expect(renderToStaticMarkup(<CmmCountBadge count={99} />)).toContain(">99</span>");
    expect(renderToStaticMarkup(<CmmCountBadge count={100} />)).toContain(">99+</span>");
  });

  it("supports a configurable maximum", () => {
    const markup = renderToStaticMarkup(<CmmCountBadge count={8} max={5} tone="indigo" />);

    expect(markup).toContain(">5+</span>");
    expect(markup).toContain('data-badge-tone="indigo"');
  });

  it("exposes an optional label and stays decorative by default", () => {
    const labeled = renderToStaticMarkup(
      <CmmCountBadge count={3} accessibleLabel="3 messages non lus" />,
    );
    const decorative = renderToStaticMarkup(<CmmCountBadge count={3} />);

    expect(labeled).toContain('aria-label="3 messages non lus"');
    expect(labeled).not.toContain("aria-hidden");
    expect(labeled).not.toContain('role="status"');
    expect(labeled).not.toContain("aria-live");
    expect(decorative).toContain('aria-hidden="true"');
  });

  it("uses the existing indicator palette and compact caption styling", () => {
    const markup = renderToStaticMarkup(<CmmCountBadge count={2} tone="rose" />);

    expect(markup).toContain("cmm-badge cmm-count-badge");
    expect(markup).toContain('data-badge-size="sm"');
    expect(markup).toContain('data-badge-shape="pill"');
    expect(indicatorsCss).toContain(".cmm-count-badge");
    expect(indicatorsCss).toContain("font-weight: var(--weight-bold)");
    expect(indicatorsCss).not.toContain(".cmm-count-badge {\n    animation");
  });
});
