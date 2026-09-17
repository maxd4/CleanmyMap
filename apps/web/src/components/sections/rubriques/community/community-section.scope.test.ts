import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const communityRoot = dirname(new URL(import.meta.url).pathname).replace(/^\//, "");
const sectionSource = readFileSync(join(communityRoot, "community-section.tsx"), "utf8");
const viewSource = readFileSync(join(communityRoot, "community-section-components.tsx"), "utf8");
const sectionHookSource = readFileSync(join(communityRoot, "use-community-section.ts"), "utf8");
const eventsHookSource = readFileSync(join(communityRoot, "use-community-events.ts"), "utf8");
const eventsComponentSource = readFileSync(join(communityRoot, "community-events-components.tsx"), "utf8");
const actionsHookSource = readFileSync(join(communityRoot, "use-community-actions.ts"), "utf8");
const legalSource = readFileSync(join(communityRoot, "../legal-section.tsx"), "utf8");
const learnInsightsSource = readFileSync(
  join(communityRoot, "../../../learn/learn-gestes-propres-insights-section.tsx"),
  "utf8",
);

describe("CommunitySection scope", () => {
  it("keeps only mission participation and the preserved partners surface", () => {
    for (const source of [sectionSource, viewSource]) {
      expect(source).not.toMatch(
        /CommunityHubNav|CommunityAgirView|CommunitySolutionsView|ActionsHistoryList|CommunityConversionKpiGrid|CommunityHighlightsCard|CommunityStaffingCard|CommunityPostEventLoopCard|CommunityRemindersCard|CommunityFunnelExportCard|OrganizerKitCard|CampaignsSection|MissionZeroSection|FAQSection|LegalSection|NewsletterSignup|DeferredChatShell|CleanupGuideCard|ExternalHubSection/,
      );
    }

    expect(viewSource).toContain("CommunityEventsTabsCard");
    expect(viewSource).toContain("CommunityCreateEventCard");
    expect(viewSource).toContain("/actions/history");
    expect(viewSource).toContain("/reports");
    expect(sectionSource).toContain("PartnersNetworkSection");
    expect(sectionHookSource).not.toContain("useCommunityHighlights");
    expect(eventsHookSource).not.toContain("fetchActions");
    expect(eventsHookSource).not.toContain("computeEventConversions");
    expect(eventsComponentSource).toContain("event.organizerClerkId === userId");
    expect(eventsComponentSource).toContain("Suivi de ma mission");
    expect(actionsHookSource).toContain("updateCommunityEventOps");
  });

  it("does not retain the unsourced operational promise removed from the journey", () => {
    const createEventSource = readFileSync(join(communityRoot, "create-event-card.tsx"), "utf8");

    expect(createEventSource).not.toMatch(/validé par l.?IA CleanMyMap|Cleanwalk\.org/);
  });

  it("keeps former solution surfaces out of Community and points to canonical owners", () => {
    expect(sectionSource).not.toContain("CommunitySolutionsView");
    expect(legalSource).toContain('href: "/mentions-legales"');
    expect(legalSource).toContain('href: "/conditions-generales-utilisation"');
    expect(legalSource).toContain('href: "/politique-confidentialite"');
    expect(legalSource).toContain('href: "/politique-cookies"');
    expect(learnInsightsSource).toContain("LearnGestesPropresCampaignSection");

    for (const legacyFile of [
      "campaigns-section.tsx",
      "cleanup-guide-card.tsx",
      "external-hub-section.tsx",
      "highlights-card.tsx",
      "organizer-kit-card.tsx",
      "use-community-highlights.ts",
    ]) {
      expect(existsSync(join(communityRoot, legacyFile))).toBe(false);
    }
  });
});
