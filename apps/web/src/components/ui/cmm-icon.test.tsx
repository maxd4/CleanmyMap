import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Gauge } from "lucide-react";
import { CmmIcon } from "./cmm-icon";

describe("CmmIcon", () => {
  it("renders a decorative Lucide icon by default", () => {
    const markup = renderToStaticMarkup(<CmmIcon icon={Gauge} />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain("aria-label=");
  });

  it("renders an informative icon with an accessible label", () => {
    const markup = renderToStaticMarkup(<CmmIcon icon={Gauge} label="Limite" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Limite"');
    expect(markup).toContain('focusable="false"');
    expect(markup).not.toContain('aria-hidden="true"');
  });

  it("uses md as the default canonical size", () => {
    const markup = renderToStaticMarkup(<CmmIcon icon={Gauge} />);

    expect(markup).toContain('data-cmm-icon-size="md"');
    expect(markup).toContain("h-5 w-5");
    expect(markup).toContain("shrink-0");
  });

  it.each([
    ["xs", "h-3.5 w-3.5"],
    ["sm", "h-4 w-4"],
    ["md", "h-5 w-5"],
    ["lg", "h-6 w-6"],
    ["xl", "h-7 w-7"],
  ] as const)("supports the canonical %s size", (size, classes) => {
    const markup = renderToStaticMarkup(<CmmIcon icon={Gauge} size={size} />);

    expect(markup).toContain(`data-cmm-icon-size="${size}"`);
    expect(markup).toContain(classes);
  });

  it("preserves a consumer className without exposing local icon variants", () => {
    const markup = renderToStaticMarkup(
      <CmmIcon icon={Gauge} className="text-amber-600" />,
    );

    expect(markup).toContain("text-amber-600");
    expect(markup).toContain('data-cmm-icon-size="md"');
  });
});
