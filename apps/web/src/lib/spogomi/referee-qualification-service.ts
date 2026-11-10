import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type SpogomiRefereeApplicationStatus =
  | "candidate"
  | "theory_qualified"
  | "practical_pending"
  | "habilitated"
  | "refused"
  | "revoked";

export type SpogomiRefereeApplication = {
  applicationId: string;
  eventId: string;
  divisionId: string;
  status: SpogomiRefereeApplicationStatus;
  quizVersion: string | null;
  regulationVersion: string;
  theoryQualified: boolean;
  practicalConfirmed: boolean;
};

export type SpogomiRefereeQuizQuestion = {
  id: string;
  prompt: string;
  critical: boolean;
  options: Array<{ id: string; label: string }>;
};

export type SpogomiRefereeQuizDefinition = {
  eventId: string;
  divisionId: string;
  regulationVersion: string;
  quizVersion: string;
  available: boolean;
  sourceReference: string | null;
  missing: Array<{ id: string; label: string; status: "incomplete" | "not_verified"; href: string; detail?: string }>;
  questions: SpogomiRefereeQuizQuestion[];
};

export type SpogomiRefereeQuizEvaluation = {
  passed: boolean;
  quizVersion: string;
  score: number;
  totalQuestions: number;
  criticalCorrect: number;
  criticalTotal: number;
  otherCorrect: number;
  otherTotal: number;
  errors: Array<{ questionId: string; explanation: string }>;
  proofId: string | null;
};

export class SpogomiRefereeQualificationError extends Error {
  constructor(message: string, public readonly kind: "unavailable" | "stale" | "validation" | "forbidden" | "rate_limited") {
    super(message);
    this.name = "SpogomiRefereeQualificationError";
  }
}

const optionSchema = z.object({ id: z.string(), label: z.string() });
const questionSchema = z.object({ id: z.string(), prompt: z.string(), critical: z.boolean(), options: z.array(optionSchema).min(2) });
const definitionSchema = z.object({
  eventId: z.string(), divisionId: z.string(), regulationVersion: z.string(), quizVersion: z.string(), available: z.boolean(),
  sourceReference: z.string().nullable(),
  missing: z.array(z.object({ id: z.string(), label: z.string(), status: z.enum(["incomplete", "not_verified"]), href: z.string(), detail: z.string().optional() })),
  questions: z.array(questionSchema),
});
const evaluationSchema = z.object({
  passed: z.boolean(), quizVersion: z.string(), score: z.number(), totalQuestions: z.number(), criticalCorrect: z.number(), criticalTotal: z.number(), otherCorrect: z.number(), otherTotal: z.number(), proofId: z.string().nullable(),
  errors: z.array(z.object({ questionId: z.string(), explanation: z.string() })),
});
const applicationSchema = z.object({
  applicationId: z.string(), eventId: z.string(), divisionId: z.string(), status: z.enum(["candidate", "theory_qualified", "practical_pending", "habilitated", "refused", "revoked"]), quizVersion: z.string().nullable(), regulationVersion: z.string(), theoryQualified: z.boolean(), practicalConfirmed: z.boolean(),
});

function mapError(error: unknown): SpogomiRefereeQualificationError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : "";
  const message = error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
  if (code === "40001" || message.includes("stale")) return new SpogomiRefereeQualificationError("Le règlement ou la version du quiz a changé. Rechargez la qualification.", "stale");
  if (code === "42900") return new SpogomiRefereeQualificationError("Le nombre de tentatives est temporairement limité. Réessayez plus tard.", "rate_limited");
  if (code === "P0002") return new SpogomiRefereeQualificationError("Cette édition ou cette division n’est pas disponible.", "unavailable");
  if (code === "42501") return new SpogomiRefereeQualificationError("La qualification arbitre n’est pas disponible dans cet état.", "forbidden");
  return new SpogomiRefereeQualificationError("La qualification arbitre n’a pas pu être traitée.", "validation");
}

function parseApplication(value: unknown): SpogomiRefereeApplication {
  const parsed = applicationSchema.safeParse(value);
  if (!parsed.success) throw new SpogomiRefereeQualificationError("La projection de candidature arbitre est invalide.", "validation");
  return parsed.data;
}

export async function createSpogomiRefereeApplication(params: { supabase: SupabaseClient; eventId: string; divisionId: string; clerkId: string }): Promise<SpogomiRefereeApplication> {
  const result = await params.supabase.rpc("spogomi_create_referee_application", { p_event_id: params.eventId, p_division_id: params.divisionId, p_clerk_id: params.clerkId });
  if (result.error) throw mapError(result.error);
  return parseApplication(result.data);
}

export async function loadSpogomiRefereeApplication(params: { supabase: SupabaseClient; eventId: string; divisionId: string; clerkId: string }): Promise<SpogomiRefereeApplication | null> {
  const result = await params.supabase.from("spogomi_referee_applications").select("id, event_id, division_id, status, quiz_version, regulation_version, theory_proof_id, practical_confirmation_version").eq("event_id", params.eventId).eq("division_id", params.divisionId).eq("clerk_id", params.clerkId).maybeSingle();
  if (result.error) throw new SpogomiRefereeQualificationError("Le statut de candidature n’est pas disponible.", "unavailable");
  if (!result.data) return null;
  return parseApplication({ applicationId: String(result.data.id), eventId: String(result.data.event_id), divisionId: String(result.data.division_id), status: result.data.status, quizVersion: result.data.quiz_version ? String(result.data.quiz_version) : null, regulationVersion: String(result.data.regulation_version), theoryQualified: Boolean(result.data.theory_proof_id), practicalConfirmed: Boolean(result.data.practical_confirmation_version) });
}

export async function loadSpogomiRefereeQuiz(params: { supabase: SupabaseClient; eventId: string; divisionId: string }): Promise<SpogomiRefereeQuizDefinition> {
  const result = await params.supabase.rpc("spogomi_referee_quiz_definition", { p_event_id: params.eventId, p_division_id: params.divisionId });
  if (result.error) throw mapError(result.error);
  const parsed = definitionSchema.safeParse(result.data);
  if (!parsed.success) throw new SpogomiRefereeQualificationError("La définition du quiz arbitre est invalide.", "validation");
  return parsed.data;
}

export async function submitSpogomiRefereeQuiz(params: { supabase: SupabaseClient; eventId: string; divisionId: string; userId: string; quizVersion: string; answers: Record<string, string> }): Promise<SpogomiRefereeQuizEvaluation> {
  const result = await params.supabase.rpc("spogomi_submit_referee_quiz", { p_event_id: params.eventId, p_division_id: params.divisionId, p_user_id: params.userId, p_quiz_version: params.quizVersion, p_answers: params.answers });
  if (result.error) throw mapError(result.error);
  const parsed = evaluationSchema.safeParse(result.data);
  if (!parsed.success) throw new SpogomiRefereeQualificationError("L’évaluation du quiz arbitre est invalide.", "validation");
  return parsed.data;
}

export async function confirmSpogomiRefereePractical(params: { supabase: SupabaseClient; applicationId: string; actorClerkId: string; confirmationVersion: string; details?: Record<string, unknown> }) {
  const result = await params.supabase.rpc("spogomi_confirm_referee_practical", { p_application_id: params.applicationId, p_actor_clerk_id: params.actorClerkId, p_confirmation_version: params.confirmationVersion, p_details: params.details ?? {} });
  if (result.error) throw mapError(result.error);
  return result.data;
}

export async function decideSpogomiRefereeApplication(params: { supabase: SupabaseClient; applicationId: string; actorClerkId: string; decision: "approve" | "refuse"; reason?: string | null }) {
  const result = await params.supabase.rpc("spogomi_decide_referee_application", { p_application_id: params.applicationId, p_actor_clerk_id: params.actorClerkId, p_decision: params.decision, p_reason: params.reason ?? null });
  if (result.error) throw mapError(result.error);
  return result.data;
}
