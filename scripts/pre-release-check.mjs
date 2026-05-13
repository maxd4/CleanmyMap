import fs from "fs";
import path from "path";

/**
 * Script de vérification pré-déploiement pour CleanMyMap.
 * Objectif : Prévenir l'exposition de secrets et garantir l'hygiène du bundle.
 */

const SECRETS_KEYWORDS = [
  "SECRET_",
  "SERVICE_ROLE",
  "PRIVATE_KEY",
  "SUPABASE_SERVICE_ROLE",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
];

const FORBIDDEN_FILES = [
  ".env.production",
  "service-account.json",
  "secrets.json",
];

function checkSecretsInBuild() {
  console.log("Verification de l'exposition des secrets dans le code client...");

  const clientSrcPath = path.join(process.cwd(), "apps/web/src");
  let issuesFound = 0;
  let scannedFiles = 0;

  function isClientBundleCandidate(filePath, content) {
    const normalized = filePath.replaceAll("\\", "/");
    const isExplicitClientComponent =
      content.startsWith('"use client"') ||
      content.startsWith("'use client'") ||
      content.includes('\n"use client"') ||
      content.includes("\n'use client'");

    const isClientEntryPoint =
      normalized.includes("/src/app/") &&
      (normalized.endsWith("/page.tsx") ||
        normalized.endsWith("/layout.tsx") ||
        normalized.endsWith("/template.tsx"));

    return isExplicitClientComponent || isClientEntryPoint;
  }

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (file !== "node_modules" && file !== ".next" && file !== ".git") {
          scanDir(fullPath);
        }
      } else if (
        file.endsWith(".tsx") ||
        file.endsWith(".ts") ||
        file.endsWith(".js") ||
        file.endsWith(".mjs")
      ) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (!isClientBundleCandidate(fullPath, content)) {
          continue;
        }
        scannedFiles++;
        for (const keyword of SECRETS_KEYWORDS) {
          if (content.includes(keyword) && !fullPath.includes(`${path.sep}api${path.sep}`)) {
            console.warn(
              `[security] Mot-cle "${keyword}" trouve dans un fichier potentiellement client : ${fullPath}`,
            );
            issuesFound++;
          }
        }
      }
    }
  }

  if (!fs.existsSync(clientSrcPath)) {
    console.warn(`[security] Repertoire absent, scan client ignore : ${clientSrcPath}`);
    return 0;
  }

  scanDir(clientSrcPath);
  console.log(`Fichiers client verifies: ${scannedFiles}`);
  if (issuesFound === 0) {
    console.log("OK: aucun secret detecte dans le code client.");
  } else {
    console.error(`ECHEC: ${issuesFound} expositions potentielles detectees dans le code client.`);
  }

  return issuesFound;
}

function checkForbiddenFiles() {
  console.log("Verification de la presence de fichiers interdits...");
  let issuesFound = 0;

  for (const file of FORBIDDEN_FILES) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.warn(`[security] Fichier critique detecte a la racine : ${file}`);
      issuesFound++;
    }
  }

  if (issuesFound === 0) {
    console.log("OK: aucun fichier interdit trouve a la racine.");
  }

  return issuesFound;
}

console.log("--- CLEANMYMAP PRE-RELEASE CHECK ---");
const forbiddenFileIssues = checkForbiddenFiles();
const secretExposureIssues = checkSecretsInBuild();
const totalIssues = forbiddenFileIssues + secretExposureIssues;
console.log(`Resume: ${totalIssues} probleme(s) detecte(s).`);
console.log("--- FIN DU CHECK ---");

if (process.argv.includes("--exit-on-error") && totalIssues > 0) {
  process.exit(1);
}
