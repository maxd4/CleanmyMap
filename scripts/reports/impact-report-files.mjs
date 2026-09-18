import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const reportsDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(reportsDirectory, '../..');
export const impactReportDirectory = path.join(
  repositoryRoot,
  'documentation',
  'plans',
  'rapport_impact',
);

export const impactReportMaster = 'documentation/plans/rapport_impact/impact_IA.md';

const partEntries = [
  ['part-i', 'documentation/plans/rapport_impact/impact_IA/01-cadre-perimetre-methodologie.md'],
  ['part-ii-index', 'documentation/plans/rapport_impact/impact_IA/02-empreinte-environnementale-materielle.md'],
  ['part-ii-a', 'documentation/plans/rapport_impact/impact_IA/02a-empreinte-environnementale-cleanmymap.md'],
  ['part-ii-b', 'documentation/plans/rapport_impact/impact_IA/02b-ia-data-centers-materiel-acv.md'],
  ['part-iii', 'documentation/plans/rapport_impact/impact_IA/03-impacts-sociaux-humains-informationnels.md'],
  ['part-iv', 'documentation/plans/rapport_impact/impact_IA/04-pouvoir-infrastructures-souverainete.md'],
  ['part-v', 'documentation/plans/rapport_impact/impact_IA/05-risques-techniques-securite-controle.md'],
  ['part-vi', 'documentation/plans/rapport_impact/impact_IA/06-utilite-reelle-cleanmymap.md'],
  ['part-vii', 'documentation/plans/rapport_impact/impact_IA/07-sobriete-fonctionnelle-iur.md'],
  ['part-viii', 'documentation/plans/rapport_impact/impact_IA/08-dette-numerique-effets-rebond-durabilite.md'],
  ['part-ix', 'documentation/plans/rapport_impact/impact_IA/09-plan-reduction-impacts.md'],
  ['part-x', 'documentation/plans/rapport_impact/impact_IA/10-sobriete-numerique-site.md'],
  ['part-xi', 'documentation/plans/rapport_impact/impact_IA/11-audit-technique-sobriete.md'],
  ['part-xii', 'documentation/plans/rapport_impact/impact_IA/12-apports-ia-enseignements-du.md'],
  ['part-xiii', 'documentation/plans/rapport_impact/impact_IA/13-conclusion-institutionnelle.md'],
];

const faqEntry = ['faq', 'documentation/plans/rapport_impact/impact_IA/00-faq-questions-jury.md'];

const annexEntries = [
  ['annex-a', 'documentation/plans/rapport_impact/impact_IA/annexes/A-dependances-scenarios-rupture.md'],
  ['annex-b', 'documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md'],
  ['annex-c', 'documentation/plans/rapport_impact/impact_IA/annexes/C-avancees-scientifiques-ia.md'],
  ['annex-d', 'documentation/plans/rapport_impact/impact_IA/annexes/D-preuves-internes-suivi.md'],
];

const byKey = (entries) => Object.fromEntries(entries.map(([key, relativePath]) => [key, relativePath]));

export const impactReportParts = Object.freeze(byKey(partEntries));
export const impactReportFaq = faqEntry[1];
export const impactReportAnnexes = Object.freeze(byKey(annexEntries));

export const impactReportAssemblyEntries = Object.freeze([
  ['part-i', impactReportParts['part-i']],
  faqEntry,
  ['part-ii-index', impactReportParts['part-ii-index']],
  ['part-ii-a', impactReportParts['part-ii-a']],
  ['part-ii-b', impactReportParts['part-ii-b']],
  ...partEntries.filter(([key]) => /^part-(iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii)$/.test(key)),
  ...annexEntries,
]);

export const impactReportDocuments = Object.freeze([
  ['master', impactReportMaster],
  ...partEntries,
  faqEntry,
  ...annexEntries,
]);

export function absoluteReportPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

export function readImpactReportDocuments() {
  return impactReportDocuments.map(([key, relativePath]) => ({
    key,
    relativePath,
    absolutePath: absoluteReportPath(relativePath),
    text: fs.readFileSync(absoluteReportPath(relativePath), 'utf8'),
  }));
}

export function readImpactReportAssemblyEntries() {
  return impactReportAssemblyEntries.map(([key, relativePath]) => ({
    key,
    relativePath,
    absolutePath: absoluteReportPath(relativePath),
    text: fs.readFileSync(absoluteReportPath(relativePath), 'utf8'),
  }));
}
