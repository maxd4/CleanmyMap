import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const actionGuide = "documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md";
const workshopIndex = "documentation/plans/ateliers-sensibilisation/README.md";
const resourceIndex = "documentation/plans/ateliers-sensibilisation/ressources/README.md";

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function localMarkdownLinks(relativePath, content) {
  const links = [];
  for (const match of content.matchAll(/\[[^\]]+\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
    const fileTarget = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    if (!fileTarget) continue;
    links.push({ target, exists: fs.existsSync(path.resolve(repositoryRoot, path.dirname(relativePath), fileTarget)) });
  }
  return links;
}

test("les fiches d'action et les index d'ateliers/ressources n'activent que des liens existants", () => {
  const actionContent = readRepositoryFile(actionGuide);
  const workshops = readRepositoryFile(workshopIndex);
  const resources = readRepositoryFile(resourceIndex);
  const methodLink = "../../../../product/methodologie-carte-actions.md";
  const workshopRows = workshops.split(/\r?\n/).filter((line) => /^\|\s*(?:\[)?(?:0[1-9]|1[0-2])(?:\]|\s)/.test(line));
  const resourceRows = resources.split(/\r?\n/).filter((line) => /^\|\s*R\d{2}\s*\|/.test(line));
  const workshop11 = workshopRows.find((line) => /^\|\s*11\s/.test(line));
  const resource22 = resourceRows.find((line) => /^\|\s*R22\s*\|/.test(line));

  assert.ok(actionContent.includes(`](${methodLink})`));
  assert.ok(fs.existsSync(path.join(repositoryRoot, "documentation/product/methodologie-carte-actions.md")));
  assert.deepEqual(localMarkdownLinks(actionGuide, actionContent).filter((link) => !link.exists), []);
  assert.equal(workshopRows.length, 12);
  assert.equal(workshopRows.filter((line) => line.includes("](")).length, 11);
  assert.ok(workshop11?.includes("prévue, fiche non rédigée"));
  assert.ok(!workshop11?.includes("]("));
  assert.equal(resourceRows.length, 24);
  assert.equal(resourceRows.filter((line) => line.includes("](")).length, 23);
  assert.ok(resource22?.includes("référence prévue, fiche non rédigée"));
  assert.ok(resource22?.includes("Source, accès et droits à vérifier"));
  assert.ok(!resource22?.includes("]("));
  assert.deepEqual(localMarkdownLinks(workshopIndex, workshops).filter((link) => !link.exists), []);
  assert.deepEqual(localMarkdownLinks(resourceIndex, resources).filter((link) => !link.exists), []);
});
