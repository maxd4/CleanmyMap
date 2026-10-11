import { existsSync, readFileSync } from "node:fs";

import {
  GENERATED_BEGIN,
  GENERATED_END,
  HUMAN_BEGIN,
  HUMAN_END,
  compactSources,
} from "./generate-product-surface-collection.mjs";

function renderSummary(rows, findingsReview, invariantErrors) {
  const statuses = ["PRIMARY_NAV", "SECONDARY_NAV", "DEEP_LINK", "PROTECTED_TOOL", "QA_TOOL", "REDIRECT_COMPAT", "ORPHAN_ROUTE", "OBSOLETE", "UNKNOWN"];
  return [
    "| STATUS | COUNT |",
    "| --- | ---: |",
    ...statuses.map((status) => `| ${status} | ${rows.filter((row) => row.status === status).length} |`),
    `| ROUTES_RUNTIME | ${rows.filter((row) => row.canonicalStatus !== "DOCUMENTATION_ONLY").length} |`,
    `| REVIEW_FINDING | ${findingsReview.length} |`,
    `| INVARIANT_ERROR | ${invariantErrors.length} |`,
  ].join("\n");
}

function renderMainTable(rows) {
  const header = [
    "| ROUTE | STATUS | IN_RIBBON | INBOUND | ACCESS | CANONICAL | RATIONALE |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  return [...header, ...rows.map((row) => `| \`${row.route}\` | ${row.status} | ${row.inRibbon} | ${row.inboundText} | ${row.access} | ${row.canonicalStatus} | ${row.rationale} |`)].join("\n");
}

function renderDetailedTable(rows) {
  const header = [
    "| ROUTE | SOURCE | IN_REGISTRY | IN_SITEMAP | DEEP_LINK_CONSUMERS | INBOUND_REDIRECTS | DYNAMIC_ROUTE | QA_OR_INTERNAL_USAGE | DOCUMENTATION_STATUS | REACHABILITY_STATUS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  return [...header, ...rows.map((row) => `| \`${row.route}\` | \`${row.source}\` | ${row.inRegistry} | ${row.inSitemap} | ${row.deepLinkText} | ${row.redirectText} | ${row.dynamicRoute} | ${row.qaOrInternalUsage} | ${row.documentationStatus} | ${row.reachabilityStatus} |`)].join("\n");
}

function renderRowsSection(title, rows) {
  if (rows.length === 0) return `### ${title}\n\n_Aucune route dans cette catégorie._`;
  return `### ${title}\n\n${rows.map((row) => `- \`${row.route}\` — ${row.status} — ${row.rationale}.`).join("\n")}`;
}

function sanitizeGeneratedText(value) {
  return String(value);
}

function renderRuntimeFindings(findings) {
  if (findings.length === 0) return "Aucun.";
  return findings.map((finding) => `- \`${sanitizeGeneratedText(finding.target)}\` — ${finding.severity} — ${compactSources(finding.items)}.`).join("\n");
}

export function renderProductSurfaceAudit({ report, generatedAt = new Date().toISOString(), humanDecisions = "" }) {
  const { refInfo, rows, findingsReview, invariantErrors } = report;
  const docsOnly = rows.filter((row) => row.canonicalStatus === "DOCUMENTATION_ONLY");
  const runtimeUndocumented = rows.filter((row) => row.canonicalStatus === "RUNTIME_UNDOCUMENTED");
  return `# Audit de surface produit et accessibilité des routes

${GENERATED_BEGIN}
## En-tête

\`AUDIT_REF=${refInfo.resolved}\`
\`AUDIT_GENERATED_AT=${generatedAt}\`
\`AUDIT_STATUS=${refInfo.status}\`

Commande :

\`npm run audit:product-surface -- --ref=${refInfo.requested}\`

Le rapport est généré depuis les routes runtime, la navigation, le registre
de rubriques, l’index pages-site, l’indexabilité SEO, le proxy et le sitemap.
Il ne remplace aucune de ces sources et ne transforme pas l’absence de lien en
décision automatique de suppression.

## Résumé

${renderSummary(rows, findingsReview, invariantErrors)}

## Table principale

${renderMainTable(rows)}

## Routes orphelines candidates

${renderRowsSection("Candidats", rows.filter((row) => row.status === "ORPHAN_ROUTE"))}

## Legacy et redirects à réexaminer

${renderRowsSection("Compatibilités", rows.filter((row) => row.status === "REDIRECT_COMPAT"))}

## Outils internes et QA

${renderRowsSection("Surfaces internes", rows.filter((row) => row.status === "PROTECTED_TOOL" || row.status === "QA_TOOL"))}

## Routes protégées à revoir

${renderRowsSection("Protection sans entrée démontrée", rows.filter((row) => row.qaOrInternalUsage === "PROTECTED_REVIEW"))}

## Deep-links légitimes

${renderRowsSection("Deep-links", rows.filter((row) => row.status === "DEEP_LINK"))}

## Divergences documentation/runtime

${renderRowsSection("Références documentation-only", docsOnly)}

${renderRowsSection("Routes runtime absentes de l’index", runtimeUndocumented)}

### Findings à revoir

${renderRuntimeFindings(findingsReview)}

### Invariants certains

${renderRuntimeFindings(invariantErrors)}

## Graphe détaillé

${renderDetailedTable(rows)}

## Taxonomie et limites

- \`PRIMARY_NAV\` : route visible dans la navigation principale issue du registre.
- \`SECONDARY_NAV\` : consumer runtime utilisateur démontré hors ruban principal.
- \`DEEP_LINK\` : consumer de contexte, email, notification ou workflow démontré.
- \`PROTECTED_TOOL\` : surface interne protégée ; l’absence du ruban n’est pas un finding.
- \`PROTECTED_REVIEW\` : route protégée sans consumer, navigation ou usage interne démontré ; elle reste à revoir humainement.
- \`QA_TOOL\` : preview ou outil de contrôle identifié.
- \`REDIRECT_COMPAT\` : alias/redirect déclaré, dont l’utilité externe reste une décision humaine.
- \`ORPHAN_ROUTE\` : aucun consumer runtime, redirect, deep-link ou usage interne démontré ; candidat d’audit, jamais suppression automatique.
- \`OBSOLETE\` : réservé à une décision humaine confirmée ; le générateur ne l’infère pas.
- \`UNKNOWN\` : preuve insuffisante, notamment pour les routes dynamiques, auth/callback et erreurs.
- \`REVIEW_FINDING\` : cible non résolue statiquement ou attribution insuffisante ; nécessite un audit, sans preuve de casse.
- \`INVARIANT_ERROR\` : lien utilisateur statique vers une route inexistante, registry/runtime incohérent, redirect cassé ou fiche CURRENT réellement absente.

Les URLs dynamiques non résolues restent \`UNKNOWN\`. Les tests, les références
documentaires et les listes de dead-code ne sont pas des consumers runtime.
Les routes d’erreur, auth/callback, exports et pages protégées ne sont pas
classées orphelines uniquement parce qu’elles ne figurent pas dans le ruban.

## Reproductibilité

Régénérer avec \`--ref=HEAD\`. Le mode \`--strict\` bloque seulement les liens
runtime inexistants, les fiches CURRENT sans route, les cibles de redirect
inexistantes et les incohérences certaines du registre. Une décision
\`ORPHAN_ROUTE\`, \`OBSOLETE\` ou de suppression reste hors du garde automatique.
La génération normale est read-only ; utiliser \`--write\` explicitement pour
actualiser ce fichier généré.
${GENERATED_END}
${humanDecisions ? `\n\n${humanDecisions.trim()}` : ""}
`;
}

function readPreservedHumanDecisions(outputPath) {
  if (!existsSync(outputPath)) return "";
  const content = readFileSync(outputPath, "utf8");
  const begin = content.indexOf(HUMAN_BEGIN);
  const end = content.indexOf(HUMAN_END);
  if (begin < 0 || end < begin) return "";
  return content.slice(begin, end + HUMAN_END.length).trim();
}

export { readPreservedHumanDecisions };
