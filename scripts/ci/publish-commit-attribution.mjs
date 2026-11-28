function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function sortedUnique(files = []) {
  return [...new Set(files.map(normalizePath).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en"));
}

function normalizeCommitAttributions(attributedCommits) {
  if (!Array.isArray(attributedCommits)) return new Map();
  const attributions = new Map();
  for (const entry of attributedCommits) {
    if (!entry || typeof entry.commitSha !== "string" || !entry.commitSha.trim() || /\s/.test(entry.commitSha)) {
      throw new Error("PUBLISH_ATTRIBUTION_INVALID: every attribution must identify an exact commit SHA.");
    }
    const files = sortedUnique(entry.files);
    if (files.length === 0) throw new Error(`PUBLISH_ATTRIBUTION_INVALID: commit ${entry.commitSha} has no attributed paths.`);
    const key = entry.commitSha.toLowerCase();
    const existing = attributions.get(key) ?? new Set();
    for (const file of files) existing.add(file);
    attributions.set(key, existing);
  }
  return attributions;
}

export function verifyPublishedCommitAttributions({ remoteSha, candidateSha, attributedCommits, runGitCommand }) {
  const attributions = normalizeCommitAttributions(attributedCommits);
  if (attributions.size === 0) throw new Error("PUBLISH_ATTRIBUTION_REQUIRED: provide explicit attribution for every commit being published.");
  const commitsResult = runGitCommand(["rev-list", "--reverse", `${remoteSha}..${candidateSha}`]);
  if (commitsResult.status !== 0) throw new Error("PUBLISH_ATTRIBUTION_UNVERIFIED: cannot enumerate the commits being published.");
  const seen = new Set();
  for (const commitSha of commitsResult.stdout.split(/\r?\n/).map((sha) => sha.trim()).filter(Boolean)) {
    const key = commitSha.toLowerCase();
    const allowed = attributions.get(key);
    if (!allowed) throw new Error(`PUBLISH_COMMIT_ATTRIBUTION_REQUIRED: commit ${commitSha} has no explicit lot attribution.`);
    seen.add(key);
    const pathsResult = runGitCommand(["diff-tree", "--no-commit-id", "--name-only", "-z", "-m", "-r", "--root", commitSha, "--"]);
    if (pathsResult.status !== 0) throw new Error(`PUBLISH_ATTRIBUTION_UNVERIFIED: cannot inspect paths changed by ${commitSha}.`);
    const changedFiles = sortedUnique(pathsResult.stdout.split("\0"));
    const foreignFiles = changedFiles.filter((file) => !allowed.has(file));
    if (foreignFiles.length > 0) {
      throw new Error(`PUBLISH_FOREIGN_COMMIT_PATHS: commit ${commitSha} contains paths outside its explicitly attributed lots: ${foreignFiles.join(", ")}.`);
    }
  }
  const extra = [...attributions.keys()].filter((sha) => !seen.has(sha));
  if (extra.length > 0) throw new Error(`PUBLISH_ATTRIBUTION_OUTSIDE_RANGE: attribution references commits outside ${remoteSha}..${candidateSha}: ${extra.join(", ")}.`);
}
