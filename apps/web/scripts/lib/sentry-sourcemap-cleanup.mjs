import { collectFiles, removeFiles } from "./sentry-sourcemap-staging.mjs";

export function cleanupBuildSourceMaps({ staticDir, serverDir, remove = removeFiles }) {
  const sourceMaps = [
    ...collectFiles(staticDir, (file) => file.endsWith(".map")),
    ...collectFiles(serverDir, (file) => file.endsWith(".map")),
  ];
  const failed = remove(sourceMaps);
  const remaining = [
    ...collectFiles(staticDir, (file) => file.endsWith(".map")),
    ...collectFiles(serverDir, (file) => file.endsWith(".map")),
  ];

  return {
    discovered: sourceMaps.length,
    removed: sourceMaps.length - failed.length,
    failed,
    remaining,
  };
}
