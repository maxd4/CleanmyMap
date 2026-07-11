import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";
import { env } from "@/lib/env";
import {
  ACTIVE_PARTICIPATION_STATUS,
  loadActionParticipantIdsForAction,
  loadManualParticipantIdsForAction,
} from "./group-participation.helpers";

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
  primaryEmailAddress: {
    emailAddress: string;
  } | null;
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

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens.map(normalizeToken).filter((token) => token.length > 0))];
}

function parseCsvUserIds(raw: string | undefined): string[] {
  return uniqueTokens(
    (raw ?? "")
      .split(/[,;\n]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );
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
    user.id
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
      creator.userId,
    handle: creator.handle?.trim() || creator.username?.trim() || null,
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

export function parseOrganizerAccountTokens(
  raw: string | string[] | null | undefined,
): string[] {
  if (Array.isArray(raw)) {
    return uniqueTokens(raw);
  }
  if (typeof raw !== "string") {
    return [];
  }
  return uniqueTokens(
    raw
      .split(/[,;\n]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );
}

function normalizeProfileRow(row: ProfileLookupRow): ResolvedActionAccount {
  return {
    userId: row.id,
    displayName:
      row.display_name?.trim() ||
      row.handle?.trim() ||
      row.id ||
      "Membre",
    handle: row.handle?.trim() || null,
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
      .from("profiles")
      .select("id, display_name, handle")
      .eq("id", normalized)
      .maybeSingle(),
    supabase
      .from("profiles")
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
    .from("profiles")
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
    isClerkUserMatch(user, normalized),
  );

  if (!match) {
    return null;
  }

  return {
    userId: match.id,
    displayName: buildClerkDisplayName(match),
    handle: match.username?.trim() || null,
    sourceToken: token,
  };
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

  for (const token of tokens) {
    if (includeCreatorAsPrimary && isCreatorToken(token, params.creator)) {
      continue;
    }

    const fromProfiles = await lookupProfileByToken(params.supabase, token);
    const resolved = fromProfiles ?? (await lookupClerkUserByToken(token));

    if (!resolved) {
      unresolvedTokens.push(token);
      continue;
    }

    if (seen.has(resolved.userId)) {
      continue;
    }

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

export async function resolveActionParticipants(params: {
  supabase: SupabaseClient;
  creator: {
    userId: string;
    displayName: string;
    handle?: string | null;
    username?: string | null;
    email?: string | null;
  };
  participantAccounts?: string[] | null;
  organizerIds?: string[] | null;
  existingParticipantIds?: string[] | null;
}): Promise<{
  participants: ResolvedActionParticipant[];
  unresolvedTokens: string[];
}> {
  const unresolvedTokens: string[] = [];
  const participants: ResolvedActionParticipant[] = [];
  const seen = new Set<string>(
    (params.organizerIds ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  for (const participantId of params.existingParticipantIds ?? []) {
    const normalized = participantId.trim();
    if (normalized.length > 0) {
      seen.add(normalized);
    }
  }
  seen.add(params.creator.userId);

  for (const token of uniqueTokens(params.participantAccounts ?? [])) {
    if (isCreatorToken(token, params.creator)) {
      continue;
    }

    const fromProfiles = await lookupProfileByToken(params.supabase, token);
    const resolved = fromProfiles ?? (await lookupClerkUserByToken(token));

    if (!resolved) {
      unresolvedTokens.push(token);
      continue;
    }

    if (seen.has(resolved.userId)) {
      continue;
    }

    seen.add(resolved.userId);
    participants.push(resolved);
  }

  return {
    participants,
    unresolvedTokens,
  };
}

export async function syncActionManualParticipants(params: {
  supabase: SupabaseClient;
  actionId: string;
  creator: {
    userId: string;
    displayName: string;
    handle?: string | null;
    username?: string | null;
    email?: string | null;
  };
  participantAccounts?: string[] | null;
  organizerIds?: string[] | null;
}): Promise<{
  participants: ResolvedActionParticipant[];
  unresolvedTokens: string[];
}> {
  const currentParticipantIds = await loadActionParticipantIdsForAction(
    params.supabase,
    params.actionId,
  );
  const currentManualParticipantIds = await loadManualParticipantIdsForAction(
    params.supabase,
    params.actionId,
  );

  const resolution = await resolveActionParticipants({
    supabase: params.supabase,
    creator: params.creator,
    participantAccounts: params.participantAccounts,
    organizerIds: params.organizerIds,
    existingParticipantIds: currentParticipantIds,
  });

  const targetParticipantIds = new Set(
    resolution.participants.map((participant) => participant.userId),
  );
  const idsToRemove = currentManualParticipantIds.filter(
    (participantId) => !targetParticipantIds.has(participantId),
  );

  if (idsToRemove.length > 0) {
    const deleteResult = await params.supabase
      .from("action_participants")
      .delete()
      .eq("action_id", params.actionId)
      .eq("participation_source", "manual_add")
      .in("user_id", idsToRemove);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
  }

  const idsToInsert = resolution.participants.filter(
    (participant) => !currentParticipantIds.includes(participant.userId),
  );

  if (idsToInsert.length > 0) {
    const joinedAt = new Date().toISOString();
    const insertResult = await params.supabase
      .from("action_participants")
      .insert(
        idsToInsert.map((participant) => ({
          action_id: params.actionId,
          user_id: participant.userId,
          joined_at: joinedAt,
          participation_status: ACTIVE_PARTICIPATION_STATUS,
          participation_source: "manual_add" as const,
        })),
      );

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }
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

export async function loadActionOrganizerIdsForAction(
  supabase: SupabaseClient,
  actionId: string,
  fallbackUserId?: string | null,
): Promise<string[]> {
  const rows = await loadActionOrganizerRowsForAction(supabase, actionId).catch(() => []);
  const organizerIds = [...new Set(rows.map((row) => row.organizer_clerk_id))];

  if (organizerIds.length > 0) {
    return organizerIds;
  }

  const configuredAdminIds = parseCsvUserIds(env.CLERK_ADMIN_USER_IDS);
  if (configuredAdminIds.length > 0) {
    return [configuredAdminIds[0]];
  }

  const actionResult = await runSingleActionQuery<{
    created_by_clerk_id: string | null;
  }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", actionId).maybeSingle());

  const creatorId =
    actionResult?.created_by_clerk_id?.trim() ||
    fallbackUserId?.trim() ||
    null;

  return creatorId ? [creatorId] : [];
}

export function resolveDefaultActionOrganizerIds(params: {
  creatorUserId: string;
  creatorIsAdminLike: boolean;
}): string[] {
  if (params.creatorIsAdminLike) {
    return [params.creatorUserId];
  }

  const configuredAdminIds = parseCsvUserIds(env.CLERK_ADMIN_USER_IDS);
  if (configuredAdminIds.length > 0) {
    return [configuredAdminIds[0]];
  }

  return [params.creatorUserId];
}
