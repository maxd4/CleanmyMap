export type ContentStatus = "draft" | "in_review" | "published" | "rejected";

export type ContentKind = "environmental" | "institutional";

export type ContentClaimType = "fact" | "estimate" | "recommendation";

export type ContentEvidenceLevel = "insufficient" | "limited" | "moderate" | "strong";

export type ContentDatePrecision = "day" | "month" | "year" | "unknown";

export type ContentDateBasis = "publication" | "fieldwork" | "document" | "campaign" | "unknown";

export type ContentLocalizedText = {
  fr: string;
  en: string;
};

export type ContentSource = {
  name: string;
  url: string;
  date: string | null;
  datePrecision: ContentDatePrecision;
  dateBasis: ContentDateBasis;
};

export type ContentClaim = {
  id: string;
  type: ContentClaimType;
  text: ContentLocalizedText;
  sourcePages?: number[];
  interpretationLimit?: ContentLocalizedText;
};

export type ContentClaims = Record<ContentClaimType, ContentClaim[]>;

export type ContentValidationRecord = {
  id: string;
  kind: ContentKind;
  status: ContentStatus;
  owner: string;
  source: ContentSource;
  evidenceLevel: ContentEvidenceLevel;
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  claims: ContentClaims;
};

export type ContentValidationIssueSeverity = "error" | "warning";

export type ContentValidationIssue = {
  code:
    | "missing_owner"
    | "missing_source_name"
    | "missing_source_url"
    | "missing_source_date"
    | "invalid_source_date"
    | "missing_evidence_level"
    | "missing_last_review"
    | "missing_reviewer"
    | "missing_claims"
    | "claim_type_mismatch"
    | "insufficient_evidence";
  severity: ContentValidationIssueSeverity;
  message: string;
};

export type ContentValidationResult = {
  readyForPublication: boolean;
  issues: ContentValidationIssue[];
};

const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review"],
  in_review: ["published", "rejected"],
  published: ["in_review"],
  rejected: ["draft"],
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isDateForPrecision(value: string | null, precision: ContentDatePrecision): boolean {
  if (!value || precision === "unknown") {
    return false;
  }

  if (precision === "day") {
    return isIsoDate(value);
  }

  if (precision === "month") {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  }

  return /^\d{4}$/.test(value);
}

function hasValidClaims(record: ContentValidationRecord): boolean {
  return (Object.keys(record.claims) as ContentClaimType[]).every((type) =>
    record.claims[type].every((claim) => claim.type === type && claim.id.trim().length > 0 && claim.text.fr.trim().length > 0 && claim.text.en.trim().length > 0),
  );
}

export function validateContentRecord(record: ContentValidationRecord): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];
  const requiresReview = record.status === "in_review" || record.status === "published";

  if (!record.owner.trim()) {
    issues.push({ code: "missing_owner", severity: "error", message: "Un responsable doit être identifié." });
  }

  if (!record.source.name.trim()) {
    issues.push({ code: "missing_source_name", severity: "error", message: "Le nom de la source est obligatoire." });
  }

  if (!record.source.url.trim()) {
    issues.push({ code: "missing_source_url", severity: "error", message: "Le lien ou chemin de la source est obligatoire." });
  }

  if (!record.source.date || record.source.datePrecision === "unknown") {
    issues.push({ code: "missing_source_date", severity: requiresReview ? "error" : "warning", message: "La date de la source et sa précision doivent être renseignées." });
  } else if (!isDateForPrecision(record.source.date, record.source.datePrecision)) {
    issues.push({ code: "invalid_source_date", severity: "error", message: "La date de la source ne respecte pas la précision déclarée." });
  }

  if (record.evidenceLevel === "insufficient") {
    issues.push({ code: "insufficient_evidence", severity: requiresReview ? "error" : "warning", message: "Le niveau de preuve est insuffisant pour une publication." });
  }

  if (!record.lastReviewedAt || !isIsoDate(record.lastReviewedAt)) {
    issues.push({ code: "missing_last_review", severity: requiresReview ? "error" : "warning", message: "La date de dernière revue doit être une date ISO valide." });
  }

  if (!record.reviewedBy?.trim()) {
    issues.push({ code: "missing_reviewer", severity: requiresReview ? "error" : "warning", message: "Le responsable de la dernière revue doit être identifié." });
  }

  const hasClaims = Object.values(record.claims).some((claims) => claims.length > 0);
  if (!hasClaims) {
    issues.push({ code: "missing_claims", severity: "error", message: "Le contenu doit distinguer au moins une affirmation, estimation ou recommandation." });
  } else if (!hasValidClaims(record)) {
    issues.push({ code: "claim_type_mismatch", severity: "error", message: "Chaque élément doit rester dans le groupe fait, estimation ou recommandation correspondant." });
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  return { readyForPublication: record.status === "published" && !hasErrors, issues };
}

export function canTransitionContentStatus(from: ContentStatus, to: ContentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionContentStatus(record: ContentValidationRecord, nextStatus: ContentStatus): ContentValidationRecord {
  if (!canTransitionContentStatus(record.status, nextStatus)) {
    throw new Error(`Invalid content status transition: ${record.status} -> ${nextStatus}`);
  }

  return { ...record, status: nextStatus };
}

export function assertPublishedContent(record: ContentValidationRecord): void {
  const result = validateContentRecord(record);
  if (!result.readyForPublication) {
    throw new Error(`Content is not ready for publication: ${result.issues.map((issue) => issue.code).join(", ")}`);
  }
}
