import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiEventPathChooser } from "./spogomi-event-path-chooser";

const journey = {
  next: { key: "quiz", title: "Quiz", description: "Quiz", status: "todo", href: "#quiz" },
  steps: [],
  authorizedSpaces: [],
} as const;

describe("SpogomiEventPathChooser", () => {
  it("keeps volunteer actions on the selected mixed division", () => {
    const markup = renderToStaticMarkup(<SpogomiEventPathChooser eventSlug="paris-2026" isAuthenticated selectedDivisionType="world_cup" journey={journey} />);

    expect(markup).toContain("Choisir mon parcours");
    expect(markup).toContain("division World Cup");
    expect(markup).toContain("/spogomi/paris-2026?focus=quiz&amp;division=world_cup#spogomi-sports-registration");
    expect(markup).toContain("/spogomi/paris-2026?focus=registration&amp;division=world_cup#spogomi-sports-registration");
  });

  it("shows real authorization state instead of inventing organizer or referee access", () => {
    const markup = renderToStaticMarkup(<SpogomiEventPathChooser eventSlug="paris-2026" isAuthenticated selectedDivisionType="casual" journey={journey} />);

    expect(markup.match(/Aucune habilitation active pour cette édition/g)).toHaveLength(2);
    expect(markup).not.toContain("/spogomi/paris-2026/espace");
  });

  it("uses the server-provided contextual destinations when capabilities exist", () => {
    const markup = renderToStaticMarkup(<SpogomiEventPathChooser eventSlug="paris-2026" isAuthenticated journey={{ ...journey, authorizedSpaces: [
      { key: "referee", title: "Opérations autorisées", description: "Capacité terrain", href: "/spogomi/paris-2026/espace#operations" },
      { key: "organizer", title: "Cockpit", description: "Gestion", href: "/spogomi/paris-2026/espace#settings" },
    ] }} />);

    expect(markup).toContain("/spogomi/paris-2026/espace#operations");
    expect(markup).toContain("/spogomi/paris-2026/espace#settings");
    expect(markup).toContain("Capacité terrain");
    expect(markup).not.toContain("Aucune habilitation active");
  });
});
