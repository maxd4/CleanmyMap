import { describe, expect, it } from "vitest";
import {
  normalizeAnalyticsRoute,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
  sanitizeFunnelMeta,
} from "./sanitize-analytics-payload";

const inviteToken = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde";
const missionId = "550e8400-e29b-41d4-a716-446655440000";

describe("sanitize analytics payload", () => {
  it("normalizes private invitation routes without retaining the token", () => {
    const route = normalizeAnalyticsRoute(
      `/actions/invite/${inviteToken}?token=${inviteToken}#${inviteToken}`,
    );

    expect(route).toEqual({
      path: "/actions/invite",
      routeKind: "actions",
      routeSection: "invite",
      routeDepth: 2,
      routeSegmentCount: 2,
    });
    expect(JSON.stringify(route)).not.toContain(inviteToken);
  });

  it("normalizes mission detail routes and encoded dynamic segments", () => {
    expect(sanitizeAnalyticsPath(`/missions/${encodeURIComponent(missionId)}`)).toBe(
      "/missions",
    );
    expect(sanitizeAnalyticsUrl(
      `https://cleanmymap.fr/missions/${missionId}?id=${missionId}#${missionId}`,
    )).toBe("/missions");

    const meta = sanitizeFunnelMeta({
      pagePath: `/missions/${missionId}`,
      routeKind: "missions",
      routeSection: missionId,
    });

    expect(meta).toEqual({ pagePath: "/missions", routeKind: "missions" });
    expect(JSON.stringify(meta)).not.toContain(missionId);
  });

  it("drops unknown route roots instead of exposing an arbitrary path segment", () => {
    expect(sanitizeAnalyticsPath(`/${inviteToken}`)).toBe("/other");
  });

  it("bounds funnel categories instead of accepting arbitrary values", () => {
    expect(
      sanitizeFunnelMeta({
        source: "action_declaration_form",
        routeKind: "reports",
        routeSection: "private-value",
        declarationMode: "private-value",
        isAuthenticated: true,
      }),
    ).toEqual({
      source: "action_declaration_form",
      routeKind: "reports",
      isAuthenticated: true,
    });
  });

  it("sanitizes navigation URL properties while preserving safe categories", () => {
    const sanitized = sanitizeAnalyticsProperties({
      profile: "benevole",
      ctaType: "primary",
      href: `/actions/invite/${inviteToken}?email=personne@example.com`,
      referrer: `/missions/${missionId}#${missionId}`,
      spaceId: "space-private-id",
    });

    expect(sanitized).toEqual({
      profile: "benevole",
      ctaType: "primary",
      href: "/actions/invite",
      referrer: "/missions",
    });
    expect(JSON.stringify(sanitized)).not.toContain(inviteToken);
    expect(JSON.stringify(sanitized)).not.toContain(missionId);
  });

  it("normalizes PostHog reserved path properties and drops free campaign values", () => {
    const sanitized = sanitizeAnalyticsProperties({
      "$referrer": `https://external.example/actions/invite/${inviteToken}`,
      "$pathname": `/missions/${missionId}`,
      "$prev_pageview_pathname": `/actions/invite/${inviteToken}`,
      "$session_entry_pathname": `/missions/${missionId}`,
      utm_campaign: inviteToken,
      "$utm_source": missionId,
      routeKind: "missions",
    });

    expect(sanitized).toEqual({
      "$referrer": "/actions/invite",
      "$pathname": "/missions",
      "$prev_pageview_pathname": "/actions/invite",
      "$session_entry_pathname": "/missions",
      routeKind: "missions",
    });
    expect(JSON.stringify(sanitized)).not.toContain(inviteToken);
    expect(JSON.stringify(sanitized)).not.toContain(missionId);
    expect(JSON.stringify(sanitized)).not.toContain("external.example");
  });

  it("removes embedded emails from long generic values without regex backtracking", () => {
    const sanitized = sanitizeAnalyticsProperties({
      customValue: `${"x".repeat(200_000)} personne@example.com`,
    });

    expect(sanitized).toEqual({});
  });
});
