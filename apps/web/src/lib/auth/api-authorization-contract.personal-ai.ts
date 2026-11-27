import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const personalAiAuthorizationContract = {
  "personal-ai/imports": {
    POST: {
      expected: "Authenticated atomic confirmation of normalized imports under the Clerk owner",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess derives the Clerk owner before strict validation, server verification of both hashes, recalculation, and a service_role-only owner-explicit transactional RPC",
      evidence: ["requireAuthenticatedAccess", "hashPersonalAiImportValue", "personalAiImportIdentityHash", "calculatePersonalAiDeclaration", "confirm_personal_ai_import_for_owner", "getSupabaseAdminClient", "noStore"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess", "confirm_personal_ai_import_for_owner"],
    },
  },
  "personal-ai/declarations": {
    GET: {
      expected: "Authenticated owner-scoped declaration list with bounded pagination",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess current-user gate plus Clerk RLS and owner-filtered list query",
      evidence: ["requireAuthenticatedAccess", "userId", "personal_ai_declarations", "owner_clerk_id"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess"],
    },
    POST: {
      expected: "Authenticated private declaration creation/edit with server-controlled owner and canonical snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess supplies the owner; request is strictly normalized before canonical estimate and a service_role-only owner-explicit RPC",
      evidence: ["requireAuthenticatedAccess", "userId", "save_personal_ai_declaration_for_owner", "getSupabaseAdminClient", "calculatePersonalAiDeclaration"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess"],
    },
  },
  "personal-ai/declarations/[id]": {
    PATCH: {
      expected: "Authenticated owner-only declaration edit or status transition with UUID validation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess plus UUID validation and service_role-only RPCs that receive only the verified Clerk owner; read/delete retain Clerk RLS owner filters",
      evidence: ["requireAuthenticatedAccess", "isPersonalAiId", "owner_clerk_id", "save_personal_ai_declaration_for_owner", "set_personal_ai_declaration_status_for_owner", ".eq"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess", "isPersonalAiId"],
    },
    DELETE: {
      expected: "Authenticated owner-only hard delete with UUID validation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess plus UUID and owner filters with Clerk RLS",
      evidence: ["requireAuthenticatedAccess", "isPersonalAiId", "owner_clerk_id", ".eq"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess", "isPersonalAiId"],
    },
  },
} as const satisfies ApiAuthorizationContract;
