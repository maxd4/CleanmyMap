import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";

type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
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

function normalizeProfileRow(row: ProfileLookupRow): ResolvedActionOrganizer {
  return {
    userId: row.id,
    displayName:
      row.display_name?.trim() ||
      row.handle?.trim() ||
      row.id ||
      "Membre",
    handle: row.handle?.trim() || null,
    isPrimary: false,
    sourceToken: null,
  };
}

async function lookupProfileByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<ResolvedActionOrganizer | null> {
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
): Promise<ResolvedActionOrganizer | null> {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return null;
  }

  const client = await clerkClient();
  const searchParams =
    normalized.includes("@")
      ? { emailAddress: [normalized] }
      : { username: [normalized] };

  const result = await client.users.getUserList({
    ...searchParams,
    userId: normalized.startsWith("user_") ? [normalized] : undefined,
    limit: 10,
  });

  const match = result.data.find((user: ClerkUserLookup) => {
    const username = user.username?.trim() ?? "";
    const email = user.primaryEmailAddress?.emailAddress?.trim() ?? "";
    return (
      user.id === normalized ||
      username === normalized ||
      email === normalized
    );
  });

  if (!match) {
    return null;
  }

  const displayName =
    [match.firstName?.trim() ?? "", match.lastName?.trim() ?? ""]
      .join(" ")
      .trim() ||
    match.username?.trim() ||
    match.id;

  return {
    userId: match.id,
    displayName,
    handle: match.username?.trim() || null,
    isPrimary: false,
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
    organizers.push({
      userId: params.creator.userId,
      displayName:
        params.creator.displayName.trim() ||
        params.creator.handle?.trim() ||
        params.creator.username?.trim() ||
        params.creator.userId,
      handle:
        params.creator.handle?.trim() ||
        params.creator.username?.trim() ||
        null,
      isPrimary: true,
      sourceToken: null,
    });
  }

  const unresolvedTokens: string[] = [];
  const tokens = uniqueTokens(params.organizerAccounts ?? []);
  const seen = new Set<string>(includeCreatorAsPrimary ? [params.creator.userId] : []);

  for (const token of tokens) {
    if (
      includeCreatorAsPrimary &&
      (
        normalizeComparable(token) === normalizeComparable(params.creator.userId) ||
        normalizeComparable(token) === normalizeComparable(params.creator.handle) ||
        normalizeComparable(token) === normalizeComparable(params.creator.username) ||
        normalizeComparable(token) === normalizeComparable(params.creator.email)
      )
    ) {
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
    resolved.isPrimary = organizers.length === 0;
    organizers.push(resolved);
  }

  return {
    organizers,
    unresolvedTokens,
  };
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

  const actionResult = await runSingleActionQuery<{
    created_by_clerk_id: string | null;
  }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", actionId).maybeSingle());

  const creatorId =
    actionResult?.created_by_clerk_id?.trim() ||
    fallbackUserId?.trim() ||
    null;

  return creatorId ? [creatorId] : [];
}
