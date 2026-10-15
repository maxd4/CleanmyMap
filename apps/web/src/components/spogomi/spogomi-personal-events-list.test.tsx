import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiPersonalEventsList } from "./spogomi-personal-events-list";
import type { SpogomiPersonalEvent } from "@/lib/spogomi/personal-events-service";

function event(id: string, relations: SpogomiPersonalEvent["relations"]): SpogomiPersonalEvent {
  return {
    id,
    name: `Édition ${id}`,
    eventSlug: `${id}-slug`,
    mode: "casual",
    state: "draft",
    startsAt: "2026-06-02T10:00:00.000Z",
    endsAt: "2026-06-02T12:00:00.000Z",
    publicVisibility: "private",
    publicResultsVisibility: "hidden",
    relations,
    accesses: relations.includes("organizer")
      ? ["manage"]
      : relations.includes("observer")
        ? ["observe"]
        : ["participate"],
    links: { public: null, space: relations.some((relation) => ["organizer", "referee", "observer"].includes(relation)) ? `/spogomi/${id}-slug/espace` : null },
  };
}

describe("SpogomiPersonalEventsList", () => {
  it("shows only filters backed by relations and exposes the creation path", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("organizer", ["organizer"]), event("observer", ["observer"])]} />);
    expect(markup).toContain("Tous");
    expect(markup).toContain("J’organise");
    expect(markup).toContain("J’observe");
    expect(markup).not.toContain("J’arbitre");
    expect(markup).not.toContain("Je participe");
    expect(markup).toContain('href="/spogomi/nouveau"');
  });

  it("links an operational reviewer to the capability-scoped space", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("observer", ["observer"])]} />);
    expect(markup).toContain('/spogomi/observer-slug/espace');
  });

  it("does not invent a private participant route", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} />);
    expect(markup).not.toContain("/spogomi/participant-slug/espace");
    expect(markup).toContain("Les contrôles serveur conservent cet accès");
    expect(markup).toContain("Parcours personnel");
  });
});
