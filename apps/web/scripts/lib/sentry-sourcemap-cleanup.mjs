import { collectFiles, removeFiles } from "./sentry-sourcemap-staging.mjs";

export function cleanupBuildSourceMaps({ staticDir, serverDir }) {
  const sourceMaps = [
    ...collectFiles(staticDir, (file) => file.endsWith(".map")),
    ...collectFiles(serverDir, (file) => file.endsWith(".map")),
  ];
  const failed = removeFiles(sourceMaps);

  return {
    discovered: sourceMaps.length,
    removed: sourceMaps.length - failed.length,
    failed,
  };
}
