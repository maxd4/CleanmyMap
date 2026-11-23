import assert from "node:assert/strict";
import test from "node:test";

import { buildUiDensityNotMeasured, buildUiDensityReport, formatUiDensityReport } from "./ui-density.mjs";

const sha = "a".repeat(40);

function repositoryView(entries) {
  return {
    listFiles(prefix) {
      return Object.keys(entries).filter((file) => file.startsWith(`${prefix}/`));
    },
    readText(file) {
      if (!Object.hasOwn(entries, file)) throw new Error(`Missing fixture file: ${file}`);
      return entries[file];
    },
  };
}

function analyze(entries, scope = "all") {
  return buildUiDensityReport({
    root: ".",
    auditedSha: sha,
    scope,
    repositoryViewFactory: () => repositoryView(entries),
  });
}

test("measures JSX text zones, classifies surfaces and keeps conditional copy explicitly unmeasured", () => {
  const report = analyze({
    "apps/web/src/app/(community)/actions/new/page.tsx": `
      export default function Page() {
        return <main><h1>Créer une action</h1><p>Préparez votre matériel avant le rendez-vous.</p><label title="Nom de l’action">Nom</label><button>Continuer</button><p>{getLocalizedInstructions()}</p></main>;
      }
    `,
    "apps/web/src/app/actions/new/page.test.tsx": "export function PageTest() { return <p>fixture</p>; }",
    "apps/mobile/features/actions/action-screen.tsx": "export function ActionScreen() { return <Text accessibilityLabel=\"Démarrer\">Démarrer</Text>; }",
  });

  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
  assert.equal(report.readProvenance, "COMMITTED_SNAPSHOT");
  assert.deepEqual(report.files.map((file) => file.file), [
    "apps/mobile/features/actions/action-screen.tsx",
    "apps/web/src/app/(community)/actions/new/page.tsx",
  ]);
  const page = report.files.find((file) => file.file.includes("/page.tsx")).components[0];
  assert.equal(page.route, "/actions/new");
  assert.equal(page.surface, "transactional");
  assert.ok(page.metrics.byZone["visible-text"].characters > 0);
  assert.ok(page.metrics.byZone.title.characters > 0);
  assert.equal(page.metrics.dynamicOrConditionalLocations, 1);
  assert.match(formatUiDensityReport(report), /proxys du texte statique/);
  assert.match(formatUiDensityReport(report), /Contenus dynamiques ou conditionnels non mesurés/);
});

test("ranks long copy, extensive field help, technical terms and explanations before actions as review signals", () => {
  const longText = "Cette description explique le fonctionnement de la projection et de l&apos;API pour les participants. ".repeat(5);
  const longHelp = "Saisissez les informations qui permettront à l’équipe de préparer correctement cette activité avant le rendez-vous et le départ. ".repeat(2);
  const report = analyze({
    "apps/web/src/app/actions/new/page.tsx": `
      export function Page() {
        return <main>
          <h1>Préparer une action</h1>
          <p>${longText}</p>
          <p>Une seconde explication fournit un autre contexte pour commencer correctement.</p>
          <CmmField helperText="${longHelp}" />
          <CmmButton tone="primary">Enregistrer</CmmButton>
        </main>;
      }
    `,
  });
  const component = report.files[0].components[0];
  const codes = component.signals.map((signal) => signal.code);
  assert.ok(codes.includes("LONG_PARAGRAPH") || codes.includes("VERY_LONG_PARAGRAPH"));
  assert.ok(codes.includes("LONG_FIELD_HELP"));
  assert.ok(codes.includes("EXPLANATION_BEFORE_ACTION"));
  assert.ok(codes.includes("INTERNAL_TERM_VISIBLE"));
  assert.ok(component.signals.every((signal) => Number.isInteger(signal.line)));
  assert.ok(component.signals.find((signal) => signal.code === "LONG_PARAGRAPH" || signal.code === "VERY_LONG_PARAGRAPH")?.excerpt.includes("l'API"));
  assert.equal(component.surface, "transactional");
  assert.ok(component.signals.every((signal) => signal.priority.endsWith("REVIEW")));
  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
});

test("retains safety copy measurements without emitting automatic density penalties", () => {
  const safetyText = `Attention, cette consigne de sécurité est nécessaire avant le départ. ${"Suivez les consignes obligatoires pour limiter les risques. ".repeat(8)}`;
  const report = analyze({
    "apps/web/src/app/actions/new/page.tsx": `export function Page(){ return <main><h1>Collecte</h1><p>${safetyText}</p><button>Continuer</button></main>; }`,
  });
  const component = report.files[0].components[0];
  assert.ok(component.metrics.staticVisibleCharacters > 240);
  assert.equal(component.signals.some((signal) => ["LONG_PARAGRAPH", "VERY_LONG_PARAGRAPH", "HIGH_STATIC_TEXT_VOLUME"].includes(signal.code)), false);
  assert.equal(component.paragraphs[0].protectedContent, true);
});

test("keeps legal, pedagogical and methodological text separate from transactional density signals", () => {
  const longText = "Cette méthode explique les étapes, les limites et la lecture des résultats sans en faire une mesure. ".repeat(6);
  const report = analyze({
    "apps/web/src/app/legal/privacy/page.tsx": `export function LegalPage(){ return <main><h1>Vie privée</h1><p>${longText}</p></main>; }`,
    "apps/web/src/app/learn/guide/page.tsx": `export function GuidePage(){ return <main><h1>Guide</h1><p>${longText}</p></main>; }`,
    "apps/web/src/app/methodologie/page.tsx": `export function MethodPage(){ return <main><h1>Méthodologie</h1><p>${longText}</p></main>; }`,
  });
  assert.deepEqual(report.summary.bySurface, { transactional: 0, pedagogical: 1, methodological: 1, legal: 1, general: 0 });
  assert.equal(report.summary.signals, 0);
});

test("excludes always sr-only copy from visible text while retaining responsive sr-only copy", () => {
  const report = analyze({
    "apps/web/src/app/actions/new/page.tsx": `export function Page(){ return <main>
      <h1>Créer une action</h1>
      <span className="sr-only">Nom accessible du bouton</span>
      <p>Texte visible <span className="sr-only">aide invisible sur toutes les tailles</span> puis la suite visible.</p>
      <span className="sr-only sm:not-sr-only">Texte rendu visible sur écran large.</span>
      <span className={compact ? "sr-only" : "not-sr-only"}>Texte conditionnel selon la taille.</span>
      <button className="sr-only">Commande accessible seulement</button>
    </main>; }`,
  });
  const component = report.files[0].components[0];
  assert.equal(component.metrics.staticVisibleCharacters,
    "Créer une action".length
      + "Texte visible".length
      + "puis la suite visible.".length
      + "Texte rendu visible sur écran large.".length
      + "Texte conditionnel selon la taille.".length);
  assert.equal(component.paragraphs.some((paragraph) => paragraph.excerpt.includes("aide invisible sur toutes les tailles")), false);
  assert.ok(component.metrics.accessibilityOnlyCharacters > 0);
  assert.equal(report.summary.accessibilityOnlyCharacters, component.metrics.accessibilityOnlyCharacters);
});

test("classifies the French privacy policy route as legal", () => {
  const report = analyze({
    "apps/web/src/app/politique-confidentialite/page.tsx": "export function PrivacyPolicy(){ return <main><h1>Confidentialité</h1><p>Informations sur les données personnelles.</p></main>; }",
  });
  assert.equal(report.files[0].components[0].route, "/politique-confidentialite");
  assert.equal(report.files[0].components[0].surface, "legal");
});

test("represents a failed source scan as a measurement failure, not an invented file", () => {
  const report = buildUiDensityNotMeasured({ auditedSha: sha, scope: "web", error: new Error("snapshot unavailable") });
  assert.equal(report.summary.filesInScope, 0);
  assert.equal(report.summary.filesMeasured, 0);
  assert.equal(report.summary.filesNotMeasured, 0);
  assert.equal(report.measurementFailures, 1);
  assert.equal(report.diagnostics[0].file, "(source scan)");
  const markdown = formatUiDensityReport(report);
  assert.match(markdown, /Fichiers mesurés\/non mesurés : \*\*0\/0\*\*/);
  assert.match(markdown, /Échecs de mesure : \*\*1\*\*/);
});

test("reports repeated copy, generic caveats and secondary density without counting accessibility-only labels", () => {
  const repeated = "Cette description détaillée explique les informations utiles avant de commencer votre action locale.";
  const report = analyze({
    "apps/web/src/app/actions/new/page.tsx": `export function Page(){ return <main>
      <h1>Nouvelle action</h1><p>Cette mesure explique le contenu enregistré.</p>
      <p>Veuillez noter que les informations seront visibles après enregistrement.</p>
      <p>Veuillez noter que les informations resteront accessibles depuis votre espace.</p>
      <CmmField description="${repeated}" /><CmmField description="${repeated}" />
      <CmmButton tone="primary">Continuer</CmmButton>
      <Text accessibilityLabel="Ce texte aide les technologies d’assistance, il n’est pas affiché." />
    </main>; }`,
  });
  const component = report.files[0].components[0];
  const codes = component.signals.map((signal) => signal.code);
  assert.ok(codes.includes("REPEATED_DESCRIPTION"));
  assert.ok(codes.includes("REPEATED_GENERIC_CAVEAT"));
  assert.ok(codes.includes("SECONDARY_TEXT_DENSITY"));
  assert.equal(component.metrics.byZone.accessibilityLabel, undefined);
  assert.ok(component.metrics.secondaryToStructuredRatio >= 3);
});

test("does not flag repeated generic caveats on methodological surfaces", () => {
  const report = analyze({
    "apps/web/src/app/methodologie/page.tsx": `export function Method(){ return <main>
      <h1>Méthodologie</h1>
      <p>Veuillez noter que les limites sont décrites ici.</p>
      <p>Veuillez noter que cette méthode ne mesure pas chaque cas.</p>
    </main>; }`,
  });
  assert.equal(report.files[0].components[0].signals.some((signal) => signal.code === "REPEATED_GENERIC_CAVEAT"), false);
});

test("scopes and report ordering are deterministic", () => {
  const entries = {
    "apps/web/src/components/a.tsx": "export function A(){return <p>Info</p>}",
    "apps/mobile/features/b.tsx": "export function B(){return <Text>Info</Text>}",
  };
  const web = analyze(entries, "web");
  const mobile = analyze(entries, "mobile");
  const allOne = analyze(entries, "all");
  const allTwo = analyze(entries, "all");
  assert.deepEqual(web.files.map((file) => file.file), ["apps/web/src/components/a.tsx"]);
  assert.deepEqual(mobile.files.map((file) => file.file), ["apps/mobile/features/b.tsx"]);
  assert.equal(allOne.files.length, 2);
  assert.equal(JSON.stringify(allOne), JSON.stringify(allTwo));
  assert.equal(formatUiDensityReport(allOne), formatUiDensityReport(allTwo));
});

test("syntax errors are reported as NOT_MEASURED without making the audit blocking", () => {
  const report = analyze({ "apps/web/src/broken.tsx": "export function Broken( { <p>incomplete" }, "web");
  assert.equal(report.files[0].status, "NOT_MEASURED");
  assert.equal(report.diagnostics[0].reason, "TYPESCRIPT_PARSE_ERROR");
  assert.equal(report.status, "PASS");
  assert.equal(report.blocking, false);
});
