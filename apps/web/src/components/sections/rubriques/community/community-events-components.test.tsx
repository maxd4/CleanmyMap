import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-errors";
import type { CommunityEventItem } from "@/lib/community/http";
import { EventArticlePast, EventArticleUpcoming, EventListStates } from "./community-events-components";
import { JoinCommunityEventsPanel } from "../rejoindre-une-action.community-events";

function makeEvent(canEditOwnOps: boolean): CommunityEventItem {
  return {
    id: "event-1",
    createdAt: "2026-09-10T08:00:00.000Z",
    organizerClerkId: null,
    canEditOwnOps,
    title: "Collecte publique",
    eventDate: "2026-09-10",
    locationLabel: "Paris",
    location: { label: "Paris", latitude: null, longitude: null, source: null },
    description: null,
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
    rsvpCounts: { yes: 0, maybe: 0, no: 0, total: 0 },
    myRsvpStatus: null,
  };
}

const opsDraft = { attendanceCount: "", postMortem: "" };

describe("community event ownership rendering", () => {
  it("renders the organizer follow-up from canEditOwnOps", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EventArticlePast, {
        event: makeEvent(true),
        isUpdating: false,
        getOpsDraft: () => opsDraft,
        updateOpsDraft: () => undefined,
        onSaveEventOps: async () => undefined,
      }),
    );

    expect(markup).toContain("Suivi de ma mission");
  });

  it("does not expose the organizer follow-up to a non-owner", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EventArticlePast, {
        event: makeEvent(false),
        isUpdating: false,
        getOpsDraft: () => opsDraft,
        updateOpsDraft: () => undefined,
        onSaveEventOps: async () => undefined,
      }),
    );

    expect(markup).not.toContain("Suivi de ma mission");
    expect(markup).not.toContain("Enregistrer le suivi");
  });

  it("keeps the public error message independent of authentication", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EventListStates, {
        eventsLoading: false,
        eventsLoadError: new AppError({
          kind: "permission",
          message: "Unauthorized",
          status: 401,
        }),
      }),
    );

    expect(markup).toContain("Les missions ne sont pas disponibles pour le moment.");
    expect(markup).not.toContain("nécessite une connexion");
  });

  it("exposes a real join-page link and preserves the personal RSVP label", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EventArticleUpcoming, {
        event: { ...makeEvent(false), eventDate: "2099-09-10", myRsvpStatus: "maybe" },
        locale: "fr",
        onRsvp: async () => undefined,
        rsvpLoading: false,
        onShare: () => undefined,
      }),
    );

    expect(markup).toContain('href="/sections/rejoindre-une-action?tab=future&amp;communityEventId=event-1"');
    expect(markup).toContain("Voir l&#x27;événement");
    expect(markup).toContain("Peut-être");
  });

  it("exposes one keyboard-operable continuation action and keeps it busy while loading", () => {
    const markup = renderToStaticMarkup(
      React.createElement(JoinCommunityEventsPanel, {
        fr: true,
        events: [],
        loading: false,
        error: null,
        focusedEventId: null,
        hasMore: true,
        loadingMore: true,
        onLoadMore: async () => undefined,
        tab: "future",
      }),
    );

    expect(markup).not.toContain("Afficher plus d’événements");
    expect(markup).toContain("Chargement…");
    expect(markup).toContain('data-cmm-button-loading="true"');
    expect(markup).toContain('disabled=""');
  });
});
