import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SPOGOMI_TEAM_SESSION_COOKIE = "spogomi_team_session";
const TEAM_GRANT_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const TEAM_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

type TeamAccessGrantRow = {
  id: string;
  event_id: string;
  team_id: string;
  expires_at: string;
  revoked_at: string | null;
};

export type SpogomiTeamSessionContext = {
  sessionId: string;
  grantId: string;
  eventId: string;
  teamId: string;
  eventSlug: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function issueOpaqueValue(): string {
  return randomBytes(32).toString("base64url");
}

function isActive(expiresAt: string, revokedAt: string | null): boolean {
  return !revokedAt && new Date(expiresAt).getTime() > Date.now();
}

export async function issueSpogomiTeamAccessGrant(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
  createdByClerkId: string;
}): Promise<{ grantId: string; token: string; expiresAt: string }> {
  const team = await params.supabase
    .from("spogomi_teams")
    .select("id, event_id")
    .eq("id", params.teamId)
    .eq("event_id", params.eventId)
    .maybeSingle();
  if (team.error) throw team.error;
  if (!team.data) throw new Error("Team not found.");

  const revoked = await params.supabase
    .from("spogomi_team_access_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("team_id", params.teamId)
    .eq("event_id", params.eventId)
    .is("revoked_at", null);
  if (revoked.error) throw revoked.error;

  const token = issueOpaqueValue();
  const expiresAt = new Date(Date.now() + TEAM_GRANT_LIFETIME_MS).toISOString();
  const inserted = await params.supabase
    .from("spogomi_team_access_grants")
    .insert({
      event_id: params.eventId,
      team_id: params.teamId,
      token_hash: sha256(token),
      created_by_clerk_id: params.createdByClerkId,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();
  if (inserted.error) throw inserted.error;
  return { grantId: String(inserted.data.id), token, expiresAt: String(inserted.data.expires_at) };
}

export async function revokeSpogomiTeamAccessGrant(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
}): Promise<void> {
  const result = await params.supabase
    .from("spogomi_team_access_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("event_id", params.eventId)
    .eq("team_id", params.teamId)
    .is("revoked_at", null);
  if (result.error) throw result.error;
  const sessions = await params.supabase
    .from("spogomi_team_access_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("event_id", params.eventId)
    .eq("team_id", params.teamId)
    .is("revoked_at", null);
  if (sessions.error) throw sessions.error;
}

export async function consumeSpogomiTeamAccessToken(params: {
  supabase: SupabaseClient;
  token: string;
  eventSlug: string;
}): Promise<{ sessionToken: string; eventSlug: string; teamId: string }> {
  if (!/^[A-Za-z0-9_-]{40,}$/.test(params.token)) throw new Error("Team access token is invalid.");
  const grant = await params.supabase
    .from("spogomi_team_access_grants")
    .select("id, event_id, team_id, expires_at, revoked_at")
    .eq("token_hash", sha256(params.token))
    .maybeSingle();
  if (grant.error) throw grant.error;
  const row = grant.data as TeamAccessGrantRow | null;
  if (!row || !isActive(row.expires_at, row.revoked_at)) throw new Error("Team access token not found.");

  const event = await params.supabase
    .from("spogomi_events")
    .select("id, event_slug")
    .eq("id", row.event_id)
    .maybeSingle();
  if (event.error) throw event.error;
  if (!event.data || event.data.event_slug !== params.eventSlug) throw new Error("Team access is forbidden.");

  const sessionToken = issueOpaqueValue();
  const sessionExpiresAt = new Date(Math.min(
    Date.now() + TEAM_SESSION_LIFETIME_MS,
    new Date(row.expires_at).getTime(),
  )).toISOString();
  const inserted = await params.supabase
    .from("spogomi_team_access_sessions")
    .insert({
      grant_id: row.id,
      event_id: row.event_id,
      team_id: row.team_id,
      session_hash: sha256(sessionToken),
      expires_at: sessionExpiresAt,
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;

  const used = await params.supabase
    .from("spogomi_team_access_grants")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  if (used.error) throw used.error;
  return { sessionToken, eventSlug: params.eventSlug, teamId: row.team_id };
}

export async function loadSpogomiTeamSession(
  supabase: SupabaseClient,
  sessionToken: string | null | undefined,
): Promise<SpogomiTeamSessionContext | null> {
  if (!sessionToken || !/^[A-Za-z0-9_-]{40,}$/.test(sessionToken)) return null;
  const session = await supabase
    .from("spogomi_team_access_sessions")
    .select("id, grant_id, event_id, team_id, expires_at, revoked_at")
    .eq("session_hash", sha256(sessionToken))
    .maybeSingle();
  if (session.error) throw session.error;
  const sessionRow = session.data as { id: string; grant_id: string; event_id: string; team_id: string; expires_at: string; revoked_at: string | null } | null;
  if (!sessionRow || !isActive(sessionRow.expires_at, sessionRow.revoked_at)) return null;

  const grant = await supabase
    .from("spogomi_team_access_grants")
    .select("expires_at, revoked_at")
    .eq("id", sessionRow.grant_id)
    .maybeSingle();
  if (grant.error) throw grant.error;
  if (!grant.data || !isActive(String(grant.data.expires_at), grant.data.revoked_at as string | null)) return null;

  const event = await supabase
    .from("spogomi_events")
    .select("event_slug")
    .eq("id", sessionRow.event_id)
    .maybeSingle();
  if (event.error) throw event.error;
  if (!event.data?.event_slug) return null;

  await supabase
    .from("spogomi_team_access_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionRow.id);
  return {
    sessionId: sessionRow.id,
    grantId: sessionRow.grant_id,
    eventId: sessionRow.event_id,
    teamId: sessionRow.team_id,
    eventSlug: String(event.data.event_slug),
  };
}
