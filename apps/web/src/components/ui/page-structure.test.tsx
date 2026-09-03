import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionCard, SourceBadge, StatCard } from "./page-structure";

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

describe("StatCard", () => {
  it("renders the canonical article card with stable numeric value styling", () => {
    const markup = renderToStaticMarkup(
      <StatCard
        label="Présence"
        value={"70.0%"}
        unit="des inscrits"
        description="RSVP confirmés"
        tone="emerald"
        size="sm"
      />,
    );

    expect(markup).toContain("<article ");
    expect(markup).toContain('class="cmm-card"');
    expect(markup).toContain('data-cmm-card-tone="emerald"');
    expect(markup).toContain('data-cmm-card-size="sm"');
    expect(markup).toContain("tabular-nums");
    expect(markup).toContain("70.0%");
    expect(markup).toContain("RSVP confirmés");
  });
});

describe("ActionCard", () => {
  it("uses canonical sizes for the main action icon and arrow", () => {
    const markup = renderToStaticMarkup(
      <ActionCard
        icon="Activity"
        title="Suivre"
        description="Description"
        badge="Nouveau"
      />,
    );

    expect(markup).toContain('data-cmm-icon-size="lg"');
    expect(markup).toContain('data-cmm-icon-size="sm"');
    expect(markup).toContain("cmm-icon-nudge-x");
  });
});
