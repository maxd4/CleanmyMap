import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  filterPresidentialCommitments,
  getPresidentialCandidates,
  getPresidentialCommitments,
  getPresidentialElection,
  getPublicPresidentialArchive,
  getValidatedPresidentialCommitments,
  PRESIDENTIAL_ENVIRONMENTAL_DOMAINS,
  PRESIDENTIAL_ENVIRONMENTAL_CORPUS,
  type PresidentialEnvironmentalAssessment,
  type PresidentialEnvironmentalClassification,
  sortPresidentialCommitments,
} from "./presidential-environmental-corpus";
import { groupPresidentialCommitmentsByClassification } from "./presidential-environmental-filtering";

const reviewedAssessment = (source: (typeof PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments)[number]["source"], overallClassification: PresidentialEnvironmentalAssessment["overallClassification"] = "undetermined"): PresidentialEnvironmentalAssessment => {
  const primarySource = { ...source, type: "SOURCE_PRIMAIRE_OFFICIELLE" as const, status: "verified" as const, url: "https://example.test/primary", documentNature: "proposal" as const, version: "PRIMARY-REVIEWED-1" };
  const domainAssessment = {
    classification: overallClassification,
    source: primarySource,
    justification: { fr: "Les éléments disponibles ne permettent pas de conclure.", en: "The available evidence does not support a conclusion." },
    mechanism: { fr: "Mécanisme à préciser.", en: "Mechanism to be specified." },
    hypotheses: { fr: "Hypothèses explicitées dans la revue.", en: "Assumptions are stated in the review." },
    limitations: { fr: "Portée limitée aux éléments contrôlés.", en: "Scope is limited to the checked evidence." },
    uncertainties: { fr: "Incertitude conservée et révisable.", en: "Uncertainty is retained and revisable." },
    evidenceLevel: "limited" as const,
  };
  return {
    overallClassification,
    intent: { fr: "Intention du programme documentée.", en: "Documented programme intent." },
    expectedEffect: { fr: "Effet attendu non déterminé.", en: "Expected effect is undetermined." },
    observedEffect: null,
    reviewedAt: "2026-11-13",
    reviewedBy: "Human editor",
    domains: Object.fromEntries(PRESIDENTIAL_ENVIRONMENTAL_DOMAINS.map((domain) => [domain, domainAssessment])),
  } as PresidentialEnvironmentalAssessment;
};

describe("presidential environmental preparation corpus", () => {
  it("keeps the official candidate perimeter separate by election and party", () => {
    expect(getPresidentialCandidates(2012)).toHaveLength(10);
    expect(getPresidentialCandidates(2017)).toHaveLength(11);
    expect(getPresidentialCandidates(2022)).toHaveLength(12);
    expect(getPresidentialCandidates(2027)).toEqual([]);
    expect(getPresidentialElection(2027)?.candidateListStatus).toBe("not_published");
    expect(getPresidentialElection(2027)?.candidateListSource.url).toBeNull();
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.every((candidate) => candidate.status === "official" && candidate.name.fr !== candidate.partyOrCoalition)).toBe(true);

    const candidateIds = PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.map((candidate) => candidate.id);
    const commitmentIds = PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.map((commitment) => commitment.id);
    const candidatesById = new Map(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.map((candidate) => [candidate.id, candidate]));
    expect(new Set(candidateIds).size).toBe(candidateIds.length);
    expect(new Set(commitmentIds).size).toBe(commitmentIds.length);
    expect(new Set([...candidateIds, ...commitmentIds]).size).toBe(candidateIds.length + commitmentIds.length);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => candidatesById.get(commitment.candidateId)?.electionYear === commitment.electionYear)).toBe(true);
  });

  it("keeps historical party names tied to each election year", () => {
    expect(getPresidentialCandidates(2012).find((candidate) => candidate.id === "2012-nicolas-dupont-aignan")?.partyOrCoalition).toBe("Debout la République");
    expect(getPresidentialCandidates(2017).find((candidate) => candidate.id === "2017-nicolas-dupont-aignan")?.partyOrCoalition).toBe("Debout la France");
    expect(getPresidentialCandidates(2022).find((candidate) => candidate.id === "2022-nicolas-dupont-aignan")?.partyOrCoalition).toBe("Debout la France");
  });

  it("identifies the elected candidate and mandate period from official results", () => {
    expect(getPresidentialElection(2012)).toMatchObject({
      electedCandidateId: "2012-francois-hollande",
      secondRoundDate: { value: "2012-05-06", precision: "day" },
      mandate: { start: { value: "2012", precision: "year" }, end: { value: "2017", precision: "year" }, status: "completed" },
    });
    expect(getPresidentialElection(2012)?.resultSource?.documentNature).toBe("election_result");
    expect(getPresidentialElection(2012)?.resultSource?.url).toContain("PR2012/FE.php");

    expect(getPresidentialElection(2017)).toMatchObject({
      electedCandidateId: "2017-emmanuel-macron",
      secondRoundDate: { value: "2017-05-07", precision: "day" },
      mandate: { start: { value: "2017", precision: "year" }, end: { value: "2022", precision: "year" }, status: "completed" },
    });
    expect(getPresidentialElection(2017)?.resultSource?.url).toContain("presidentielle-2017/FE.php");

    expect(getPresidentialElection(2022)).toMatchObject({
      electedCandidateId: "2022-emmanuel-macron",
      secondRoundDate: { value: "2022-04-24", precision: "day" },
      mandate: { start: { value: "2022", precision: "year" }, end: { value: "2027", precision: "year" }, status: "ongoing" },
    });
    expect(getPresidentialElection(2022)?.resultSource?.url).toContain("presidentielle-2022/FE.php");

    expect(getPresidentialElection(2027)).toMatchObject({ electedCandidateId: null, secondRoundDate: null, mandate: null, resultSource: null });
  });

  it("matches the official 2012 and 2017 candidate rosters", () => {
    expect(getPresidentialCandidates(2012).map((candidate) => candidate.name.fr)).toEqual(expect.arrayContaining([
      "Nathalie Arthaud", "François Bayrou", "Jacques Cheminade", "Nicolas Dupont-Aignan", "Eva Joly",
      "Marine Le Pen", "Jean-Luc Mélenchon", "Philippe Poutou", "Nicolas Sarkozy", "François Hollande",
    ]));
    expect(getPresidentialCandidates(2017).map((candidate) => candidate.name.fr)).toEqual(expect.arrayContaining([
      "Nicolas Dupont-Aignan", "Marine Le Pen", "Emmanuel Macron", "Benoît Hamon", "Nathalie Arthaud",
      "Philippe Poutou", "Jacques Cheminade", "Jean Lassalle", "Jean-Luc Mélenchon", "François Asselineau", "François Fillon",
    ]));
  });

  it("keeps the source taxonomy and document metadata explicit", () => {
    const sourceTypes = new Set(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.map((election) => election.candidateListSource.type));
    expect(sourceTypes).toEqual(new Set(["SOURCE_PRIMAIRE_ARCHIVEE", "SOURCE_PRIMAIRE_OFFICIELLE", "EN_ATTENTE_DE_PREUVE"]));
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2012)?.candidateListSource.url).toContain("archives-resultats-elections");
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2017)?.candidateListSource.publishedAt).toEqual({ value: "2017-03-23", precision: "day" });
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2022)?.candidateListSource.url).toBe("https://www.cnccep.fr/candidats.html");

    for (const commitment of PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments) {
      expect(commitment.source.documentNature).toBeDefined();
      expect(commitment.source.version).toBeTruthy();
      expect(commitment.source.publishedAt.precision).toBeDefined();
      expect(commitment.deadline.precision).toBeDefined();
      expect(commitment.history.length).toBeGreaterThan(0);
      expect(commitment.versions.length).toBeGreaterThan(0);
      expect(commitment.history.every((entry) => entry.sourceVersion === commitment.source.version)).toBe(true);
    }
  });

  it("records the seven CNCCEP 2022 source families with page-level provenance", () => {
    const commitments2022 = getPresidentialCommitments(2022);
    expect(commitments2022).toHaveLength(16);
    expect(commitments2022.every((commitment) => commitment.source.type === "SOURCE_PRIMAIRE_OFFICIELLE")).toBe(true);
    expect(commitments2022.every((commitment) => commitment.source.status === "verified" && commitment.source.checkedAt === "2026-11-13")).toBe(true);
    expect(commitments2022.every((commitment) => commitment.documentationStatus === "draft" && commitment.lastCheckedAt === null && !commitment.validation.lastReviewedAt && !commitment.validation.reviewedBy)).toBe(true);
    expect(new Set(commitments2022.map((commitment) => commitment.source.url)).size).toBe(7);
    expect(commitments2022.every((commitment) => commitment.source.url?.startsWith("https://www.cnccep.fr/pdfs/Candidat-") && commitment.source.page !== null)).toBe(true);
    expect(commitments2022.find((commitment) => commitment.id === "2022-jean-luc-melenchon-renewables")?.deadline).toEqual({ value: "2050", precision: "year" });
    expect(commitments2022.find((commitment) => commitment.id === "2022-anne-hidalgo-renewables")?.deadline).toEqual({ value: null, precision: "unknown" });
    expect(commitments2022.find((commitment) => commitment.id === "2022-fabien-roussel-renovation")?.limitations[0].fr).toContain("fréquence annuelle");
  });

  it("keeps a duration separate from an unknown calendar deadline", () => {
    const evaJoly = getPresidentialCommitments(2012).find((commitment) => commitment.id === "2012-eva-joly-nuclear-exit");

    expect(evaJoly?.deadline).toEqual({ value: null, precision: "unknown" });
    expect(evaJoly?.announcedUnits).toBe("durée annoncée : 20 ans");
  });

  it("keeps B1 source origins distinct from the election year", () => {
    const hollande = getPresidentialCommitments(2012).filter((commitment) => commitment.candidateId === "2012-francois-hollande");
    expect(hollande.every((commitment) => commitment.source.type === "SOURCE_SECONDAIRE")).toBe(true);
    expect(hollande.every((commitment) => commitment.source.version === "LEPARISIEN-2012-01-26")).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.find((commitment) => commitment.id === "2012-nicolas-sarkozy-fessenheim")?.source.type).toBe("DISCOURS_OFFICIEL");

    const melenchon = PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.find((commitment) => commitment.id === "2017-jean-luc-melenchon-green-rule");
    expect(melenchon?.source.type).toBe("PRIMARY_PARTY_PROGRAM");
    expect(melenchon?.source.publishedAt).toEqual({ value: "2016-10-18", precision: "day" });
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.find((commitment) => commitment.id === "2017-marine-le-pen-wind-moratorium")?.source.type).toBe("PRIMARY_ARCHIVED");
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.find((commitment) => commitment.id === "2017-emmanuel-macron-electricity-mix")?.source.type).toBe("SOURCE_SECONDAIRE");
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.find((commitment) => commitment.id === "2017-emmanuel-macron-electricity-mix")?.source.publishedAt).toEqual({ value: "2017-03-20", precision: "day" });
  });

  it("filters the same environmental taxonomy by election year and theme", () => {
    const filtered = filterPresidentialCommitments(getPresidentialCommitments(), { year: 2017, theme: "Énergie", locale: "fr" });
    expect(filtered.length).toBe(3);
    expect(filtered.every((commitment) => commitment.electionYear === 2017 && commitment.theme.fr === "Énergie")).toBe(true);
    expect(filterPresidentialCommitments(getPresidentialCommitments(), { year: 2012, theme: "Énergie", locale: "fr" })).toHaveLength(2);
    expect(filterPresidentialCommitments(getPresidentialCommitments(), { year: "all", theme: "all", locale: "fr" })).toHaveLength(29);
    expect(filterPresidentialCommitments(getPresidentialCommitments(), { year: 2022, theme: "Énergie", candidateId: "2022-emmanuel-macron", locale: "fr" })).toHaveLength(1);
    expect(filterPresidentialCommitments(getPresidentialCommitments(), { year: 2022, theme: "all", documentationStatus: "draft", locale: "fr" })).toHaveLength(16);
  });

  it("keeps comparison views deterministic and ID-equivalent", () => {
    const commitments = getPresidentialCommitments(2022);
    const byTheme = sortPresidentialCommitments(commitments, "theme", "fr");
    const byCandidate = sortPresidentialCommitments(commitments, "candidate", "fr");

    expect(byTheme.map((commitment) => commitment.id).sort()).toEqual(byCandidate.map((commitment) => commitment.id).sort());
    expect(new Set(byTheme.map((commitment) => commitment.id)).size).toBe(commitments.length);
    expect(byTheme[0].theme.fr.localeCompare(byTheme[1].theme.fr, "fr")).toBeLessThanOrEqual(0);
    expect(byCandidate[0].candidateName.fr.localeCompare(byCandidate[1].candidateName.fr, "fr")).toBeLessThanOrEqual(0);
  });

  it("preserves the requested work corpus while keeping every measure unverified", () => {
    expect(getPresidentialCommitments(2012)).toHaveLength(5);
    expect(getPresidentialCommitments(2017)).toHaveLength(8);
    expect(getPresidentialCommitments(2022)).toHaveLength(16);
    expect(getPresidentialCommitments(2027)).toEqual([]);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => ["source_insufficient", "draft"].includes(commitment.documentationStatus) && commitment.lastCheckedAt === null)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => commitment.followUpStatus === "not_documented")).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => !commitment.validation.lastReviewedAt && !commitment.validation.reviewedBy)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => commitment.environmentalAssessment === null)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => commitment.formulationAttributed.fr.length > 0 && commitment.mechanism.fr.length > 0)).toBe(true);
  });

  it("rejects all preparatory records from publication and never exposes a 2027 measure", () => {
    expect(getValidatedPresidentialCommitments()).toEqual([]);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.every((candidate) => !validateContentRecord(candidate.validation).readyForPublication)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => !validateContentRecord(commitment.validation).readyForPublication)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.some((commitment) => commitment.electionYear === 2027)).toBe(false);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2027)?.candidateIds).toEqual([]);
  });

  it("rejects malformed calendar deadlines from the validated projection", () => {
    const sourceCommitment = getPresidentialCommitments(2022).find((commitment) => commitment.id === "2022-jean-luc-melenchon-renewables")!;
    const publicationCandidate = {
      ...sourceCommitment,
      environmentalAssessment: reviewedAssessment(sourceCommitment.source),
      documentationStatus: "validated" as const,
      source: { ...sourceCommitment.source, status: "verified" as const, url: "https://example.test/source", publishedAt: { value: "2022-04-01", precision: "day" as const } },
      lastCheckedAt: "2026-11-13",
      validation: { ...sourceCommitment.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor", source: { ...sourceCommitment.validation.source, url: "https://example.test/source", date: "2022-04-01", datePrecision: "day" as const } },
    };
    const validCorpus = { ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS, commitments: [publicationCandidate] };

    expect(getValidatedPresidentialCommitments(validCorpus)).toHaveLength(1);
    const publicArchive = getPublicPresidentialArchive(validCorpus);
    expect(publicArchive.validatedCommitments).toHaveLength(1);
    expect(publicArchive.validatedCommitments[0]).not.toHaveProperty("validation");
    expect(publicArchive.candidates.every((candidate) => !Object.hasOwn(candidate, "validation"))).toBe(true);
    for (const deadline of [
      { value: "20", precision: "year" as const },
      { value: "2022-13", precision: "month" as const },
      { value: "2022-02-30", precision: "day" as const },
      { value: "2022", precision: "unknown" as const },
      { value: null, precision: "year" as const },
    ]) {
      expect(getValidatedPresidentialCommitments({ ...validCorpus, commitments: [{ ...publicationCandidate, deadline }] })).toEqual([]);
    }
  });

  it("requires a reviewed primary-backed environmental assessment for every displayed classification", () => {
    const sourceCommitment = getPresidentialCommitments(2022).find((commitment) => commitment.id === "2022-jean-luc-melenchon-renewables")!;
    const makePublished = (classification: PresidentialEnvironmentalAssessment["overallClassification"], suffix: string) => ({
      ...sourceCommitment,
      id: `${sourceCommitment.id}-${suffix}`,
      deduplicationKey: `${sourceCommitment.id}-${suffix}`,
      documentationStatus: "validated" as const,
      source: { ...sourceCommitment.source, status: "verified" as const, url: "https://example.test/commitment", publishedAt: { value: "2022-04-01", precision: "day" as const } },
      environmentalAssessment: reviewedAssessment(sourceCommitment.source, classification),
      lastCheckedAt: "2026-11-13",
      validation: { ...sourceCommitment.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor", source: { ...sourceCommitment.validation.source, url: "https://example.test/commitment", date: "2022-04-01", datePrecision: "day" as const } },
    });

    for (const classification of ["favorable", "unfavorable", "mixed", "neutral", "undetermined"] as const) {
      const published = getValidatedPresidentialCommitments({ ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS, commitments: [makePublished(classification, classification)] });
      expect(published).toHaveLength(1);
      expect(published[0].environmentalAssessment?.overallClassification).toBe(classification);
    }

    const mixed = makePublished("mixed", "mixed");
    const grouped = groupPresidentialCommitmentsByClassification([mixed as typeof sourceCommitment]);
    expect(grouped.mixed).toHaveLength(1);
    expect(grouped.favorable).toHaveLength(0);
    expect(grouped.unfavorable).toHaveLength(0);

    const missingPrimarySource = reviewedAssessment(sourceCommitment.source, "favorable");
    missingPrimarySource.domains.climate = { ...missingPrimarySource.domains.climate!, source: { ...missingPrimarySource.domains.climate!.source, url: null } };
    expect(getValidatedPresidentialCommitments({ ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS, commitments: [{ ...makePublished("favorable", "missing-source"), environmentalAssessment: missingPrimarySource }] })).toEqual([]);

    const duplicate = makePublished("neutral", "duplicate");
    expect(getValidatedPresidentialCommitments({ ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS, commitments: [duplicate, { ...duplicate, id: `${duplicate.id}-copy` }] })).toEqual([]);

    const invalidClassification = makePublished("favorable", "invalid-classification");
    expect(getValidatedPresidentialCommitments({ ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS, commitments: [{ ...invalidClassification, environmentalAssessment: { ...invalidClassification.environmentalAssessment!, overallClassification: "not-a-category" as PresidentialEnvironmentalClassification } }] })).toEqual([]);
  });

  it("does not confuse an absence of collection with an absence of engagement", () => {
    const uncollectedCandidates = PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.filter((candidate) => candidate.documentationStatus === "not_collected");
    expect(uncollectedCandidates.length).toBe(26);
    expect(getPresidentialCandidates(2022).filter((candidate) => candidate.documentationStatus === "not_collected")).toHaveLength(5);
    expect(getPresidentialCandidates(2022).filter((candidate) => candidate.documentationStatus === "draft")).toHaveLength(7);
    expect(uncollectedCandidates.some((candidate) => candidate.id === "2022-eric-zemmour")).toBe(true);
    expect(getPresidentialCommitments(2022).some((commitment) => commitment.candidateId === "2022-eric-zemmour")).toBe(false);
  });
});
