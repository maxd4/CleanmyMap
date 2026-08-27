import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import os from "node:os";
import path from "node:path";

import {
  ACTIVE_DOCS,
  CANONICAL_PATHS,
  auditStackDocDrift,
} from "./check-stack-doc-drift.mjs";

const FOCUSED_ACTIVE_DOCS = [
  "AGENTS.md",
  "README.md",
  "documentation/architecture/README.md",
  "documentation/architecture/data-governance.md",
  "documentation/architecture/adr/ADR-005-next-canary-policy.md",
  "documentation/operations/data-import/README.md",
  "documentation/operations/data-import/pipeline-import.md",
  "documentation/development/api-standard.md",
  "documentation/pages_site/INDEX.md",
  ".agents/skills/cleanmymap-repo/SKILL.md",
  ".codex/skills/cleanmymap-repo/SKILL.md",
];

const indexContent = `
| \`/missions/[id]\` | Missions | protected | agir | route |
| \`/methodologie\` | Méthodologie | public-visible | red | route |

\/missions/[id] reste une route dynamique ; [id] est un segment paramétré.
`;

const dataContractContent = `
public.actions est la table canonique des actions.
public.trash_spotter_spots est la cible des nouveaux spot et clean_place.
public.spots est une archive legacy read-only ; aucune écriture runtime ne doit la cibler.
`;

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-stack-drift-"));
  writeFile(root, "apps/web/package.json", JSON.stringify({
    dependencies: { next: "16.3.1" },
    devDependencies: { typescript: "^7" },
  }));
  writeFile(root, "apps/web/src/lib/ui/page-families/families/registry.ts", `
export const METHODOLOGIE_FAMILY = {
  backdropToneKey: "red",
  hero: darkHero("red"),
  card: CARTO_IMPACT_RED_CARD,
};
export const OTHER_FAMILY = {};
`);
  writeFile(root, "apps/web/src/lib/auth/protected-routes.ts", 'export const PROTECTED_ROUTE_PATTERNS = ["/missions(.*)"];\n');
  writeFile(root, "scripts/checks/check-agent-skill-mirrors.mjs", "export {};\n");
  fs.mkdirSync(path.join(root, "apps", "web", "supabase", "migrations"), { recursive: true });

  const content = {
    "AGENTS.md": "Next.js 16; TypeScript 7; active rules.",
    "README.md": '<img src="https://img.shields.io/badge/Next.js-16-black" /><img src="https://img.shields.io/badge/TypeScript-7-blue" />\nNext.js 16; TypeScript 7.\n',
    "documentation/architecture/README.md": "Policy stable by default; historical canary context only.",
    "documentation/architecture/data-governance.md": dataContractContent,
    "documentation/architecture/adr/ADR-005-next-canary-policy.md": "Historical context: next: 16.3.0-canary.79. Stable by default is accepted.",
    "documentation/operations/data-import/README.md": dataContractContent,
    "documentation/operations/data-import/pipeline-import.md": dataContractContent,
    "documentation/development/api-standard.md": "API contracts by route.",
    "documentation/pages_site/INDEX.md": indexContent,
    ".agents/skills/cleanmymap-repo/SKILL.md": "Next.js 16; TypeScript 7.",
    ".codex/skills/cleanmymap-repo/SKILL.md": "Next.js 16; TypeScript 7.",
  };
  for (const relativePath of FOCUSED_ACTIVE_DOCS) {
    writeFile(root, relativePath, content[relativePath]);
  }
  return root;
}

function options() {
  return { activeDocs: FOCUSED_ACTIVE_DOCS, canonicalPaths: CANONICAL_PATHS };
}

function findingsFor(fixture) {
  return auditStackDocDrift(fixture, options());
}

describe("stack and documentation drift governance", () => {
  it("accepts the current stack, red methodology, protected mission and legacy data contract", () => {
    const fixture = createFixture();
    try {
      assert.deepEqual(findingsFor(fixture), []);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("allows historical canary context in ADR-005", () => {
    const fixture = createFixture();
    try {
      assert.deepEqual(findingsFor(fixture).filter((finding) => finding.file === "documentation/architecture/adr/ADR-005-next-canary-policy.md"), []);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects TypeScript 6 in active documentation", () => {
    const fixture = createFixture();
    writeFile(fixture, "README.md", "TypeScript 6\n");
    try {
      assert.ok(findingsFor(fixture).some((finding) => finding.message.includes("TypeScript major 6")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a current Next canary assertion outside ADR-005", () => {
    const fixture = createFixture();
    writeFile(fixture, "documentation/architecture/README.md", "Next.js canary is the current default.\n");
    try {
      assert.ok(findingsFor(fixture).some((finding) => finding.message.includes("canary is presented as current/default")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects public.spots as a runtime write target", () => {
    const fixture = createFixture();
    writeFile(fixture, "documentation/operations/data-import/pipeline-import.md", `${dataContractContent}\nRuntime import target: public.spots.\n`);
    try {
      assert.ok(findingsFor(fixture).some((finding) => finding.message.includes("runtime/import write target")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects sky methodology and dynamic as the mission access value", () => {
    const fixture = createFixture();
    writeFile(fixture, "documentation/pages_site/INDEX.md", indexContent.replace("| red |", "| sky |").replace("| protected |", "| dynamic |"));
    try {
      const findings = findingsFor(fixture);
      assert.ok(findings.some((finding) => finding.message.includes("/methodologie") && finding.message.includes("red")));
      assert.ok(findings.some((finding) => finding.message.includes("dynamic route shape")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a missing canonical structural path", () => {
    const fixture = createFixture();
    fs.rmSync(path.join(fixture, "documentation", "development", "api-standard.md"));
    try {
      assert.ok(findingsFor(fixture).some((finding) => finding.file === "documentation/development/api-standard.md" && finding.message.includes("canonical structural source is missing")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("keeps the active scope explicit instead of scanning historical documents globally", () => {
    assert.ok(ACTIVE_DOCS.includes("documentation/architecture/adr/ADR-005-next-canary-policy.md"));
    assert.ok(!ACTIVE_DOCS.includes("documentation/operations/messaging-supabase-nextjs.md"));
  });
});
