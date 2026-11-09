import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseSpogomiRegistrationQuizDefinition,
  parseSpogomiRegistrationQuizEvaluation,
  type SpogomiRegistrationQuizDefinition,
  type SpogomiRegistrationQuizEvaluation,
} from "../registration-quiz";

export class SpogomiRegistrationQuizError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "stale" | "validation" | "forbidden",
  ) {
    super(message);
    this.name = "SpogomiRegistrationQuizError";
  }
}

function mapQuizError(error: unknown): SpogomiRegistrationQuizError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : null;
  const message = error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
  if (message.includes("spogomi_registration_quiz_stale")) return new SpogomiRegistrationQuizError("Le règlement applicable a changé. Rechargez le quiz avant de le valider.", "stale");
  if (code === "P0002") return new SpogomiRegistrationQuizError("Cette édition ou cette division n’est pas disponible pour ce quiz.", "unavailable");
  if (code === "42501") return new SpogomiRegistrationQuizError("Le quiz SPOGOMI n’est pas disponible ou n’est pas encore validé pour cette édition.", "forbidden");
  if (code === "22023") return new SpogomiRegistrationQuizError("Les réponses du quiz sont invalides.", "validation");
  return new SpogomiRegistrationQuizError("Le quiz SPOGOMI n’a pas pu être traité.", "validation");
}

export async function loadSpogomiRegistrationQuiz(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
}): Promise<SpogomiRegistrationQuizDefinition> {
  const result = await params.supabase.rpc("spogomi_registration_quiz", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
  });
  if (result.error) throw mapQuizError(result.error);
  const definition = parseSpogomiRegistrationQuizDefinition(result.data);
  if (!definition) throw new SpogomiRegistrationQuizError("La définition du quiz SPOGOMI est invalide.", "validation");
  return definition;
}

export async function submitSpogomiRegistrationQuiz(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  userId: string;
  quizVersion: string;
  answers: Record<string, string>;
  experience?: "yes" | "no" | "prefer_not_to_say";
  experienceDescription?: string;
}): Promise<SpogomiRegistrationQuizEvaluation> {
  const result = await params.supabase.rpc("spogomi_submit_registration_quiz", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_user_id: params.userId,
    p_quiz_version: params.quizVersion,
    p_answers: params.answers,
    p_experience: params.experience ?? null,
    p_experience_description: params.experienceDescription?.trim().slice(0, 2000) ?? null,
  });
  if (result.error) throw mapQuizError(result.error);
  const evaluation = parseSpogomiRegistrationQuizEvaluation(result.data);
  if (!evaluation) throw new SpogomiRegistrationQuizError("L’évaluation du quiz SPOGOMI est invalide.", "validation");
  return evaluation;
}

export async function loadSpogomiRegistrationQuizProofsForUser(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
  quizVersions: ReadonlyMap<string, string>;
  registrationContractRevision: number;
}): Promise<Set<string>> {
  const divisionIds = [...params.quizVersions.keys()];
  if (!divisionIds.length) return new Set();
  const result = await params.supabase
    .from("spogomi_registration_quiz_proofs")
    .select("division_id, quiz_version, registration_contract_revision")
    .eq("event_id", params.eventId)
    .eq("clerk_id", params.userId)
    .in("division_id", divisionIds);
  if (result.error) throw new SpogomiRegistrationQuizError("Les preuves du quiz SPOGOMI ne sont pas disponibles.", "unavailable");
  return new Set(
    (result.data ?? [])
      .filter((row) => params.quizVersions.get(String(row.division_id)) === String(row.quiz_version) && Number(row.registration_contract_revision) === params.registrationContractRevision)
      .map((row) => String(row.division_id)),
  );
}
