#!/usr/bin/env node

import process from "node:process";
import { writeCoverageEvidence } from "./coverage-evidence.mjs";

try {
  writeCoverageEvidence();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
