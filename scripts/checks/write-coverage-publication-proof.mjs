#!/usr/bin/env node

import process from "node:process";
import { writeCoveragePublicationProof } from "../ci/coverage-publication.mjs";

const scope = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length);
if (!scope) {
  console.error("Coverage publication proof requires --scope=web|mobile|node|python.");
  process.exitCode = 1;
} else {
  try {
    writeCoveragePublicationProof({ scope });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
