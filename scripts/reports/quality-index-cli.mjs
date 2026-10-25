function option(args, name) {
  const prefix = `--${name}=`;
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export async function runQualityFileIndexCli({ args = process.argv.slice(2), generate }) {
  try {
    if (!args.includes("--offline")) throw new Error("Le mode offline exige --offline.");
    const auditedSha = option(args, "sha");
    const runId = option(args, "run-id");
    const previousSha = option(args, "previous-sha");
    const previousRunId = option(args, "previous-run-id");
    if (!auditedSha || !runId) throw new Error("Usage: node scripts/reports/quality-file-index.mjs --offline --sha=<SHA> --run-id=<runId> [--bundle]");
    if ((previousSha && !previousRunId) || (!previousSha && previousRunId)) throw new Error("La comparaison historique exige --previous-sha et --previous-run-id ensemble.");
    const result = await generate({ auditedSha, runId, previousSha, previousRunId, includeBundle: args.includes("--bundle") });
    console.log(`Quality file index généré: ${result.paths.index}`);
    console.log(`Quality domain summary générée: ${result.paths.summary}`);
    if (result.bundle) console.log(`ZIP généré: ${result.bundle.path}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
