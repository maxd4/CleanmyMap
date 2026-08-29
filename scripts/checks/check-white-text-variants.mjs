import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, "apps", "web", "src");
const highOpacityWhiteText = /text-white\/(?:7[0-9]|8[0-9]|9[0-9]|100)(?!\d)/;
const highOpacityBlackText = /text-black\/(?:7[0-9]|8[0-9]|9[0-9]|100)(?!\d)/;

const intentionalUses = [
  ["apps/web/src/components/ui/page-header.tsx", /badge-muted.*text-white\/78/],
  ["apps/web/src/lib/ui/page-families/card-presets.ts", /textMutedOnCard.*text-white\/72/],
  ["apps/web/src/app/(app)/explorer/page.tsx", /mutedText: "text-white\/82"/],
  ["apps/web/src/components/navigation/notification-bell.tsx", /text-white\/(?:70|72|88)/],
  ["apps/web/src/components/pilotage/pilotage-cluster-panels.tsx", /(?:secondary:|detail:|p-3 text-white\/80|leading-relaxed text-white\/72)/],
  ["apps/web/src/components/pilotage/decision-reading-section.tsx", /description: "text-white\/72"/],
  ["apps/web/src/components/account/account-identity-chip.tsx", /(?:line-clamp-1.*text-white\/70|leading-5 text-white\/78)/],
  ["apps/web/src/components/sections/rubriques/climate/climate-components.tsx", /p-4 text-white\/70/],
  ["apps/web/src/components/sections/rubriques/weather-components.tsx", /flex justify-center text-white\/80/],
  ["apps/web/src/components/sections/rubriques/shared.tsx", /hero\.icon : "text-white\/70"/],
  ["apps/web/src/components/navigation/role-primary-actions.tsx", /detailSecondary: "text-white\/78"/],
];

const intentionalBlackUses = [
  ["apps/web/src/components/navigation/app-navigation-tree-menu.tsx", /text-black\/(?:60|70)/],
  ["apps/web/src/components/navigation/app-navigation-block-dropdown.tsx", /text-black\/80/],
  ["apps/web/src/components/navigation/app-navigation-block-dropdown-act.tsx", /text-black\/80/],
  ["apps/web/src/components/navigation/app-navigation-block-dropdown-home.tsx", /text-black\/80/],
  ["apps/web/src/components/navigation/app-navigation-block-dropdown-learn.tsx", /text-black\/80/],
  ["apps/web/src/components/navigation/app-navigation-block-dropdown-network.tsx", /text-black\/80/],
];

function collectFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath));
    } else if (/\.(?:css|ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function isIntentional(relativePath, line) {
  return intentionalUses.some(
    ([file, pattern]) => file === relativePath && pattern.test(line),
  );
}

function isIntentionalBlack(relativePath, line) {
  return intentionalBlackUses.some(
    ([file, pattern]) => file === relativePath && pattern.test(line),
  );
}

const violations = [];
for (const absolutePath of collectFiles(sourceRoot)) {
  const relativePath = path.relative(repoRoot, absolutePath).replaceAll(path.sep, "/");
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    if (highOpacityWhiteText.test(line) && !isIntentional(relativePath, line)) {
      violations.push(`white ${relativePath}:${index + 1}: ${line.trim()}`);
    }
    if (highOpacityBlackText.test(line) && !isIntentionalBlack(relativePath, line)) {
      violations.push(`black ${relativePath}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error("Unexpected high-opacity white/black text variants found:");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("White/black text variant check passed; only documented secondary/icon uses remain.");
}
