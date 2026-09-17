import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const communityRoot = dirname(new URL(import.meta.url).pathname).replace(/^\//, "");
const sectionSource = readFileSync(join(communityRoot, "community-section.tsx"), "utf8");
const viewSource = readFileSync(join(communityRoot, "community-section-components.tsx"), "utf8");
const sectionHookSource = readFileSync(join(communityRoot, "use-community-section.ts"), "utf8");
const eventsHookSource = readFileSync(join(communityRoot, "use-community-events.ts"), "utf8");

describe("CommunitySection scope", () => {
  it("keeps only mission participation and the preserved partners surface", () => {
    for (const source of [sectionSource, viewSource]) {
      expect(source).not.toMatch(
        /CommunityHubNav|CommunityAgirView|CommunitySolutionsView|ActionsHistoryList|CommunityConversionKpiGrid|CommunityHighlightsCard|CommunityStaffingCard|CommunityPostEventLoopCard|CommunityRemindersCard|CommunityFunnelExportCard|OrganizerKitCard|CampaignsSection|MissionZeroSection|FAQSection|LegalSection|NewsletterSignup|DeferredChatShell|CleanupGuideCard|ExternalHubSection/,
      );
    }

    expect(viewSource).toContain("CommunityEventsTabsCard");
    expect(viewSource).toContain("CommunityCreateEventCard");
    expect(sectionSource).toContain("PartnersNetworkSection");
    expect(sectionHookSource).not.toContain("useCommunityHighlights");
    expect(eventsHookSource).not.toContain("fetchActions");
    expect(eventsHookSource).not.toContain("computeEventConversions");
  });

  it("does not retain the unsourced operational promise removed from the journey", () => {
    const createEventSource = readFileSync(join(communityRoot, "create-event-card.tsx"), "utf8");

    expect(createEventSource).not.toMatch(/validé par l.?IA CleanMyMap|Cleanwalk\.org/);
  });
});
