import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  getPresidentialCandidates,
  getPresidentialCommitments,
  getPresidentialElection,
  getValidatedPresidentialCommitments,
  PRESIDENTIAL_ENVIRONMENTAL_CORPUS,
} from "./presidential-environmental-corpus";

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

  it("keeps the source taxonomy and document metadata explicit", () => {
    const sourceTypes = new Set(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.map((election) => election.candidateListSource.type));
    expect(sourceTypes).toEqual(new Set(["SOURCE_PRIMAIRE_ARCHIVEE", "SOURCE_PRIMAIRE_OFFICIELLE", "EN_ATTENTE_DE_PREUVE"]));
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2012)?.candidateListSource.url).toContain("archives-resultats-elections");
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2017)?.candidateListSource.publishedAt).toEqual({ value: "2017-03-23", precision: "day" });

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

  it("preserves the requested work corpus while keeping every measure unverified", () => {
    expect(getPresidentialCommitments(2012)).toHaveLength(5);
    expect(getPresidentialCommitments(2017)).toHaveLength(8);
    expect(getPresidentialCommitments(2022)).toHaveLength(14);
    expect(getPresidentialCommitments(2027)).toEqual([]);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => commitment.documentationStatus === "source_insufficient" && commitment.lastCheckedAt === null)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => !commitment.validation.lastReviewedAt && !commitment.validation.reviewedBy)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => commitment.formulationAttributed.fr.length > 0 && commitment.mechanism.fr.length > 0)).toBe(true);
  });

  it("rejects all preparatory records from publication and never exposes a 2027 measure", () => {
    expect(getValidatedPresidentialCommitments()).toEqual([]);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.every((candidate) => !validateContentRecord(candidate.validation).readyForPublication)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.every((commitment) => !validateContentRecord(commitment.validation).readyForPublication)).toBe(true);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments.some((commitment) => commitment.electionYear === 2027)).toBe(false);
    expect(PRESIDENTIAL_ENVIRONMENTAL_CORPUS.elections.find((election) => election.year === 2027)?.candidateIds).toEqual([]);
  });

  it("does not confuse an absence of collection with an absence of engagement", () => {
    const uncollectedCandidates = PRESIDENTIAL_ENVIRONMENTAL_CORPUS.candidates.filter((candidate) => candidate.documentationStatus === "not_collected");
    expect(uncollectedCandidates.length).toBe(33);
    expect(uncollectedCandidates.some((candidate) => candidate.id === "2022-eric-zemmour")).toBe(true);
    expect(getPresidentialCommitments(2022).some((commitment) => commitment.candidateId === "2022-eric-zemmour")).toBe(false);
  });
});
