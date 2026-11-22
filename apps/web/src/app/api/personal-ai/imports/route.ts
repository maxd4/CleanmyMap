import { requireAuthenticatedAccess } from "@/lib/authz";
import { requireSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePersonalAiDeclaration, parsePersonalAiNormalizedDeclaration } from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";
import { hashPersonalAiImportValue } from "@/lib/environmental-impact-estimator/ai-personal-import-hash";

const MAX_IMPORT_BODY_BYTES = 16_000_000;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const importRow = z.object({
  declaration: z.unknown(),
  sourceIdentityHash: hash,
  normalizedContentHash: hash,
  metadata: z.object({
    provider: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "OTHER"]),
    granularity: z.enum(["PER_REQUEST", "AGGREGATE", "UNKNOWN"]),
    completeness: z.enum(["COMPLETE", "PARTIAL", "UNKNOWN"]),
    freshnessUtc: z.string().datetime({ offset: true }).nullable(),
  }).strict(),
  costAmount: z.number().finite().nonnegative().nullable(),
  costCurrency: z.string().regex(/^[A-Z]{3}$/).nullable(),
}).strict().refine((row) => (row.costAmount === null) === (row.costCurrency === null));

const requestSchema = z.object({ rows: z.array(importRow).min(1).max(20_000) }).strict();
const noStore = { "Cache-Control": "private, no-store" };

class ImportBodyTooLargeError extends Error {}

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_IMPORT_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new ImportBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return json({ error: "Connexion requise" }, 401);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMPORT_BODY_BYTES) return json({ error: "Import trop volumineux" }, 413);

  let payload: unknown;
  try {
    const text = await readBoundedBody(request);
    payload = JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof ImportBodyTooLargeError) return json({ error: "Import trop volumineux" }, 413);
    return json({ error: "Import invalide" }, 400);
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "Import invalide" }, 400);

  let rows: Array<Record<string, unknown>>;
  try {
    rows = await Promise.all(parsed.data.rows.map(async (item) => {
      const declaration = parsePersonalAiNormalizedDeclaration(item.declaration);
      const expectedContentHash = await hashPersonalAiImportValue({
        declaration, metadata: item.metadata, costAmount: item.costAmount, costCurrency: item.costCurrency,
      });
      if (expectedContentHash !== item.normalizedContentHash) throw new Error("normalized content hash mismatch");
      const calculated = calculatePersonalAiDeclaration(declaration);
      return {
        declaration,
        snapshot: calculated.snapshot,
        methodology_version: calculated.methodologyVersion,
        factor_version: calculated.factorVersion,
        source_identity_hash: item.sourceIdentityHash,
        normalized_content_hash: item.normalizedContentHash,
        import_metadata: item.metadata,
        cost_amount: item.costAmount,
        cost_currency: item.costCurrency,
      };
    }));
  } catch {
    return json({ error: "Import invalide" }, 400);
  }

  try {
    const client = await requireSupabaseClerkRlsClient();
    const { data, error } = await client.rpc("confirm_personal_ai_import", { p_rows: rows });
    if (error) throw error;
    return json({ items: (data ?? []).map((row: Record<string, unknown>) => {
      const projected = { ...row } as Record<string, unknown>;
      delete projected.owner_clerk_id;
      return projected;
    }) }, 200);
  } catch {
    return json({ error: "Confirmation atomique indisponible; aucune ligne de cet import n'a été confirmée." }, 503);
  }
}
