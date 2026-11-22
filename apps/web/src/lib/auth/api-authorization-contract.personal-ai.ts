import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const personalAiAuthorizationContract = {
  "personal-ai/imports": {
    POST: {
      expected: "Authenticated atomic confirmation of normalized imports under the Clerk owner",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess derives the caller before strict validation, server verification of the normalized hash, recalculation, and owner-derived transactional RPC",
      evidence: ["requireAuthenticatedAccess", "hashPersonalAiImportValue", "calculatePersonalAiDeclaration", "confirm_personal_ai_import", "noStore"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess", "confirm_personal_ai_import"],
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
      expected: "Authenticated private declaration creation with server-controlled owner and canonical snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess supplies owner_clerk_id; request is strictly normalized before canonical estimate and Clerk RLS insert",
      evidence: ["requireAuthenticatedAccess", "userId", "owner_clerk_id", "calculatePersonalAiDeclaration"],
      evidenceScope: "module",
      handlerEvidence: ["requireAuthenticatedAccess"],
    },
  },
  "personal-ai/declarations/[id]": {
    PATCH: {
      expected: "Authenticated owner-only declaration edit or status transition with UUID validation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess plus UUID and owner filters with Clerk RLS",
      evidence: ["requireAuthenticatedAccess", "isPersonalAiId", "owner_clerk_id", ".eq"],
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
