import type { SupabaseClient } from "@supabase/supabase-js";

export type ReferralLineageProfileRow = {
  id: string;
  display_name: string | null;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  referred_at: string | null;
  created_at: string | null;
};

export type ReferralLineageNode = {
  id: string;
  displayName: string;
  referralCode: string | null;
  referredByProfileId: string | null;
  referredByDisplayName: string | null;
  referredAt: string | null;
  createdAt: string | null;
  level: number;
  directInviteesCount: number;
  descendantsCount: number;
  maxDepth: number;
  children: ReferralLineageNode[];
};

export type ReferralLineageView = {
  focus: {
    id: string;
    displayName: string;
    referralCode: string | null;
    referredByProfileId: string | null;
    referredByDisplayName: string | null;
    referredAt: string | null;
    createdAt: string | null;
  };
  ancestorChain: Array<{
    id: string;
    displayName: string;
    referralCode: string | null;
    referredAt: string | null;
    createdAt: string | null;
    level: number;
  }>;
  descendantTree: ReferralLineageNode[];
  directInviteesCount: number;
  descendantsCount: number;
  maxDepth: number;
  totalConnectedCount: number;
  hasReferralCode: boolean;
  hasInvitedBy: boolean;
};

export type ReferralLineageLeaderboardEntry = {
  profile: {
    id: string;
    displayName: string;
    referralCode: string | null;
    referredByProfileId: string | null;
    referredAt: string | null;
    createdAt: string | null;
  };
  descendantsCount: number;
  maxDepth: number;
  directInviteesCount: number;
};

export type ReferralLineageGraph = {
  profilesById: Map<string, ReferralLineageProfileRow>;
  childrenByParentId: Map<string, ReferralLineageProfileRow[]>;
  directInviteeCounts: Map<string, number>;
};

function normalizeDisplayName(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function buildDisplayName(profile: ReferralLineageProfileRow): string {
  return normalizeDisplayName(profile.display_name, profile.id);
}

export function buildReferralLineageGraph(
  profiles: ReferralLineageProfileRow[],
): ReferralLineageGraph {
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  const childrenByParentId = new Map<string, ReferralLineageProfileRow[]>();
  const directInviteeCounts = new Map<string, number>();

  for (const profile of profiles) {
    const parentId = profile.referred_by_profile_id?.trim() ?? "";
    if (!parentId) {
      continue;
    }

    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(profile);
    childrenByParentId.set(parentId, siblings);
    directInviteeCounts.set(
      parentId,
      (directInviteeCounts.get(parentId) ?? 0) + 1,
    );
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((a, b) => {
      const createdDelta =
        new Date(a.created_at ?? a.referred_at ?? 0).getTime() -
        new Date(b.created_at ?? b.referred_at ?? 0).getTime();
      if (createdDelta !== 0) {
        return createdDelta;
      }
      return buildDisplayName(a).localeCompare(buildDisplayName(b), "fr");
    });
  }

  return {
    profilesById,
    childrenByParentId,
    directInviteeCounts,
  };
}

export function buildReferralAncestorChain(
  focusProfileId: string,
  graph: ReferralLineageGraph,
): ReferralLineageView["ancestorChain"] {
  const chain: ReferralLineageProfileRow[] = [];
  const visited = new Set<string>();
  let current = graph.profilesById.get(focusProfileId) ?? null;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);

    const parentId = current.referred_by_profile_id?.trim() ?? "";
    if (!parentId) {
      break;
    }

    current = graph.profilesById.get(parentId) ?? null;
  }

  const ordered = chain.reverse();

  return ordered.map((profile, index) => ({
    id: profile.id,
    displayName: buildDisplayName(profile),
    referralCode: profile.referral_code?.trim() || null,
    referredAt: profile.referred_at,
    createdAt: profile.created_at,
    level: index - (ordered.length - 1),
  }));
}

function computeMetrics(
  profileId: string,
  graph: ReferralLineageGraph,
  memo: Map<string, { descendantsCount: number; maxDepth: number }>,
  path: Set<string>,
): { descendantsCount: number; maxDepth: number } {
  const cached = memo.get(profileId);
  if (cached) {
    return cached;
  }

  if (path.has(profileId)) {
    return { descendantsCount: 0, maxDepth: 0 };
  }

  path.add(profileId);
  const children = graph.childrenByParentId.get(profileId) ?? [];
  let descendantsCount = 0;
  let maxDepth = 0;

  for (const child of children) {
    const childMetrics = computeMetrics(child.id, graph, memo, path);
    descendantsCount += 1 + childMetrics.descendantsCount;
    maxDepth = Math.max(maxDepth, 1 + childMetrics.maxDepth);
  }

  path.delete(profileId);

  const metrics = { descendantsCount, maxDepth };
  memo.set(profileId, metrics);
  return metrics;
}

function buildTreeNode(
  profileId: string,
  graph: ReferralLineageGraph,
  metrics: Map<string, { descendantsCount: number; maxDepth: number }>,
  level: number,
  path: Set<string>,
): ReferralLineageNode | null {
  if (path.has(profileId)) {
    return null;
  }

  const profile = graph.profilesById.get(profileId);
  if (!profile) {
    return null;
  }
  const parentProfile = profile.referred_by_profile_id
    ? (graph.profilesById.get(profile.referred_by_profile_id) ?? null)
    : null;

  path.add(profileId);
  const children = graph.childrenByParentId.get(profileId) ?? [];
  const descendantChildren = children
    .map((child) => buildTreeNode(child.id, graph, metrics, level + 1, path))
    .filter((child): child is ReferralLineageNode => child !== null);
  path.delete(profileId);

  const stats = metrics.get(profileId) ?? { descendantsCount: 0, maxDepth: 0 };

  return {
    id: profile.id,
    displayName: buildDisplayName(profile),
    referralCode: profile.referral_code?.trim() || null,
    referredByProfileId: profile.referred_by_profile_id,
    referredByDisplayName: parentProfile
      ? buildDisplayName(parentProfile)
      : null,
    referredAt: profile.referred_at,
    createdAt: profile.created_at,
    level,
    directInviteesCount: graph.directInviteeCounts.get(profile.id) ?? 0,
    descendantsCount: stats.descendantsCount,
    maxDepth: stats.maxDepth,
    children: descendantChildren,
  };
}

export function buildReferralLineageView(
  focusProfileId: string,
  profiles: ReferralLineageProfileRow[],
): ReferralLineageView | null {
  const graph = buildReferralLineageGraph(profiles);
  const focusProfile = graph.profilesById.get(focusProfileId);

  if (!focusProfile) {
    return null;
  }

  const metrics = new Map<
    string,
    { descendantsCount: number; maxDepth: number }
  >();
  const focusMetrics = computeMetrics(
    focusProfileId,
    graph,
    metrics,
    new Set<string>(),
  );
  const ancestorChain = buildReferralAncestorChain(focusProfileId, graph);
  const descendantChildren = (
    graph.childrenByParentId.get(focusProfileId) ?? []
  )
    .map((child) =>
      buildTreeNode(child.id, graph, metrics, 1, new Set<string>()),
    )
    .filter((child): child is ReferralLineageNode => child !== null);
  const invitedByProfile = focusProfile.referred_by_profile_id
    ? graph.profilesById.get(focusProfile.referred_by_profile_id)
    : null;
  const focusDisplayName = buildDisplayName(focusProfile);

  return {
    focus: {
      id: focusProfile.id,
      displayName: focusDisplayName,
      referralCode: focusProfile.referral_code?.trim() || null,
      referredByProfileId: focusProfile.referred_by_profile_id,
      referredByDisplayName: invitedByProfile
        ? buildDisplayName(invitedByProfile)
        : null,
      referredAt: focusProfile.referred_at,
      createdAt: focusProfile.created_at,
    },
    ancestorChain,
    descendantTree: descendantChildren,
    directInviteesCount: graph.directInviteeCounts.get(focusProfile.id) ?? 0,
    descendantsCount: focusMetrics.descendantsCount,
    maxDepth: focusMetrics.maxDepth,
    totalConnectedCount: ancestorChain.length + focusMetrics.descendantsCount,
    hasReferralCode: Boolean(focusProfile.referral_code?.trim()),
    hasInvitedBy: Boolean(focusProfile.referred_by_profile_id),
  };
}

export async function loadReferralLineageView(
  supabase: SupabaseClient,
  focusProfileId: string,
): Promise<ReferralLineageView | null> {
  const rpcResult = await supabase.rpc("load_referral_lineage_profiles", {
    focus_profile_id: focusProfileId,
  });

  if (!rpcResult.error && Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
    return buildReferralLineageView(
      focusProfileId,
      rpcResult.data as ReferralLineageProfileRow[],
    );
  }

  return null;
}

export function buildReferralLineageLeaderboard(
  profiles: ReferralLineageProfileRow[],
  limit = 10,
): ReferralLineageLeaderboardEntry[] {
  const graph = buildReferralLineageGraph(profiles);
  const metrics = new Map<
    string,
    { descendantsCount: number; maxDepth: number }
  >();
  const entries = profiles.map((profile) => {
    const stat = computeMetrics(profile.id, graph, metrics, new Set<string>());
    return {
      profile: {
        id: profile.id,
        displayName: buildDisplayName(profile),
        referralCode: profile.referral_code?.trim() || null,
        referredByProfileId: profile.referred_by_profile_id,
        referredAt: profile.referred_at,
        createdAt: profile.created_at,
      },
      descendantsCount: stat.descendantsCount,
      maxDepth: stat.maxDepth,
      directInviteesCount: graph.directInviteeCounts.get(profile.id) ?? 0,
    };
  });

  return entries
    .sort((a, b) => {
      if (b.descendantsCount !== a.descendantsCount) {
        return b.descendantsCount - a.descendantsCount;
      }
      if (b.maxDepth !== a.maxDepth) {
        return b.maxDepth - a.maxDepth;
      }
      if (b.directInviteesCount !== a.directInviteesCount) {
        return b.directInviteesCount - a.directInviteesCount;
      }
      return a.profile.displayName.localeCompare(b.profile.displayName, "fr");
    })
    .slice(0, limit);
}

export function formatReferralLevel(level: number): string {
  if (level === 0) {
    return "Niveau 0";
  }

  return level > 0 ? `N+${level}` : `N${level}`;
}
