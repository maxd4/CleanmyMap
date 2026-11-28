import { realpath, readFile, stat, chmod } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const DESTINATION_MARKER = ".cmm-private-backup-destination";
const DESTINATION_ATTESTATION = "CLEANMYMAP PRIVATE BACKUP DESTINATION";

export async function validatePrivateBackupDestination(inputPath, repositoryRoot) {
  if (typeof inputPath !== "string" || !isAbsolute(inputPath)) {
    throw new Error("An explicit absolute private backup destination is required");
  }
  const [repoRealPath, destinationRealPath] = await Promise.all([
    realpath(repositoryRoot),
    realpath(resolve(inputPath)),
  ]);
  if (!(await stat(destinationRealPath)).isDirectory()) throw new Error("Private backup destination must be a directory");
  const relativePath = relative(repoRealPath, destinationRealPath);
  if (relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..")) {
    throw new Error("Private backup destination must resolve outside the repository");
  }
  const marker = await readFile(resolve(destinationRealPath, DESTINATION_MARKER), "utf8").catch(() => "");
  if (marker.trim() !== DESTINATION_ATTESTATION) {
    throw new Error("Private destination is unverified; provision and attest it before exporting sensitive data");
  }
  await chmod(destinationRealPath, 0o700).catch((error) => {
    if (process.platform !== "win32") throw error;
  });
  return destinationRealPath;
}
