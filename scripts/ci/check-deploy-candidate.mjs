#!/usr/bin/env node

import { printDeployCandidateResult, resolveDeployCandidate } from "./deploy-validation.mjs";

const baseArgument = process.argv.find((arg) => arg.startsWith("--base-ref="));
const shaArgument = process.argv.find((arg) => arg.startsWith("--sha="));
const result = resolveDeployCandidate({
  repositoryRoot: process.cwd(),
  baseRef: baseArgument?.slice("--base-ref=".length) || "origin/main",
  candidateSha: shaArgument?.slice("--sha=".length),
});

process.exitCode = printDeployCandidateResult(result) ? 0 : 1;
