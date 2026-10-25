#!/usr/bin/env node

import process from "node:process";
import { writeCoverageEvidence } from "./coverage-evidence.mjs";
import { writeCoveragePublicationProof } from "../ci/coverage-publication.mjs";

try {
  const scope = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ?? "web";
  writeCoverageEvidence({ scope });
  writeCoveragePublicationProof({ scope });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
