import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { SpogomiPersonalEventsList } from "./spogomi-personal-events-list";
import type { SpogomiPersonalEvent } from "@/lib/spogomi/personal-events-service";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function event(id: string, relations: SpogomiPersonalEvent["relations"]): SpogomiPersonalEvent {
  return {
    id,
    name: `Édition ${id}`,
    eventSlug: `${id}-slug`,
    mode: "casual",
    state: "draft",
    startsAt: "2026-06-02T10:00:00.000Z",
    endsAt: "2026-06-02T12:00:00.000Z",
    officialTimezone: "Europe/Paris",
    publicVisibility: "private",
    publicResultsVisibility: "hidden",
    relations,
    accesses: relations.includes("organizer")
      ? ["manage"]
      : relations.includes("checkin")
        ? ["checkin"]
      : relations.includes("observer")
        ? ["observe"]
        : ["participate"],
    links: { public: null, space: relations.some((relation) => ["organizer", "referee", "observer", "checkin"].includes(relation)) ? `/spogomi/${id}-slug/espace` : null },
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

  it("labels and filters check-in events without changing their server-scoped link", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiPersonalEventsList events={[event("checkin", ["checkin"]), event("participant", ["participant"])]} />);
    });

    expect(renderer.root.findAll((node) => node.type === "button").map((node) => node.props.children)).toContain("J’accueille");
    expect(renderer.root.findAll((node) => node.type === "a" && node.props.href === "/spogomi/checkin-slug/espace")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.type === "span").some((node) => {
      const children = node.props.children;
      return (Array.isArray(children) ? children.filter((child): child is string => typeof child === "string").join("") : children) === "Accueil et présences";
    })).toBe(true);

    const checkinFilter = renderer.root.findAll((node) => node.type === "button" && node.props.children === "J’accueille")[0];
    act(() => {
      checkinFilter?.props.onClick();
    });

    expect(renderer.root.findAll((node) => node.type === "article" && node.props["data-testid"] === "spogomi-personal-event-checkin")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.type === "article" && node.props["data-testid"] === "spogomi-personal-event-participant")).toHaveLength(0);
  });

  it("does not invent a private participant route", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} />);
    expect(markup).not.toContain("/spogomi/participant-slug/espace");
    expect(markup).toContain("Les contrôles serveur conservent cet accès");
    expect(markup).toContain("Parcours personnel");
  });
});
