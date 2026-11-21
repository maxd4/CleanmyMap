import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFallbackHandle } from "@/lib/auth/identity-handle";
import { isE2EClerkAccount, type E2EClerkAccountLike } from "@/lib/auth/e2e-account";
import { persistManualParticipantDiff } from "./manual-participant-sync";

type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

type ResolvedActionAccount = {
  userId: string;
  displayName: string;
  handle: string | null;
  isPrimary?: boolean;
  sourceToken: string | null;
};

type ClerkUserLookup = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses?: Array<{ emailAddress?: string | null }> | null;
};

export type ResolvedActionOrganizer = {
  userId: string;
  displayName: string;
  handle: string | null;
  isPrimary: boolean;
  sourceToken: string | null;
};

export type ResolvedActionParticipant = ResolvedActionAccount;

export type ActionOrganizerResolution = {
  organizers: ResolvedActionOrganizer[];
  unresolvedTokens: string[];
};

export type ActionAccountResolutionParams = { supabase: SupabaseClient; creator: { userId: string; displayName: string; handle?: string | null; username?: string | null; email?: string | null } };

function normalizeToken(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens.map(normalizeToken).filter((token) => token.length > 0))];
}

function buildClerkSearchParams(normalized: string): {
  emailAddress?: string[];
  username?: string[];
} {
  return normalized.includes("@")
    ? { emailAddress: [normalized] }
    : { username: [normalized] };
}

function isClerkUserMatch(user: ClerkUserLookup, normalized: string): boolean {
  const username = user.username?.trim() ?? "";
  const email = user.primaryEmailAddress?.emailAddress?.trim() ?? "";
  return user.id === normalized || username === normalized || email === normalized;
}

function buildClerkDisplayName(user: ClerkUserLookup): string {
  return (
    [user.firstName?.trim() ?? "", user.lastName?.trim() ?? ""]
      .join(" ")
      .trim() ||
    user.username?.trim() ||
    buildFallbackHandle(user.id)
  );
}

function buildPrimaryOrganizer(creator: {
  userId: string;
  displayName: string;
  handle?: string | null;
  username?: string | null;
}): ResolvedActionOrganizer {
  return {
    userId: creator.userId,
    displayName:
      creator.displayName.trim() ||
      creator.handle?.trim() ||
      creator.username?.trim() ||
      buildFallbackHandle(creator.userId),
    handle:
      creator.handle?.trim() ||
      creator.username?.trim() ||
      buildFallbackHandle(creator.userId),
    isPrimary: true,
    sourceToken: null,
  };
}

function isCreatorToken(
  token: string,
  creator: {
    userId: string;
    handle?: string | null;
    username?: string | null;
    email?: string | null;
  },
): boolean {
  const normalizedToken = normalizeComparable(token);
  return (
    normalizedToken === normalizeComparable(creator.userId) ||
    normalizedToken === normalizeComparable(creator.handle) ||
    normalizedToken === normalizeComparable(creator.username) ||
    normalizedToken === normalizeComparable(creator.email)
  );
}

function normalizeProfileRow(row: ProfileLookupRow): ResolvedActionAccount {
  return {
    userId: row.id,
    displayName:
      row.display_name?.trim() ||
      row.handle?.trim() ||
      buildFallbackHandle(row.id),
    handle: row.handle?.trim() || buildFallbackHandle(row.id),
    sourceToken: null,
  };
}

async function lookupProfileByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<ResolvedActionAccount | null> {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return null;
  }

  const [directId, directHandle] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, display_name, handle")
      .eq("id", normalized)
      .maybeSingle(),
    supabase
      .from("public_profiles")
      .select("id, display_name, handle")
      .eq("handle", normalized)
      .maybeSingle(),
  ]);

  if (directId.data) {
    return {
      ...normalizeProfileRow(directId.data as ProfileLookupRow),
      sourceToken: token,
    };
  }

  if (directHandle.data) {
    return {
      ...normalizeProfileRow(directHandle.data as ProfileLookupRow),
      sourceToken: token,
    };
  }

  const displayNameMatch = await supabase
    .from("public_profiles")
    .select("id, display_name, handle")
    .ilike("display_name", normalized)
    .limit(20);

  if (!displayNameMatch.error && Array.isArray(displayNameMatch.data)) {
    const exactMatches = (displayNameMatch.data as ProfileLookupRow[]).filter(
      (row) => normalizeComparable(row.display_name) === normalizeComparable(normalized),
    );
    if (exactMatches.length === 1) {
      return {
        ...normalizeProfileRow(exactMatches[0]),
        sourceToken: token,
      };
    }
  }

  return null;
}

async function lookupClerkUserByToken(
  token: string,
): Promise<ResolvedActionAccount | null> {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return null;
  }

  const client = await clerkClient();
  const searchParams = buildClerkSearchParams(normalized);

  const result = await client.users.getUserList({
    ...searchParams,
    userId: normalized.startsWith("user_") ? [normalized] : undefined,
    limit: 10,
  });

  const match = result.data.find((user: ClerkUserLookup) =>
    isClerkUserMatch(user, normalized) && !isE2EClerkAccount(user as E2EClerkAccountLike),
  );

  if (!match) {
    return null;
  }

  return {
    userId: match.id,
    displayName: buildClerkDisplayName(match),
    handle: match.username?.trim() || buildFallbackHandle(match.id),
    sourceToken: token,
  };
}

async function resolveActionAccountsByTokens(params: {
  supabase: SupabaseClient;
  tokens: string[];
}): Promise<{ accountsByToken: Map<string, ResolvedActionAccount>; unresolvedTokens: string[] }> {
  const tokens = uniqueTokens(params.tokens);
  const accountsByToken = new Map<string, ResolvedActionAccount>();
  const {
    getVerifiedNonE2EClerkUsers,
    MAX_CLERK_ACCOUNT_VERIFICATION_IDS,
  } = await import("@/lib/auth/e2e-account-server");
  if (tokens.length > MAX_CLERK_ACCOUNT_VERIFICATION_IDS) {
    return { accountsByToken, unresolvedTokens: tokens };
  }

  const profilesByToken = new Map<string, ResolvedActionAccount>();
  for (const token of tokens) {
    const profile = await lookupProfileByToken(params.supabase, token);
    if (profile) profilesByToken.set(token, profile);
  }

  const directUserIds = tokens.filter((token) => !profilesByToken.has(token) && token.startsWith("user_"));
  const verifiedProfiles = await getVerifiedNonE2EClerkUsers([
    ...[...profilesByToken.values()].map((profile) => profile.userId),
    ...directUserIds,
  ]);
  const unresolvedTokens: string[] = [];

  for (const token of tokens) {
    const profile = profilesByToken.get(token);
    if (profile) {
      if (verifiedProfiles.has(profile.userId)) accountsByToken.set(token, profile);
      else unresolvedTokens.push(token);
      continue;
    }

    if (token.startsWith("user_")) {
      const user = verifiedProfiles.get(token);
      if (!user) {
        unresolvedTokens.push(token);
        continue;
      }
      accountsByToken.set(token, {
        userId: user.id,
        displayName: buildClerkDisplayName(user),
        handle: user.username?.trim() || buildFallbackHandle(user.id),
        sourceToken: token,
      });
      continue;
    }

    const account = await lookupClerkUserByToken(token);
    if (account) accountsByToken.set(token, account);
    else unresolvedTokens.push(token);
  }

  return { accountsByToken, unresolvedTokens };
}

export async function resolveActionOrganizers(params: {
  supabase: SupabaseClient;
  creator: {
    userId: string;
    displayName: string;
    handle?: string | null;
    username?: string | null;
    email?: string | null;
  };
  organizerAccounts?: string[] | null;
  includeCreatorAsPrimary?: boolean;
}): Promise<ActionOrganizerResolution> {
  const includeCreatorAsPrimary = params.includeCreatorAsPrimary ?? false;
  const organizers: ResolvedActionOrganizer[] = [];

  if (includeCreatorAsPrimary) {
    organizers.push(buildPrimaryOrganizer(params.creator));
  }

  const unresolvedTokens: string[] = [];
  const tokens = uniqueTokens(params.organizerAccounts ?? []);
  const seen = new Set<string>(includeCreatorAsPrimary ? [params.creator.userId] : []);
  const selectableTokens = tokens.filter((token) =>
    !(includeCreatorAsPrimary && isCreatorToken(token, params.creator)),
  );
  const resolution = await resolveActionAccountsByTokens({
    supabase: params.supabase,
    tokens: selectableTokens,
  });
  unresolvedTokens.push(...resolution.unresolvedTokens);

  for (const token of selectableTokens) {
    const resolved = resolution.accountsByToken.get(token);
    if (!resolved) continue;
    if (seen.has(resolved.userId)) continue;
    seen.add(resolved.userId);

    organizers.push({
      ...resolved,
      isPrimary: organizers.length === 0,
    });
  }

  return {
    organizers,
    unresolvedTokens,
  };
}

export async function resolveActionParticipants(params: ActionAccountResolutionParams & {
  participantAccounts?: string[] | null;
  organizerIds?: string[] | null;
}): Promise<{
  participants: ResolvedActionParticipant[];
  unresolvedTokens: string[];
}> {
  const unresolvedTokens: string[] = [];
  const participants: ResolvedActionParticipant[] = [];
  const tokens = uniqueTokens(params.participantAccounts ?? []).filter((token) =>
    !isCreatorToken(token, params.creator),
  );
  const resolution = await resolveActionAccountsByTokens({ supabase: params.supabase, tokens });
  unresolvedTokens.push(...resolution.unresolvedTokens);
  const seen = new Set<string>(
    (params.organizerIds ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  seen.add(params.creator.userId);

  for (const token of tokens) {
    const resolved = resolution.accountsByToken.get(token);
    if (!resolved) continue;
    if (seen.has(resolved.userId)) continue;
    seen.add(resolved.userId);

    participants.push(resolved);
  }

  return {
    participants,
    unresolvedTokens,
  };
}

export async function syncActionManualParticipants(params: ActionAccountResolutionParams & {
  actionId: string;
  participantAccounts?: string[] | null;
  organizerIds?: string[] | null;
}): Promise<{
  participants: ResolvedActionParticipant[];
  unresolvedTokens: string[];
}> {
  const resolution = await resolveActionParticipants({
    supabase: params.supabase,
    creator: params.creator,
    participantAccounts: params.participantAccounts,
    organizerIds: params.organizerIds,
  });

  // A partial or failed account resolution must not be interpreted as an
  // explicit removal. Resolve the complete requested set before changing any
  // existing registration.
  if (resolution.unresolvedTokens.length === 0) {
    await persistManualParticipantDiff({
      supabase: params.supabase,
      actionId: params.actionId,
      participants: resolution.participants,
    });
  }
  return resolution;
}

export async function loadActionOrganizerRowsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<
  Array<{
    action_id: string;
    organizer_clerk_id: string;
    organizer_label: string;
    organizer_handle: string | null;
    is_primary: boolean;
    created_at: string;
  }>
> {
  const result = await supabase
    .from("action_organizers")
    .select(
      "action_id, organizer_clerk_id, organizer_label, organizer_handle, is_primary, created_at",
    )
    .eq("action_id", actionId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as Array<{
    action_id: string;
    organizer_clerk_id: string;
    organizer_label: string;
    organizer_handle: string | null;
    is_primary: boolean;
    created_at: string;
  }>;
}

/** Returns only the persisted action_organizers relation. */
export async function loadCanonicalActionOrganizerIdsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<string[]> {
  const rows = await loadActionOrganizerRowsForAction(supabase, actionId);
  return [...new Set(rows.map((row) => row.organizer_clerk_id.trim()).filter(Boolean))];
}

/**
 * No implicit organizer default. Callers must provide an explicit account when
 * the canonical action_organizers relation is intended to be created; this
 * helper must never be used as a read-time ownership or authorization fallback.
 */
export function resolveDefaultActionOrganizerIds(params: {
  creatorUserId: string;
  creatorIsGlobalAdmin: boolean;
}): string[] {
  void params;
  // No authorization identity may be turned into an implicit organizer.
  // The caller must provide an explicit account for the canonical relation.
  return [];
}
