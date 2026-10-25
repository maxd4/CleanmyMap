#!/usr/bin/env node

import process from "node:process";
import { writeCoverageEvidence } from "./coverage-evidence.mjs";
import { writeCoveragePublicationProof } from "../ci/coverage-publication.mjs";

try {
  writeCoverageEvidence();
  writeCoveragePublicationProof({ scope: "web" });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
