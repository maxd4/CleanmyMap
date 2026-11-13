import type {
  PresidentialCommitmentDocumentationStatus,
  PresidentialComparisonView,
  PresidentialPublicCommitment,
  PresidentialElectionYear,
} from "./presidential-environmental-corpus";
import type { LocalizedText } from "./environmental-policy-registry";

export function filterPresidentialCommitments(
  commitments: PresidentialPublicCommitment[],
  filters: { year: PresidentialElectionYear | "all"; theme: string; candidateId?: string; documentationStatus?: PresidentialCommitmentDocumentationStatus | "all"; locale: keyof LocalizedText },
): PresidentialPublicCommitment[] {
  return commitments.filter((commitmentRecord) => {
    const matchesYear = filters.year === "all" || commitmentRecord.electionYear === filters.year;
    const matchesTheme = filters.theme === "all" || commitmentRecord.theme[filters.locale] === filters.theme;
    const matchesCandidate = !filters.candidateId || commitmentRecord.candidateId === filters.candidateId;
    const matchesDocumentation = !filters.documentationStatus || filters.documentationStatus === "all" || commitmentRecord.documentationStatus === filters.documentationStatus;
    return matchesYear && matchesTheme && matchesCandidate && matchesDocumentation;
  });
}

export function sortPresidentialCommitments(
  commitments: PresidentialPublicCommitment[],
  view: PresidentialComparisonView,
  locale: keyof LocalizedText,
): PresidentialPublicCommitment[] {
  return [...commitments].sort((left, right) => {
    const leftPrimary = view === "theme" ? left.theme[locale] : left.candidateName[locale];
    const rightPrimary = view === "theme" ? right.theme[locale] : right.candidateName[locale];
    return leftPrimary.localeCompare(rightPrimary, locale) || left.candidateName[locale].localeCompare(right.candidateName[locale], locale) || left.id.localeCompare(right.id);
  });
}
