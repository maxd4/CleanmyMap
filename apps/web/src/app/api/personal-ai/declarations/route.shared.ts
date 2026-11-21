import { NextResponse } from "next/server";
import { z } from "zod";
import {
  calculatePersonalAiDeclaration,
  PersonalAiDeclarationInputError,
  parsePersonalAiDeclaration,
} from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";
import { requireSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

// Justification Vercel: private owner-scoped usage declarations must never enter a shared or stale cache.
export const PERSONAL_AI_NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY_BYTES = 32 * 1024;

export function personalAiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PERSONAL_AI_NO_STORE });
}

export async function parseRequestJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return { ok: false, status: 413, error: "Corps trop volumineux" };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return { ok: false, status: 413, error: "Corps trop volumineux" };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "JSON invalide" };
  }
}

export function projectPersonalAiRow(row: Record<string, unknown>) {
  const personalRecord = { ...row };
  delete personalRecord.owner_clerk_id;
  return personalRecord;
}

export async function listPersonalAiDeclarations(params: { userId: string; limit: number; offset: number }) {
  const client = await requireSupabaseClerkRlsClient();
  const { data, error } = await client.from("personal_ai_declarations")
    .select("*")
    .eq("owner_clerk_id", params.userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(params.offset, params.offset + params.limit);
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > params.limit;
  return { items: rows.slice(0, params.limit).map((row) => projectPersonalAiRow(row)), hasMore };
}

export async function createPersonalAiDeclaration(userId: string, draft: unknown) {
  const declaration = parsePersonalAiDeclaration(draft);
  const calculated = calculatePersonalAiDeclaration(declaration);
  const client = await requireSupabaseClerkRlsClient();
  const { data, error } = await client.from("personal_ai_declarations").insert({
    owner_clerk_id: userId,
    period_start_utc: declaration.periodStartUtc,
    period_end_utc: declaration.periodEndUtc,
    declaration,
    snapshot: calculated.snapshot,
    methodology_version: calculated.methodologyVersion,
    factor_version: calculated.factorVersion,
  }).select("*").single();
  if (error) throw error;
  return projectPersonalAiRow(data);
}

const updateSchema = z.object({
  declaration: z.unknown().optional(),
  status: z.enum(["ACTIVE", "EXCLUDED"]).optional(),
}).strict().refine((value) => value.declaration !== undefined || value.status !== undefined);

export async function updatePersonalAiDeclaration(params: { userId: string; id: string; payload: unknown }) {
  let update: z.infer<typeof updateSchema>;
  try { update = updateSchema.parse(params.payload); } catch { throw new PersonalAiDeclarationInputError(); }
  const values: Record<string, unknown> = {};
  if (update.status !== undefined) values.status = update.status;
  if (update.declaration !== undefined) {
    const declaration = parsePersonalAiDeclaration(update.declaration);
    const calculated = calculatePersonalAiDeclaration(declaration);
    values.period_start_utc = declaration.periodStartUtc;
    values.period_end_utc = declaration.periodEndUtc;
    values.declaration = declaration;
    values.snapshot = calculated.snapshot;
    values.methodology_version = calculated.methodologyVersion;
    values.factor_version = calculated.factorVersion;
  }
  const client = await requireSupabaseClerkRlsClient();
  const { data, error } = await client.from("personal_ai_declarations").update(values)
    .eq("id", params.id)
    .eq("owner_clerk_id", params.userId)
    .select("*").maybeSingle();
  if (error) throw error;
  return data ? projectPersonalAiRow(data) : null;
}

export async function deletePersonalAiDeclaration(params: { userId: string; id: string }) {
  const client = await requireSupabaseClerkRlsClient();
  const { data, error } = await client.from("personal_ai_declarations").delete()
    .eq("id", params.id)
    .eq("owner_clerk_id", params.userId)
    .select("id").maybeSingle();
  if (error) throw error;
  return data !== null;
}
