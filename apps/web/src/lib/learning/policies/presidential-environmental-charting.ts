import type {
  LocalizedText,
  PresidentialEnvironmentalClassification,
  PresidentialElectionYear,
  PresidentialFinancialEstimateMethod,
  PresidentialFinancialInstrument,
  PresidentialFinancialRecord,
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

export type PresidentialFinancialChartSource = {
  name: LocalizedText;
  url: string;
  page: number | null;
  version: string;
};

export type PresidentialFinancialDivergentSource = PresidentialFinancialChartSource & {
  amountMin: number;
  amountMax: number | null;
};

export type PresidentialFinancialChartRow = {
  candidateId: string;
  candidateName: LocalizedText;
  instrument: PresidentialFinancialInstrument;
  currency: string;
  priceYear: number;
  horizon: string;
  cadence: PresidentialFinancialRecord["cadence"];
  scope: LocalizedText;
  status: PresidentialFinancialRecord["status"];
  isEstimate: boolean;
  amountMin: number;
  amountMax: number | null;
  recordCount: number;
  aggregationKeys: string[];
  sources: PresidentialFinancialChartSource[];
  divergentSources: PresidentialFinancialDivergentSource[];
  budgetReductionBaselines: LocalizedText[];
  estimateMethods: PresidentialFinancialEstimateMethod[];
};

export type PresidentialFinancialExclusionCounts = {
  notAnnounced: number;
  duplicateEnvelope: number;
};

export type PresidentialChartData = {
  year: PresidentialElectionYear;
  classificationRows: PresidentialClassificationChartRow[];
  financialRows: PresidentialFinancialChartRow[];
  excludedFinancialRecords: number;
  financialExclusions: PresidentialFinancialExclusionCounts;
  nonAggregatedFinancialRecords: number;
};

const classificationKeys: PresidentialEnvironmentalClassification[] = ["favorable", "unfavorable", "mixed", "undetermined", "neutral"];
const financialInstruments: PresidentialFinancialInstrument[] = ["investment", "spending_reduction", "tax_revenue", "other"];

const normalizeAggregationKey = (value: string): string => value.trim();

const financialCompatibilityKey = (record: PresidentialFinancialRecord): string => JSON.stringify({ currency: record.currency, priceYear: record.priceYear, horizon: { value: record.horizon.value, precision: record.horizon.precision }, cadence: record.cadence, scope: { fr: record.scope.fr, en: record.scope.en }, status: record.status, isEstimate: record.isEstimate });

const addSource = (row: PresidentialFinancialChartRow, record: PresidentialFinancialRecord) => {
  if (!row.sources.some((source) => source.url === record.source.url && source.page === record.source.page && source.version === record.source.version)) row.sources.push({ name: record.source.name, url: record.source.url!, page: record.source.page, version: record.source.version });
  if (record.budgetReductionBaseline && !row.budgetReductionBaselines.some((baseline) => baseline.fr === record.budgetReductionBaseline!.fr && baseline.en === record.budgetReductionBaseline!.en)) row.budgetReductionBaselines.push(record.budgetReductionBaseline);
};

const addDivergentSource = (row: PresidentialFinancialChartRow, record: PresidentialFinancialRecord) => {
  if (!row.divergentSources.some((source) => source.url === record.source.url && source.page === record.source.page && source.version === record.source.version && source.amountMin === record.amountMin && source.amountMax === record.amountMax)) row.divergentSources.push({ name: record.source.name, url: record.source.url!, page: record.source.page, version: record.source.version, amountMin: record.amountMin, amountMax: record.amountMax });
};

const corroboratesEnvelope = (row: PresidentialFinancialChartRow, record: PresidentialFinancialRecord) => row.amountMin === record.amountMin && row.amountMax === record.amountMax;

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
  const seenEnvelopeRows = new Map<string, PresidentialFinancialChartRow>();
  const financialExclusions: PresidentialFinancialExclusionCounts = { notAnnounced: 0, duplicateEnvelope: 0 };
  let nonAggregatedFinancialRecords = 0;
  for (const commitment of yearCommitments) {
    const candidate = candidatesById.get(commitment.candidateId);
    if (!candidate) continue;
    for (const record of commitment.financialRecords) {
      if (record.status !== "announced") {
        financialExclusions.notAnnounced += 1;
        continue;
      }
      const scopedRecordId = `${commitment.candidateId}|${commitment.id}|${record.id}`;
      if (seenFinancialIds.has(scopedRecordId)) {
        financialExclusions.duplicateEnvelope += 1;
        continue;
      }
      seenFinancialIds.add(scopedRecordId);
      const compatibilityKey = `${commitment.candidateId}|${record.instrument}|${financialCompatibilityKey(record)}`;
      const normalizedAggregationKey = normalizeAggregationKey(record.aggregationKey);
      const envelopeKey = `${compatibilityKey}|${normalizedAggregationKey}`;
      const existingEnvelopeRow = seenEnvelopeRows.get(envelopeKey);
      if (existingEnvelopeRow) {
        financialExclusions.duplicateEnvelope += 1;
        if (corroboratesEnvelope(existingEnvelopeRow, record)) addSource(existingEnvelopeRow, record);
        else addDivergentSource(existingEnvelopeRow, record);
        continue;
      }
      const aggregationKey = record.aggregationMode === "exclusive" ? `${compatibilityKey}|exclusive|${normalizedAggregationKey}` : `${compatibilityKey}|additive`;
      const existing = financialRows.get(aggregationKey);
      if (existing) {
        existing.amountMin += record.amountMin;
        existing.amountMax = existing.amountMax === null || record.amountMax === null ? null : existing.amountMax + record.amountMax;
        existing.recordCount += 1;
        existing.aggregationKeys.push(normalizedAggregationKey);
        addSource(existing, record);
        if (record.estimateMethod) existing.estimateMethods.push(record.estimateMethod);
        seenEnvelopeRows.set(envelopeKey, existing);
      } else {
        const row = { candidateId: commitment.candidateId, candidateName: candidate.name, instrument: record.instrument, currency: record.currency, priceYear: record.priceYear, horizon: record.horizon.value ?? "unknown", cadence: record.cadence, scope: record.scope, status: record.status, isEstimate: record.isEstimate, amountMin: record.amountMin, amountMax: record.amountMax, recordCount: 1, aggregationKeys: [normalizedAggregationKey], sources: [{ name: record.source.name, url: record.source.url!, page: record.source.page, version: record.source.version }], divergentSources: [], budgetReductionBaselines: record.budgetReductionBaseline ? [record.budgetReductionBaseline] : [], estimateMethods: record.estimateMethod ? [record.estimateMethod] : [] };
        financialRows.set(aggregationKey, row);
        seenEnvelopeRows.set(envelopeKey, row);
      }
      if (record.aggregationMode === "exclusive") nonAggregatedFinancialRecords += 1;
    }
  }

  return { year, classificationRows: [...classificationRows.values()].sort((left, right) => left.candidateName.fr.localeCompare(right.candidateName.fr, "fr")), financialRows: [...financialRows.values()].sort((left, right) => left.candidateName.fr.localeCompare(right.candidateName.fr, "fr") || financialInstruments.indexOf(left.instrument) - financialInstruments.indexOf(right.instrument) || left.currency.localeCompare(right.currency) || left.priceYear - right.priceYear || left.horizon.localeCompare(right.horizon) || left.scope.fr.localeCompare(right.scope.fr) || Number(left.isEstimate) - Number(right.isEstimate)), excludedFinancialRecords: financialExclusions.notAnnounced + financialExclusions.duplicateEnvelope, financialExclusions, nonAggregatedFinancialRecords };
}
