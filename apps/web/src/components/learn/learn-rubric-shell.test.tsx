import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" as const }),
}));

vi.mock("@/lib/ui/page-families", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ui/page-families")>();
  return {
    ...actual,
    usePageFamily: () => ({
      id: "learn",
      hero: {
        titleColor: "text-slate-950",
        subtitleColor: "text-slate-700",
      },
    }),
    getPageFamilyConfig: () => ({
      labelFr: "Apprendre",
      labelEn: "Learn",
      bgToken: "bg-amber-50/70",
      accentToken: "text-amber-700",
      badgeClass: "bg-amber-100 text-amber-800",
    }),
  };
});

import { LearnRubricShell } from "./learn-rubric-shell";

describe("LearnRubricShell", () => {
  it("renders a full-width centered PageHeader before secondary panels with navigation actions below the subtitle", () => {
    const markup = renderToStaticMarkup(
      <LearnRubricShell
        title={{ fr: "S'entraîner", en: "Practice" }}
        subtitle={{ fr: "Sous-titre test", en: "Test subtitle" }}
        description={{ fr: "Description test", en: "Test description" }}
        backHref="/explorer"
        backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
        accent="yellow"
        highlights={[{ fr: "Rappel actif", en: "Active recall" }]}
        cta={{ href: "/learn/quiz", label: { fr: "Démarrer", en: "Start" } }}
      >
        <div>Contenu</div>
      </LearnRubricShell>,
    );

    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain("cmm-page-header-title");
    expect(markup).toContain("cmm-page-header-action");
    expect(markup).not.toContain("lg:grid-cols-[1.05fr_0.95fr]");

    const headerIndex = markup.indexOf("cmm-page-header");
    const subtitleIndex = markup.indexOf("Sous-titre test");
    const actionsIndex = markup.indexOf("cmm-page-header-action");
    const visualPanelIndex = markup.indexOf("Rappel actif");

    expect(headerIndex).toBeGreaterThan(-1);
    expect(subtitleIndex).toBeGreaterThan(headerIndex);
    expect(actionsIndex).toBeGreaterThan(subtitleIndex);
    expect(visualPanelIndex).toBeGreaterThan(actionsIndex);
  });
});
