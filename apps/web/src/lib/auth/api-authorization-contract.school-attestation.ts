export const schoolAttestationAuthorizationContract = {
  "actions/[actionId]/school-attestation": {
    GET: {
      expected: "Publicly readable bounded school-action attestation only for a published, visible, public, completed and confirmed action",
      dimensions: ["public-safe"],
      actual: "UUID validation + handler-level lifecycle/publicity guard + canonical organizer resolution + isEligibleForSchoolActionRecognition + buildSchoolActionAttestation; response excludes student identity, notes, quiz results and photos",
      evidence: [
        "loadActionById",
        "loadCanonicalActionOrganizerIdsForAction",
        "isEligibleForSchoolActionRecognition",
        "buildSchoolActionAttestation",
        "access_mode",
        "moderation_visibility",
      ],
      evidenceScope: "method",
    },
  },
} as const;
