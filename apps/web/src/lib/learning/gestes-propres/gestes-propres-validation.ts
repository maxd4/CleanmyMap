import type {
  ContentClaim,
  ContentDateBasis,
  ContentDatePrecision,
  ContentEvidenceLevel,
  ContentKind,
  ContentLocalizedText,
  ContentValidationRecord,
} from "@/lib/content/content-validation";

export const CONTENT_REVIEW_DATE = "2026-08-04";
export const CONTENT_OWNER = "CleanMyMap — équipe éditoriale";
export const CONTENT_REVIEWER = "CleanMyMap — revue éditoriale";

export function createPublishedLearningValidation(params: {
  id: string;
  kind?: ContentKind;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
  sourceDatePrecision: ContentDatePrecision;
  sourceDateBasis: ContentDateBasis;
  evidenceLevel: ContentEvidenceLevel;
  facts: ContentClaim[];
  estimates?: ContentClaim[];
  recommendations: ContentClaim[];
}): ContentValidationRecord {
  return {
    id: params.id,
    kind: params.kind ?? "environmental",
    status: "published",
    owner: CONTENT_OWNER,
    source: {
      name: params.sourceName,
      url: params.sourceUrl,
      date: params.sourceDate,
      datePrecision: params.sourceDatePrecision,
      dateBasis: params.sourceDateBasis,
    },
    evidenceLevel: params.evidenceLevel,
    lastReviewedAt: CONTENT_REVIEW_DATE,
    reviewedBy: CONTENT_REVIEWER,
    claims: {
      fact: params.facts,
      estimate: params.estimates ?? [],
      recommendation: params.recommendations,
    },
  };
}

export function claim(
  id: string,
  type: ContentClaim["type"],
  text: ContentLocalizedText,
  sourcePages?: number[],
  interpretationLimit?: ContentLocalizedText,
): ContentClaim {
  return { id, type, text, sourcePages, interpretationLimit };
}
