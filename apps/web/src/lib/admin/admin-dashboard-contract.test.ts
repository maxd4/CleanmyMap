import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { AdminOperationalMetricGrid } from "@/components/admin/admin-dashboard-ui";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { PublishedPartnerAnnuaireEntry } from "@/lib/partners/published-annuaire-entries-store";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import type { ModeratableSignalement } from "@/lib/admin/moderation/signalement-moderation";
import {
  buildAdminAlert,
  buildAdminMetricItems,
  buildModerationBlockSummaries,
  type AdminSources,
} from "./admin-dashboard-contract";

function available<T>(data: T): { status: "available"; data: T } {
  return { status: "available", data };
}

function unavailable(): { status: "unavailable" } {
  return { status: "unavailable" };
}

function creatorItem(overrides: Partial<CreatorInboxItem> = {}): CreatorInboxItem {
  return {
    id: "creator-1",
    source: "partner",
    sourceLabel: "Partenariat",
    sourceRecordId: "partner-1",
    title: "Association test",
    subtitle: "association",
    authorName: "Contact test",
    authorEmail: "contact@example.com",
    authorRole: null,
    createdAt: "2026-08-27T08:00:00.000Z",
    pagePath: null,
    status: "pending",
    sourceStatus: "pending_admin_review",
    priority: "high",
    context: "Demande de partenariat",
    details: [],
    canDelete: false,
    canReview: true,
    hasReplyTarget: true,
    ...overrides,
  };
}

function publishedEntry(
  overrides: Partial<PublishedPartnerAnnuaireEntry> = {},
): PublishedPartnerAnnuaireEntry {
  return {
    id: "published-1",
    sourceRequestId: "request-1",
    source: "partner_onboarding",
    publicationStatus: "pending_admin_review",
    publishedAt: "2026-08-27T08:00:00.000Z",
    name: "Partenaire test",
    legalIdentity: "Partenaire test",
    kind: "association",
    types: ["social"],
    scope: "local",
    description: "Partenaire test",
    location: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    coveredArrondissements: [],
    contributionTypes: ["communication"],
    availability: "ponctuelle",
    tags: [],
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
    provenance: "published_partner",
    lastUpdatedAt: "2026-08-27T08:00:00.000Z",
    recentActivityAt: "2026-08-27T08:00:00.000Z",
    ...overrides,
  } as PublishedPartnerAnnuaireEntry;
}

function signalement(): ModeratableSignalement {
  return {
    id: "spot-1",
    created_at: "2026-08-27T08:00:00.000Z",
    created_by_clerk_id: "user-1",
    label: "Spot test",
    latitude: 48.8566,
    longitude: 2.3522,
    status: "new",
    notes: null,
    sourceTable: "trash_spotter_spots",
    spot_type: "spot",
    validated_at: null,
    cleaned_at: null,
  };
}

function auditEntry(outcome: "success" | "error"): AdminOperationAuditEntry {
  return {
    operationId: `operation-${outcome}`,
    at: "2026-08-27T08:00:00.000Z",
    actorUserId: "admin-1",
    operationType: "moderation",
    outcome,
    details: { entityType: "signalement" },
  };
}

function sources(): AdminSources {
  return {
    actions: available({ items: [], count: 0 }),
    groupJoin: available({ count: 0 }),
    signalements: available({ items: [], count: 0 }),
    creatorInbox: available([]),
    publishedEntries: available([]),
    audit: available([]),
  };
}

describe("/admin data availability contract", () => {
  it("does not turn a failed actions read into zero pending actions", () => {
    const current = sources();
    current.actions = unavailable();

    const metric = buildAdminMetricItems(current).find((item) => item.id === "acting");
    const block = buildModerationBlockSummaries(current).find((item) => item.id === "agir");

    expect(metric).toMatchObject({ value: null, availability: "partial" });
    expect(block).toMatchObject({ count: null, availability: "partial" });
  });

  it("does not show an empty signalement or audit state after a failed read", () => {
    const current = sources();
    current.signalements = unavailable();
    current.audit = unavailable();

    const blocks = buildModerationBlockSummaries(current);
    const signalements = blocks.find((item) => item.id === "cartographie-impact");
    const audit = blocks.find((item) => item.id === "accueil-pilotage");

    expect(signalements?.count).toBeNull();
    expect(signalements?.samples.map((sample) => sample.label)).not.toContain(
      "Aucun lieu en attente",
    );
    expect(audit?.count).toBeNull();
    expect(audit?.samples.map((sample) => sample.label)).not.toContain("Aucun incident");
  });

  it("keeps other network files visible when creator inbox is unavailable", () => {
    const current = sources();
    current.creatorInbox = unavailable();
    current.publishedEntries = available([publishedEntry()]);

    const network = buildModerationBlockSummaries(current).find(
      (item) => item.id === "reseau-discussions",
    );

    expect(network).toMatchObject({ count: null, availability: "partial" });
    expect(network?.details).toContain("1 publications partenaires à revoir.");
    expect(network?.samples.map((sample) => sample.label)).toContain("Partenaire test");
  });

  it("renders real zeroes only after every relevant read succeeds", () => {
    const current = sources();
    const metrics = buildAdminMetricItems(current);
    const blocks = buildModerationBlockSummaries(current);

    expect(metrics.map((item) => item.value)).toEqual([0, 0, 0, 0]);
    expect(blocks.find((item) => item.id === "cartographie-impact")?.samples[0]?.label).toBe(
      "Aucun lieu en attente",
    );
    expect(blocks.find((item) => item.id === "accueil-pilotage")?.samples[0]?.label).toBe(
      "Aucun incident",
    );
    expect(buildAdminAlert(current).title).toBe("Aucune urgence de modération détectée");
  });

  it("builds admin metrics only from the real moderation files", () => {
    const current = sources();
    current.actions = available({ items: [], count: 2 });
    current.groupJoin = available({ count: 3 });
    current.signalements = available({ items: [signalement()], count: 4 });
    current.creatorInbox = available([creatorItem()]);
    current.publishedEntries = available([publishedEntry()]);
    current.audit = available([auditEntry("error")]);

    expect(buildAdminMetricItems(current).map((item) => [item.id, item.value])).toEqual([
      ["acting", 5],
      ["signalements", 4],
      ["network", 2],
      ["audit-incidents", 1],
    ]);
    expect(buildAdminAlert(current).title).toContain("incident");
  });

  it("keeps the operational metric surface free of trend and forecast semantics", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminOperationalMetricGrid, { items: buildAdminMetricItems(sources()) }),
    );

    expect(markup).not.toContain("N-1");
    expect(markup).not.toContain("Prévision prochaine");
    expect(markup).not.toContain("En hausse");
    expect(markup).not.toContain("100 -");
  });

  it("preserves the moderation links and removes the fictitious blocks", () => {
    const blocks = buildModerationBlockSummaries(sources());

    expect(blocks.map((item) => item.id)).toEqual([
      "reseau-discussions",
      "cartographie-impact",
      "agir",
      "accueil-pilotage",
    ]);
    expect(blocks.map((item) => item.href)).not.toContain("/learn");
    expect(blocks.find((item) => item.id === "cartographie-impact")?.href).toBe(
      "/admin?moderation=signalements#workflow-administration",
    );
    expect(blocks.find((item) => item.id === "agir")?.href).toBe("/actions/history");
    expect(blocks.find((item) => item.id === "accueil-pilotage")).toMatchObject({
      href: "#workflow-administration",
      ctaLabel: "Voir le journal",
    });
  });

  it("guards the /admin surface against removed artificial copy", () => {
    const source = readFileSync(
      new URL("../../app/(app)/admin/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("loadPilotageOverview");
    expect(source).not.toContain("Prévision prochaine");
    expect(source).not.toContain("100 - (publicationStatus.pending");
    expect(source).not.toContain("Apprendre");
    expect(source).not.toContain('href=\"/learn\"');
    expect(source).not.toContain("Classement global");
  });
});
