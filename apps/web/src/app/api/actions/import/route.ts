import { z } from"zod";
import { ACTION_STATUSES } from"@/lib/actions/types";
import { requireAdminAccess } from"@/lib/authz";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { appendActionMetadataToNotes } from"@/lib/actions/metadata";
import { isValidAssociationName } from"@/lib/actions/association-options";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
import {
 createDryRunProof,
 hashImportPayload,
 verifyDryRunProof,
} from"@/lib/admin/dry-run-proof";
import {
 adminErrorResponse,
 adminSuccessResponse,
 newOperationId,
} from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";

export const runtime ="nodejs";
const IMPORT_CONFIRM_PHRASE ="CONFIRMER IMPORT";

const importActionSchema = z.object({
 actorName: z.string().trim().min(1).max(200).optional(),
 associationName: z
 .string()
 .trim()
 .min(1)
 .max(120)
 .refine((value) => isValidAssociationName(value),"Association invalide.")
 .optional(),
 actionDate: z
 .string()
 .regex(/^\d{4}-\d{2}-\d{2}$/,"Date attendue au format YYYY-MM-DD"),
 locationLabel: z.string().trim().min(2).max(255),
 latitude: z.number().min(-90).max(90).nullable().optional(),
 longitude: z.number().min(-180).max(180).nullable().optional(),
 wasteKg: z.number().min(0).max(100000),
 cigaretteButts: z.number().int().min(0).max(100000000),
 volunteersCount: z.number().int().min(1).max(10000),
 durationMinutes: z.number().int().min(1).max(100000),
 notes: z.string().trim().max(2000).optional(),
 status: z.enum(ACTION_STATUSES).optional(),
});

const importPayloadSchema = z.object({
 items: z.array(importActionSchema).min(1).max(2000),
 dryRunProof: z.string().min(24).optional(),
 confirmPhrase: z.string().trim().max(120).optional(),
});

function extractProofFromRequest(
 parsed: z.infer<typeof importPayloadSchema>,
 request: Request,
): string | null {
 return parsed.dryRunProof ?? request.headers.get("x-import-dry-run-proof");
}

function extractConfirmationPhrase(
 parsed: z.infer<typeof importPayloadSchema>,
 request: Request,
): string | null {
 return parsed.confirmPhrase ?? request.headers.get("x-admin-confirmation");
}

function isValidImportConfirmationPhrase(value: string | null): boolean {
 return (value ??"").trim().toUpperCase() === IMPORT_CONFIRM_PHRASE;
}

export async function POST(request: Request) {
 const operationId = newOperationId();
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access, operationId);
 }

 const url = new URL(request.url);
 const dryRun = url.searchParams.get("dryRun") ==="1";

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType: dryRun ?"import_dry_run" :"import_confirm",
 outcome:"error",
 details: { code:"invalid_json" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_json",
 message:"Invalid JSON payload",
 hint:"Verifie le JSON puis relance la previsualisation dry-run.",
 operationId,
 });
 }

 const parsed = importPayloadSchema.safeParse(payload);
 if (!parsed.success) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType: dryRun ?"import_dry_run" :"import_confirm",
 outcome:"error",
 details: { code:"invalid_payload" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_payload",
 message:"Invalid payload",
 hint:"Le payload doit contenir items[] avec les champs attendus.",
 operationId,
 details: parsed.error.flatten().fieldErrors,
 });
 }

 const normalizedPayload = { items: parsed.data.items };
 const payloadHash = hashImportPayload(normalizedPayload);

 const toInsert = parsed.data.items.map((item) => ({
 created_by_clerk_id: access.userId,
 actor_name: item.actorName ?? null,
 action_date: item.actionDate,
 location_label: item.locationLabel,
 latitude: item.latitude ?? null,
 longitude: item.longitude ?? null,
 waste_kg: item.wasteKg,
 cigarette_butts: item.cigaretteButts,
 volunteers_count: item.volunteersCount,
 duration_minutes: item.durationMinutes,
 notes:
 appendActionMetadataToNotes(item.notes, {
 associationName: item.associationName,
 }) ?? null,
 status: item.status ??"approved",
 }));

 if (dryRun) {
 const stats = toInsert.reduce(
 (acc, row) => {
 acc.withCoordinates +=
 row.latitude !== null && row.longitude !== null ? 1 : 0;
 acc.missingCoordinates +=
 row.latitude === null || row.longitude === null ? 1 : 0;
 acc.totalWasteKg += Number(row.waste_kg || 0);
 acc.totalButts += Number(row.cigarette_butts || 0);
 acc.totalVolunteers += Number(row.volunteers_count || 0);
 acc.dateMin =
 acc.dateMin === null || row.action_date < acc.dateMin
 ? row.action_date
 : acc.dateMin;
 acc.dateMax =
 acc.dateMax === null || row.action_date > acc.dateMax
 ? row.action_date
 : acc.dateMax;
 return acc;
 },
 {
 withCoordinates: 0,
 missingCoordinates: 0,
 totalWasteKg: 0,
 totalButts: 0,
 totalVolunteers: 0,
 dateMin: null as string | null,
 dateMax: null as string | null,
 },
 );

 const proof = createDryRunProof({
 userId: access.userId,
 payloadHash,
 });

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_dry_run",
 outcome:"success",
 details: { count: toInsert.length, payloadHash },
 });

 return adminSuccessResponse({
 operationId,
 payload: {
 status:"dry_run",
 count: toInsert.length,
 stats,
 dryRunProof: proof,
 },
 });
 }

 const proofToken = extractProofFromRequest(parsed.data, request);
 if (!proofToken) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_confirm",
 outcome:"error",
 details: { code:"dry_run_required" },
 });

 return adminErrorResponse({
 status: 409,
 code:"dry_run_required",
 message:"Dry-run proof required",
 hint:"Lance d'abord un dry-run valide puis confirme avec le jeton fourni.",
 operationId,
 });
 }

 const confirmationPhrase = extractConfirmationPhrase(parsed.data, request);
 if (!isValidImportConfirmationPhrase(confirmationPhrase)) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_confirm",
 outcome:"error",
 details: { code:"confirmation_required" },
 });

 return adminErrorResponse({
 status: 409,
 code:"confirmation_required",
 message:"Explicit confirmation phrase required",
 hint: `Renseigne exactement la phrase: ${IMPORT_CONFIRM_PHRASE}`,
 operationId,
 });
 }

 const verification = verifyDryRunProof({
 token: proofToken,
 userId: access.userId,
 payloadHash,
 });

 if (!verification.ok) {
 const mapping =
 verification.code ==="expired"
 ? {
 status: 409,
 code:"dry_run_expired" as const,
 message:"Dry-run proof expired",
 hint:"Relance la previsualisation dry-run avant de confirmer.",
 }
 : verification.code ==="mismatch"
 ? {
 status: 409,
 code:"dry_run_mismatch" as const,
 message:"Dry-run proof mismatch",
 hint:"Le payload confirme ne correspond pas au dry-run valide.",
 }
 : {
 status: 409,
 code:"dry_run_required" as const,
 message:"Invalid dry-run proof",
 hint:"Regenerer un dry-run valide puis confirmer.",
 };

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_confirm",
 outcome:"error",
 details: { code: mapping.code },
 });

 return adminErrorResponse({
 status: mapping.status,
 code: mapping.code,
 message: mapping.message,
 hint: mapping.hint,
 operationId,
 });
 }

 try {
 const supabase = getSupabaseServerClient();
 const { data, error } = await supabase
 .from("actions")
 .insert(toInsert)
 .select("id");
 if (error) {
 throw new Error(error.message);
 }

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_confirm",
 outcome:"success",
 details: { count: data?.length ?? 0 },
 });

 return adminSuccessResponse({
 status: 201,
 operationId,
 payload: {
 status:"imported",
 count: data?.length ?? 0,
 },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"import_confirm",
 outcome:"error",
 details: { code:"server_error", message },
 });

 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message,
 hint:"Verifier la connexion Supabase et relancer l'import.",
 operationId,
 });
 }
}
