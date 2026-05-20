import assert from "node:assert/strict";
import {
  assertGoogleSheetUrl,
  buildGoogleSheetCsvCandidates,
} from "./google-sheet-source.mjs";

assert.throws(
  () => assertGoogleSheetUrl("https://example.com/export.csv"),
  /Only https:\/\/docs\.google\.com\/spreadsheets\/d\/<sheetId>\/\.\.\. URLs are allowed/,
);

assert.deepEqual(
  buildGoogleSheetCsvCandidates(
    "https://docs.google.com/spreadsheets/d/abc123/edit?gid=42",
  ),
  [
    "https://docs.google.com/spreadsheets/d/abc123/edit?gid=42",
    "https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=42",
    "https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&gid=42",
  ],
);

assert.deepEqual(
  buildGoogleSheetCsvCandidates("http://docs.google.com/spreadsheets/d/abc123/edit"),
  [],
);

console.log("google-sheet-source validation passed");
