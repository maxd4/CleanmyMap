import { buildReferralInviteUrl } from "@/lib/gamification/referrals";
import { escapeCsvCell } from "@/lib/reports/csv";

export type ReferralLineageProfileRow = {
  id: string;
  display_name: string | null;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  referred_at: string | null;
  created_at: string | null;
};

export type ReferralLineageExportRow = {
  id: string;
  display_name: string;
  referral_code: string | null;
  invite_url: string | null;
  referred_by_profile_id: string | null;
  referred_by_display_name: string | null;
  referred_at: string | null;
  created_at: string | null;
  referral_depth: number;
  direct_invitees_count: number;
  referral_chain_ids: string;
  referral_chain_display_names: string;
};

export type ReferralLineageExportSummary = {
  totalProfiles: number;
  profilesWithReferralCode: number;
  rootProfiles: number;
  directLinks: number;
  maxDepth: number;
};

export type ReferralLineageExportResult = {
  rows: ReferralLineageExportRow[];
  summary: ReferralLineageExportSummary;
};

function normalizeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function buildProfileChain(
  profile: ReferralLineageProfileRow,
  profilesById: Map<string, ReferralLineageProfileRow>,
): ReferralLineageProfileRow[] {
  const chain: ReferralLineageProfileRow[] = [];
  const visited = new Set<string>();
  let current: ReferralLineageProfileRow | null = profile;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);

    const parentId: string = current.referred_by_profile_id?.trim() ?? "";
    if (!parentId) {
      break;
    }

    current = profilesById.get(parentId) ?? null;
  }

  return chain.reverse();
}

export function buildReferralLineageExportResult(
  profiles: ReferralLineageProfileRow[],
): ReferralLineageExportResult {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const directInviteeCounts = new Map<string, number>();

  for (const profile of profiles) {
    const parentId = profile.referred_by_profile_id?.trim() ?? "";
    if (!parentId) {
      continue;
    }

    directInviteeCounts.set(
      parentId,
      (directInviteeCounts.get(parentId) ?? 0) + 1,
    );
  }

  const rows = profiles.map<ReferralLineageExportRow>((profile) => {
    const chain = buildProfileChain(profile, profilesById);
    const referralChainIds = chain.map((entry) => entry.id).join(" > ");
    const referralChainDisplayNames = chain
      .map((entry) => normalizeDisplayName(entry.display_name, entry.id))
      .join(" > ");
    const referredByProfile = profile.referred_by_profile_id
      ? profilesById.get(profile.referred_by_profile_id)
      : null;
    const referralCode = profile.referral_code?.trim() ?? "";

    return {
      id: profile.id,
      display_name: normalizeDisplayName(profile.display_name, profile.id),
      referral_code: referralCode || null,
      invite_url: referralCode ? buildReferralInviteUrl(referralCode) : null,
      referred_by_profile_id: profile.referred_by_profile_id,
      referred_by_display_name: referredByProfile
        ? normalizeDisplayName(referredByProfile.display_name, referredByProfile.id)
        : null,
      referred_at: profile.referred_at,
      created_at: profile.created_at,
      referral_depth: Math.max(0, chain.length - 1),
      direct_invitees_count: directInviteeCounts.get(profile.id) ?? 0,
      referral_chain_ids: referralChainIds,
      referral_chain_display_names: referralChainDisplayNames,
    };
  });

  const summary: ReferralLineageExportSummary = {
    totalProfiles: rows.length,
    profilesWithReferralCode: rows.filter((row) => Boolean(row.referral_code)).length,
    rootProfiles: rows.filter((row) => !row.referred_by_profile_id).length,
    directLinks: rows.filter((row) => Boolean(row.referred_by_profile_id)).length,
    maxDepth: rows.reduce((max, row) => Math.max(max, row.referral_depth), 0),
  };

  return { rows, summary };
}

export function buildReferralLineageCsv(rows: ReferralLineageExportRow[]): string {
  const header = [
    "id",
    "display_name",
    "referral_code",
    "invite_url",
    "referred_by_profile_id",
    "referred_by_display_name",
    "referred_at",
    "created_at",
    "referral_depth",
    "direct_invitees_count",
    "referral_chain_ids",
    "referral_chain_display_names",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.display_name,
        row.referral_code,
        row.invite_url,
        row.referred_by_profile_id,
        row.referred_by_display_name,
        row.referred_at,
        row.created_at,
        row.referral_depth,
        row.direct_invitees_count,
        row.referral_chain_ids,
        row.referral_chain_display_names,
      ]
        .map((value) => escapeCsvCell(value))
        .join(","),
    );
  }

  return lines.join("\n");
}
