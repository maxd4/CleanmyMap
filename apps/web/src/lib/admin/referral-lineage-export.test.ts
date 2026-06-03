import { describe, expect, it } from "vitest";
import {
  buildReferralLineageCsv,
  buildReferralLineageExportResult,
} from "./referral-lineage-export";

describe("referral lineage export", () => {
  it("builds lineage chains and summary counts", () => {
    const result = buildReferralLineageExportResult([
      {
        id: "root",
        display_name: "Root User",
        referral_code: "ROOT01",
        referred_by_profile_id: null,
        referred_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "child",
        display_name: "Child User",
        referral_code: "CHILD01",
        referred_by_profile_id: "root",
        referred_at: "2026-02-01T00:00:00Z",
        created_at: "2026-02-01T00:00:00Z",
      },
      {
        id: "grandchild",
        display_name: "Grand Child",
        referral_code: null,
        referred_by_profile_id: "child",
        referred_at: "2026-03-01T00:00:00Z",
        created_at: "2026-03-01T00:00:00Z",
      },
    ]);

    expect(result.summary.totalProfiles).toBe(3);
    expect(result.summary.profilesWithReferralCode).toBe(2);
    expect(result.summary.rootProfiles).toBe(1);
    expect(result.summary.directLinks).toBe(2);
    expect(result.summary.maxDepth).toBe(2);

    const child = result.rows.find((row) => row.id === "child");
    expect(child).toMatchObject({
      referred_by_display_name: "Root User",
      referral_depth: 1,
      direct_invitees_count: 1,
      referral_chain_ids: "root > child",
      referral_chain_display_names: "Root User > Child User",
    });

    const grandchild = result.rows.find((row) => row.id === "grandchild");
    expect(grandchild).toMatchObject({
      referred_by_display_name: "Child User",
      referral_depth: 2,
      referral_chain_ids: "root > child > grandchild",
      referral_chain_display_names: "Root User > Child User > Grand Child",
    });
  });

  it("serializes a downloadable CSV", () => {
    const csv = buildReferralLineageCsv([
      {
        id: "root",
        display_name: "Root User",
        referral_code: "ROOT01",
        invite_url: "https://cleanmymap.fr/sign-up?ref=ROOT01",
        referred_by_profile_id: null,
        referred_by_display_name: null,
        referred_at: null,
        created_at: "2026-01-01T00:00:00Z",
        referral_depth: 0,
        direct_invitees_count: 1,
        referral_chain_ids: "root",
        referral_chain_display_names: "Root User",
      },
    ]);

    expect(csv).toContain("invite_url");
    expect(csv).toContain("https://cleanmymap.fr/sign-up?ref=ROOT01");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
