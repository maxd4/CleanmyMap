import type {
  PresidentialEnvironmentalClassification,
  PresidentialElectionYear,
  PresidentialFinancialInstrument,
  PresidentialFinancialRecord,
  LocalizedText,
  PresidentialPublicCandidate,
  PresidentialPublicCommitment,
} from "./presidential-environmental-corpus";

export type PresidentialClassificationChartRow = {
  candidateId: string;
  candidateName: LocalizedText;
  favorable: number;
  unfavorable: number;
  mixed: number;
  undetermined: number;
  neutral: number;
};

export type PresidentialFinancialChartRow = {
  candidateId: string;
  candidateName: LocalizedText;
  instrument: PresidentialFinancialInstrument;
  currency: string;
  priceYear: number;
  horizon: string;
  cadence: PresidentialFinancialRecord["cadence"];
  amountMin: number;
  amountMax: number | null;
  recordCount: number;
  sources: Array<{ name: LocalizedText; url: string }>;
};

export type PresidentialChartData = {
  year: PresidentialElectionYear;
  classificationRows: PresidentialClassificationChartRow[];
  financialRows: PresidentialFinancialChartRow[];
  excludedFinancialRecords: number;
};

const classificationKeys: PresidentialEnvironmentalClassification[] = ["favorable", "unfavorable", "mixed", "undetermined", "neutral"];
const financialInstruments: PresidentialFinancialInstrument[] = ["investment", "spending_reduction", "tax_revenue", "other"];

const financialCompatibilityKey = (record: PresidentialFinancialRecord): string => JSON.stringify({ currency: record.currency, priceYear: record.priceYear, horizon: record.horizon, cadence: record.cadence, scope: record.scope.fr });

export function buildPresidentialChartData(commitments: PresidentialPublicCommitment[], candidates: PresidentialPublicCandidate[], year: PresidentialElectionYear): PresidentialChartData {
  const yearCommitments = commitments.filter((commitment) => commitment.electionYear === year);
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const classificationRows = new Map<string, PresidentialClassificationChartRow>();

  for (const commitment of yearCommitments) {
    const candidate = candidatesById.get(commitment.candidateId);
    if (!candidate || !commitment.environmentalAssessment) continue;
    const classification = commitment.environmentalAssessment.overallClassification;
    const row = classificationRows.get(commitment.candidateId) ?? { candidateId: commitment.candidateId, candidateName: candidate.name, favorable: 0, unfavorable: 0, mixed: 0, undetermined: 0, neutral: 0 };
    if (classificationKeys.includes(classification)) row[classification] += 1;
    classificationRows.set(commitment.candidateId, row);
  }

  const financialRows = new Map<string, PresidentialFinancialChartRow>();
  const seenFinancialIds = new Set<string>();
  let excludedFinancialRecords = 0;
  for (const commitment of yearCommitments) {
    const candidate = candidatesById.get(commitment.candidateId);
    if (!candidate) continue;
    for (const record of commitment.financialRecords) {
      if (seenFinancialIds.has(record.id) || record.status !== "announced") {
        excludedFinancialRecords += 1;
        continue;
      }
      seenFinancialIds.add(record.id);
      const key = `${commitment.candidateId}|${record.instrument}|${financialCompatibilityKey(record)}`;
      const existing = financialRows.get(key);
      if (existing) {
        existing.amountMin += record.amountMin;
        existing.amountMax = existing.amountMax === null || record.amountMax === null ? null : existing.amountMax + record.amountMax;
        existing.recordCount += 1;
        if (!existing.sources.some((source) => source.url === record.source.url)) existing.sources.push({ name: record.source.name, url: record.source.url! });
      } else {
        financialRows.set(key, { candidateId: commitment.candidateId, candidateName: candidate.name, instrument: record.instrument, currency: record.currency, priceYear: record.priceYear, horizon: record.horizon.value ?? "unknown", cadence: record.cadence, amountMin: record.amountMin, amountMax: record.amountMax, recordCount: 1, sources: [{ name: record.source.name, url: record.source.url! }] });
      }
    }
  }

  return { year, classificationRows: [...classificationRows.values()].sort((left, right) => left.candidateName.fr.localeCompare(right.candidateName.fr, "fr")), financialRows: [...financialRows.values()].sort((left, right) => left.candidateName.fr.localeCompare(right.candidateName.fr, "fr") || financialInstruments.indexOf(left.instrument) - financialInstruments.indexOf(right.instrument)), excludedFinancialRecords };
}
