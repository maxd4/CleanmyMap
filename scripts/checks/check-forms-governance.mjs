import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const primitivePath = path.join(
  repositoryRoot,
  "apps/web/src/components/ui/cmm-field.tsx",
);

// These are the files migrated by Forms & Controls. Checkbox/radio/file inputs
// remain native by design; all other input/select/textarea controls use Cmm*.
const migratedFiles = [
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.identity-fields.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.identity-section.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.location-section.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.main-fields.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.sections.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.summary-section.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.vision-fields.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.waste-section.tsx",
  "apps/web/src/components/reports/admin-workflow/step-confirm.tsx",
].map((file) => path.join(repositoryRoot, file));

const violations = [];
const directUtility = /(?:^|[\s"'`])(?:bg|border|rounded|p|px|py|shadow|ring|outline|focus|transition|duration|gap|h|min-h|max-h|w|min-w|max-w|translate|scale|blur|opacity)-[\w/[.:%-]+/;
const directStyle = /(?:style\s*=|\b(?:background(?:Color)?|border(?:Color|Radius|Width)?|boxShadow|outline|padding(?:Block|Inline|Left|Right|Top|Bottom)?)\s*:)/;

function relativePath(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath(filePath)}: required canonical file is missing`);
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function extractOpeningTags(source, tagName) {
  const matches = [];
  const pattern = new RegExp(`<${tagName}\\b[\\s\\S]*?\\/?\\s*>`, "g");
  for (const match of source.matchAll(pattern)) matches.push(match[0]);
  return matches;
}

const primitiveSource = readRequired(primitivePath);
if (primitiveSource) {
  if (!primitiveSource.includes('"cmm-field-control"')) {
    violations.push(`${relativePath(primitivePath)}: missing canonical control class`);
  }
  if (directUtility.test(primitiveSource) || directStyle.test(primitiveSource)) {
    violations.push(
      `${relativePath(primitivePath)}: direct surface/geometry/focus recipes must stay in globals.css`,
    );
  }
}

for (const filePath of migratedFiles) {
  const source = readRequired(filePath);
  if (!source) continue;

  if (!source.includes("@/components/ui/cmm-field")) {
    violations.push(`${relativePath(filePath)}: migrated file must use cmm-field primitives`);
  }

  for (const tagName of ["input", "select", "textarea"]) {
    for (const tag of extractOpeningTags(source, tagName)) {
      if (tagName === "input" && /\btype\s*=\s*["'](?:checkbox|radio|file)["']/.test(tag)) {
        continue;
      }
      violations.push(
        `${relativePath(filePath)}: native ${tagName} is not allowed for a migrated standard control; use Cmm${tagName === "input" ? "Input" : tagName === "select" ? "Select" : "Textarea"}`,
      );
    }
  }

  for (const component of ["CmmInput", "CmmSelect", "CmmTextarea"]) {
    for (const tag of extractOpeningTags(source, component)) {
      if (directUtility.test(tag) || directStyle.test(tag)) {
        violations.push(
          `${relativePath(filePath)}: ${component} cannot receive direct surface/geometry/focus recipes`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Forms & Controls governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Forms & Controls governance check passed: canonical field primitives and migrated controls are protected.");
}
