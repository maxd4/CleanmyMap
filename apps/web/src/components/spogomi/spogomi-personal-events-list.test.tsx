import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpogomiPersonalEventsList } from "./spogomi-personal-events-list";
import type { SpogomiPersonalEvent, SpogomiPersonalEventChange } from "@/lib/spogomi/personal-events-service";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

afterEach(() => {
  vi.unstubAllGlobals();
});

function event(id: string, relations: SpogomiPersonalEvent["relations"], name = `Édition ${id}`): SpogomiPersonalEvent {
  return {
    id,
    name,
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
      : relations.includes("field_operator")
        ? ["operate"]
        : ["participate"],
    links: { public: null, space: relations.some((relation) => ["organizer", "referee", "observer", "checkin", "field_operator"].includes(relation)) ? `/spogomi/${id}-slug/espace` : null },
  };
}

function change(eventId: string, acknowledgedAt: string | null = null): SpogomiPersonalEventChange {
  return {
    id: `change-${eventId}`,
    eventId,
    revision: 2,
    changedFields: ["schedule", "location"],
    requiresConfirmation: true,
    createdAt: "2026-06-01T12:00:00.000Z",
    acknowledgedAt,
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

  it("explains the invitation required for a private participant without opening management", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} />);
    expect(markup).not.toContain("/spogomi/participant-slug/espace");
    expect(markup).toContain("Cette édition privée n’a pas de fiche publique");
    expect(markup).toContain("lien privé contextualisé remis par l’organisateur");
    expect(markup).toContain("Parcours personnel");
  });

  it("keeps a participant and organizer in the volunteer journey instead of opening the cockpit", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("both", ["organizer", "participant"])]} journey="volunteers" />);
    expect(markup).not.toContain("/spogomi/both-slug/espace");
    expect(markup).toContain("Cette édition privée n’a pas de fiche publique");
    expect(markup).not.toContain("Créer une compétition");
  });

  it("shows an active admission requester in the volunteer journey without granting an event space", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("applicant", ["applicant"])]} journey="volunteers" />);
    expect(markup).toContain("Édition applicant");
    expect(markup).toContain("Demandeur actif");
    expect(markup).not.toContain("/spogomi/applicant-slug/espace");
    expect(markup).not.toContain("Créer une compétition");
  });

  it("filters the selected journey and opens its validated cockpit focus", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPersonalEventsList
        events={[event("organizer", ["organizer"]), event("referee", ["referee"]), event("participant", ["participant"])]}
        journey="referees"
        focus="arbitration"
      />,
    );
    expect(markup).toContain("Mes événements habilités");
    expect(markup).toContain("Édition referee");
    expect(markup).not.toContain("Édition organizer");
    expect(markup).not.toContain("Édition participant");
    expect(markup).toContain('/spogomi/referee-slug/espace#arbitration');
  });

  it("keeps field-operation assignments visible in the referee journey", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPersonalEventsList events={[event("weigher", ["field_operator"])]} journey="referees" focus="operations" />,
    );
    expect(markup).toContain("Opérations terrain");
    expect(markup).toContain('/spogomi/weigher-slug/espace#operations');
  });

  it("finds the marked Cachan validation edition and opens the existing organizer cockpit", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPersonalEventsList
        events={[event("cachan", ["organizer"], "SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL")]}
        journey="organizers"
        focus="teams"
      />,
    );
    expect(markup).toContain("Démonstration fictive, données synthétiques, règlement non officiel");
    expect(markup).toContain("Ouvrir le cockpit de validation");
    expect(markup).toContain('/spogomi/cachan-slug/espace#teams');
    expect(markup).toContain("Les événements ci-dessous proviennent de vos relations organisateur vérifiées.");
    expect(markup).toContain("lg:grid-cols-2");
  });

  it("shows only the public change receipt projection and allows an authenticated confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} changes={[change("participant")]} />);
    });

    expect(renderer.root.findByProps({ "data-testid": "spogomi-event-changes-participant" })).toBeTruthy();
    expect(renderer.root.findAll((node) => node.type === "span").some((node) => node.props.children === "Confirmation requise")).toBe(true);
    expect(renderer.root.findAll((node) => node.type === "p").some((node) => String(node.props.children).includes("Horaires, Lieu"))).toBe(true);
    expect(renderer.root.findAll((node) => node.props.children === "previous_snapshot")).toHaveLength(0);

    const acknowledgeButton = renderer.root.findAll((node) => node.type === "button" && node.props.children === "Confirmer ce changement")[0];
    await act(async () => {
      await acknowledgeButton?.props.onClick();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/spogomi/events/participant/changes/change-participant/acknowledge",
      { method: "POST", headers: { Accept: "application/json" } },
    );
    expect(renderer.root.findAll((node) => node.type === "span" && node.props.children === "Confirmation enregistrée")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.type === "span" && String(node.props.children).startsWith("Accusé le "))).toHaveLength(0);
  });

  it("shows the server acknowledgement time and never derives one from the change time", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} changes={[change("participant", "2026-06-01T12:05:00.000Z")]} />);
    expect(markup).toContain("Accusé le 1 juin 2026, 14:05");
    expect(markup).not.toContain("Accusé le 1 juin 2026, 14:00");
    expect(markup).not.toContain("Confirmation requise");
    expect(markup).not.toContain("Confirmer ce changement");
  });

  it("keeps the confirmation available after an HTTP failure for a retry", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiPersonalEventsList events={[event("participant", ["participant"])]} changes={[change("participant")]} />);
    });
    const button = () => renderer.root.findAll((node) => node.type === "button" && node.props.children === "Confirmer ce changement")[0];
    await act(async () => { await button()?.props.onClick(); });
    expect(renderer.root.findAll((node) => node.type === "button" && node.props.children === "Confirmer ce changement")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.props.role === "alert")).toHaveLength(1);
  });
});
