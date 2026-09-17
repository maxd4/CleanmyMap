import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardEntrance } from "./dashboard-entrance";
import { DashboardTodayPanel } from "./dashboard-today-panel";

vi.mock("@/lib/animations/use-gsap-reveal", () => ({
  useGsapReveal: vi.fn(),
}));

const readyState = {
  kind: "ready" as const,
  syncedAtLabel: "17 septembre 2026",
  latestActivity: {
    label: "Dernière activité",
    title: "Bénévole",
    detail: "Dépollution · Paris",
    meta: "17 septembre 2026",
  },
  validation: {
    label: "Éléments à traiter",
    title: "Aucun élément en attente",
    detail: "12 validées",
    meta: "Fiabilité élevée",
  },
  nextAction: {
    label: "Prochaine action",
    title: "Créer une action",
    detail: "Ouvrir le formulaire",
    meta: "Ouvrir maintenant",
    href: "/actions/new",
  },
};

describe("Dashboard reveal render contract", () => {
  it("renders DashboardEntrance content visible in SSR markup", () => {
    const markup = renderToStaticMarkup(
      <DashboardEntrance>
        <div data-gsap-reveal>Dashboard content</div>
      </DashboardEntrance>,
    );

    expect(markup).toContain('data-gsap-reveal="true"');
    expect(markup).not.toMatch(/style="[^\"]*opacity:\s*0/);
  });

  it("renders DashboardTodayPanel reveal blocks without an inline hidden state", () => {
    const markup = renderToStaticMarkup(<DashboardTodayPanel state={readyState} />);

    expect(markup.match(/data-gsap-reveal/g)?.length).toBeGreaterThanOrEqual(2);
    expect(markup).not.toMatch(/style="[^\"]*opacity:\s*0/);
  });

  it("keeps the shared CSS contract fail-open for Dashboard consumers", () => {
    const baseCss = readFileSync(
      new URL("../../styles/base.css", import.meta.url),
      "utf8",
    );

    expect(baseCss).not.toMatch(
      /\[data-gsap-reveal\][^{]*\{[\s\S]*?(?:opacity\s*:\s*0|visibility\s*:\s*hidden|display\s*:\s*none)/,
    );
  });
});
