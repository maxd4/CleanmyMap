import path from "node:path";

import { createQualityProjectionPaths, writeNewFile } from "../audits/quality-audit-storage.mjs";
import { createQualityIndexZip, qualityIndexZipEntryNames } from "./quality-index-zip.mjs";

export function writeQualityIndexOutputs({ run, index, markdown, root, auditedSha, runId, includeBundle, fsApi }) {
  const paths = createQualityProjectionPaths({ root, auditedHead: auditedSha, runId });
  fsApi.mkdirSync(paths.shaRoot, { recursive: true });
  writeNewFile(paths.index, `${JSON.stringify(index, null, 2)}\n`, fsApi);
  writeNewFile(paths.summary, markdown, fsApi);
  if (!includeBundle) return { paths, bundle: null };

  const originalEntries = run.sourceFiles.map((filePath) => ({
    name: path.relative(run.shaRoot, filePath).replaceAll("\\", "/"),
    data: fsApi.readFileSync(filePath),
  }));
  const entries = [
    ...originalEntries,
    { name: path.relative(run.shaRoot, paths.index).replaceAll("\\", "/"), data: fsApi.readFileSync(paths.index) },
    { name: path.relative(run.shaRoot, paths.summary).replaceAll("\\", "/"), data: fsApi.readFileSync(paths.summary) },
  ].sort((left, right) => left.name.localeCompare(right.name));
  const zip = createQualityIndexZip(entries);
  const names = qualityIndexZipEntryNames(zip);
  const expected = entries.map((entry) => entry.name);
  if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error("ZIP incomplet ou ordre des chemins incohérent.");
  writeNewFile(paths.bundle, zip, fsApi);
  return { paths, bundle: { path: paths.bundle, entries: expected, bytes: zip.length } };
}
