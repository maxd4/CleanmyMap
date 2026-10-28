#!/usr/bin/env node

import process from "node:process";
import { resolveCoverageCandidate, writeCoveragePublicationProof } from "../ci/coverage-publication.mjs";
import { assertCoverageCandidateIdentity } from "../ci/validation-evidence.mjs";

const scope = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length);
if (!scope) {
  console.error("Coverage publication proof requires --scope=web|mobile|node|python.");
  process.exitCode = 1;
} else {
  try {
    if (process.argv.includes("--verify-only")) {
      const repositoryRoot = process.cwd();
      const candidate = resolveCoverageCandidate({ repositoryRoot });
      const identity = assertCoverageCandidateIdentity({
        repositoryRoot,
        candidateSha: candidate.candidateSha,
        candidateScope: candidate.candidateScope,
        scope,
      });
      console.log(`COVERAGE_CANDIDATE_IDENTITY: ${identity.verified ? "PASS" : "DIAGNOSTIC_WORKTREE_LIVE"} (${scope})`);
    } else {
      writeCoveragePublicationProof({ scope });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
