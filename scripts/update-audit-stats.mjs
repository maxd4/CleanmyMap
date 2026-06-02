import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'impact_IA.md');

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'out',
  'artifacts',
  'documentation',
  'public',
  '.turbo',
  '.vercel',
  '.cache',
]);

const RASTER_EXTS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif']);
const TEXT_EXT_GROUPS = {
  'TypeScript / React': new Set(['.ts', '.tsx']),
  'SQL / Supabase': new Set(['.sql']),
  'Python / scripts': new Set(['.py', '.mjs', '.js', '.cjs', '.ps1', '.cmd', '.sh', '.bat']),
  'Style / CSS': new Set(['.css']),
};

function formatFr(value) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function isBinary(buffer) {
  const limit = Math.min(buffer.length, 8000);
  for (let i = 0; i < limit; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

function countTextLines(text) {
  if (!text.length) {
    return 0;
  }
  return text.split(/\r?\n/).length;
}

function walkFiles(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        walkFiles(fullPath, visitor);
      }
      continue;
    }
    visitor(fullPath, entry.name);
  }
}

function collectTextStats(dir) {
  const totals = {
    files: 0,
    lines: 0,
    byGroup: new Map(),
  };

  for (const group of Object.keys(TEXT_EXT_GROUPS)) {
    totals.byGroup.set(group, { files: 0, lines: 0 });
  }

  walkFiles(dir, (fullPath, fileName) => {
    const buffer = fs.readFileSync(fullPath);
    if (isBinary(buffer)) {
      return;
    }

    const text = buffer.toString('utf8');
    const lines = countTextLines(text);
    const ext = path.extname(fileName).toLowerCase();

    totals.files += 1;
    totals.lines += lines;

    let matchedGroup = null;
    for (const [groupName, groupExts] of Object.entries(TEXT_EXT_GROUPS)) {
      if (groupExts.has(ext)) {
        matchedGroup = groupName;
        break;
      }
    }

    if (matchedGroup) {
      const bucket = totals.byGroup.get(matchedGroup);
      bucket.files += 1;
      bucket.lines += lines;
    }
  });

  const grouped = {};
  let groupedFiles = 0;
  let groupedLines = 0;

  for (const [groupName, bucket] of totals.byGroup.entries()) {
    grouped[groupName] = { ...bucket };
    groupedFiles += bucket.files;
    groupedLines += bucket.lines;
  }

  grouped.Other = {
    files: totals.files - groupedFiles,
    lines: totals.lines - groupedLines,
  };

  return {
    files: totals.files,
    lines: totals.lines,
    grouped,
  };
}

function collectWebSrcStats(dir) {
  const stats = {
    files: 0,
    lines: 0,
    useClientFiles: 0,
    framerMotionImports: 0,
    swrUsages: 0,
    fetchUsages: 0,
    noStoreUsages: 0,
    revalidateExports: 0,
  };

  walkFiles(dir, (fullPath) => {
    const buffer = fs.readFileSync(fullPath);
    if (isBinary(buffer)) {
      return;
    }

    const text = buffer.toString('utf8');
    stats.files += 1;
    stats.lines += countTextLines(text);

    if (/^\s*['"]use client['"]\s*;?\s*$/m.test(text)) {
      stats.useClientFiles += 1;
    }

    const framerMatches = text.match(/framer-motion/g);
    if (framerMatches) {
      stats.framerMotionImports += framerMatches.length;
    }

    const swrMatches = text.match(/\bswr\b/gi);
    if (swrMatches) {
      stats.swrUsages += swrMatches.length;
    }

    const fetchMatches = text.match(/fetch\s*\(/g);
    if (fetchMatches) {
      stats.fetchUsages += fetchMatches.length;
    }

    const noStoreMatches = text.match(/no-store/g);
    if (noStoreMatches) {
      stats.noStoreUsages += noStoreMatches.length;
    }

    const revalidateMatches = text.match(/export\s+const\s+revalidate\b/g);
    if (revalidateMatches) {
      stats.revalidateExports += revalidateMatches.length;
    }
  });

  return stats;
}

function collectRasterStats(dir) {
  const stats = {
    count: 0,
    byExt: new Map(),
    maxSize: 0,
    maxPath: '',
  };

  for (const ext of RASTER_EXTS) {
    stats.byExt.set(ext, 0);
  }

  walkFiles(dir, (fullPath, fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    if (!RASTER_EXTS.has(ext)) {
      return;
    }

    const size = fs.statSync(fullPath).size;
    stats.count += 1;
    stats.byExt.set(ext, (stats.byExt.get(ext) || 0) + 1);

    if (size > stats.maxSize) {
      stats.maxSize = size;
      stats.maxPath = path.relative(rootDir, fullPath);
    }
  });

  return stats;
}

function collectGitHistory(sinceDate) {
  const commitCount = Number(
    execFileSync('git', ['rev-list', '--count', `--since=${sinceDate}`, 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim(),
  );

  const numstat = execFileSync(
    'git',
    ['log', `--since=${sinceDate}`, '--numstat', '--pretty=tformat:'],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 100,
    },
  );

  let insertions = 0;
  let deletions = 0;

  for (const line of numstat.split(/\r?\n/)) {
    const match = line.match(/^(\d+)\t(\d+)\t/);
    if (!match) {
      continue;
    }

    insertions += Number(match[1]);
    deletions += Number(match[2]);
  }

  return {
    commitCount,
    insertions,
    deletions,
  };
}

function replaceOrFail(input, pattern, replacement, label) {
  if (input.includes(replacement)) {
    return input;
  }

  if (!pattern.test(input)) {
    console.warn(`Warning: no match for ${label}`);
    return input;
  }

  return input.replace(pattern, replacement);
}

const repoStats = collectTextStats(rootDir);
const webSrcStats = collectWebSrcStats(path.join(rootDir, 'apps', 'web', 'src'));
const rasterStats = collectRasterStats(path.join(rootDir, 'apps', 'web', 'public'));
const gitStats = collectGitHistory('2026-02-20');

const projectStart = new Date('2026-02-20T00:00:00+01:00');
const reportEnd = new Date('2026-05-16T00:00:00+02:00');
const weeks = (reportEnd - projectStart) / (7 * 24 * 60 * 60 * 1000);
const weeksRounded = weeks.toFixed(1).replace('.', ',');
const devHours = 100;
const writeHours = 20;
const devHoursPerWeek = (devHours / weeks).toFixed(1).replace('.', ',');
const kwhPerWeek = (100 / weeks).toFixed(1).replace('.', ',');
const kgPerWeek = (20 / weeks).toFixed(1).replace('.', ',');
const litersPerWeek = (100 / weeks).toFixed(1).replace('.', ',');
const publicImageCountText = `${rasterStats.byExt.get('.png') || 0} PNG publics et ${rasterStats.byExt.get('.webp') || 0} WebP public`;
const maxRasterKo = Math.round(rasterStats.maxSize / 1024);

let report = fs.readFileSync(reportFile, 'utf8');

report = replaceOrFail(
  report,
  /Le dépôt fournit une photographie du projet à (?:une date donnée|l'instant du relevé)\. Il contient \*\*[\d\s\u202f]+\s*fichiers source\*\* et \*\*[\d\s\u202f]+\s*lignes source\*\* hors dépendances, builds, documentation, fichiers publics et lockfiles\./,
  `Le dépôt fournit une photographie du projet à l'instant du relevé. Il contient **${formatFr(repoStats.files)} fichiers source** et **${formatFr(repoStats.lines)} lignes source** hors dépendances, builds, documentation, fichiers publics et lockfiles.`,
  'repo snapshot sentence',
);

report = replaceOrFail(
  report,
  /\| Métrique \| Valeur \(Photographie au 13\/05\/2026\) \|/,
  '| Métrique | Valeur (Photographie du dépôt) |',
  'repo table header',
);

report = replaceOrFail(
  report,
  /\| \*\*Fichiers source \(filtrés\)\*\* \| \*\*[\d\s\u202f]+\*\* \|/,
  `| **Fichiers source (filtrés)** | **${formatFr(repoStats.files)}** |`,
  'repo file count row',
);

report = replaceOrFail(
  report,
  /\| \*\*Lignes source totales\*\* \| \*\*[\d\s\u202f]+\*\* \|/,
  `| **Lignes source totales** | **${formatFr(repoStats.lines)}** |`,
  'repo line count row',
);

report = replaceOrFail(
  report,
  /\| TypeScript \/ React \(\.ts, \.tsx\) \| ~?[\d\s\u202f]+ \|/,
  `| TypeScript / React (.ts, .tsx) | ${formatFr(repoStats.grouped['TypeScript / React'].lines)} |`,
  'repo ts/react row',
);

report = replaceOrFail(
  report,
  /\| SQL \/ Supabase \(\.sql\) \| ~?[\d\s\u202f]+ \|/,
  `| SQL / Supabase (.sql) | ${formatFr(repoStats.grouped['SQL / Supabase'].lines)} |`,
  'repo sql row',
);

report = replaceOrFail(
  report,
  /\| Python \/ Scripts \(\.py, \.mjs\) \| ~?[\d\s\u202f]+ \|/,
  `| Python / Scripts (.py, .mjs) | ${formatFr(repoStats.grouped['Python / scripts'].lines)} |`,
  'repo python row',
);

report = replaceOrFail(
  report,
  /\| Style \/ CSS \(\.css\) \| ~?[\d\s\u202f]+ \|/,
  `| Style / CSS (.css) | ${formatFr(repoStats.grouped['Style / CSS'].lines)} |`,
  'repo css row',
);

report = replaceOrFail(
  report,
  /\| Autres \(Markdown, JSON, etc\.\) \| ~?[\d\s\u202f]+ \|/,
  `| Autres (Markdown, JSON, etc.) | ${formatFr(repoStats.grouped.Other.lines)} |`,
  'repo other row',
);

report = replaceOrFail(
  report,
  /\| Commits (?:\(20 fév\. → 13 mai 2026\)|depuis le début du projet) \| [\d\s\u202f]+ \|/,
  `| Commits depuis le début du projet | ${formatFr(gitStats.commitCount)} |`,
  'git commit count row',
);

report = replaceOrFail(
  report,
  /\| Insertions totales \| [\d\s\u202f]+ lignes \|/,
  `| Insertions totales | ${formatFr(gitStats.insertions)} lignes |`,
  'git insertions row',
);

report = replaceOrFail(
  report,
  /\| Suppressions totales \| [\d\s\u202f]+ lignes \|/,
  `| Suppressions totales | ${formatFr(gitStats.deletions)} lignes |`,
  'git deletions row',
);

report = replaceOrFail(
  report,
  /Le projet a été créé le 20 février 2026 et la période active retenue s'étend(?: jusqu'au 13 mai 2026| jusqu'au 16 mai 2026, soit environ \*\*12,1 semaines\*\*\. Sur cette base, l'hypothèse de travail retient environ \*\*100 h\*\* de développement assisté par IA, auxquelles s'ajoutent environ \*\*20 h\*\* de rédaction, restructuration et intégration documentaire\. Cela correspond à environ \*\*8,2 h\/semaine\*\* pour la seule partie assistée par IA et à un impact total estimé de \*\*100 kWh\*\*, \*\*20 kgCO2e\*\* et \*\*100 L d'eau\*\*, soit environ \*\*8,2 kWh\*\*, \*\*1,6 kgCO2e\*\* et \*\*8,2 L par semaine\*\* sur l'intervalle retenu\.)?[^.]*?servent à cadrer la suite du raisonnement\./,
  `Le projet a été créé le 20 février 2026 et la période active retenue s'étend jusqu'au 16 mai 2026, soit environ **${weeksRounded} semaines**. Sur cette base, l'hypothèse de travail retient environ **${devHours} h** de développement assisté par IA, auxquelles s'ajoutent environ **${writeHours} h** de rédaction, restructuration et intégration documentaire. Cela correspond à environ **${devHoursPerWeek} h/semaine** pour la seule partie assistée par IA et à un impact total estimé de **100 kWh**, **20 kgCO2e** et **100 L d'eau**, soit environ **${kwhPerWeek} kWh**, **${kgPerWeek} kgCO2e** et **${litersPerWeek} L par semaine** sur l'intervalle retenu. Ces chiffres ne décrivent pas une productivité universelle : ils servent à cadrer la suite du raisonnement.`,
  'project duration sentence',
);

report = replaceOrFail(
  report,
  /Le projet comptabilise à l'heure actuelle(?: \(16 mai 2026\))? environ \*\*100 h estimées de développement assisté par IA\*\* pour environ \*\*[\d\s\u202f]+ lignes de code\*\* applicatif figées, incluant de nombreux refactors et l'usage majoritaire de modèles légers complétés par des modèles plus lourds pour les tâches complexes\./,
  `Le projet comptabilise à l'heure actuelle environ **${devHours} h estimées de développement assisté par IA** pour environ **${formatFr(webSrcStats.lines)} lignes de code** applicatif figées, incluant de nombreux refactors et l'usage majoritaire de modèles légers complétés par des modèles plus lourds pour les tâches complexes.`,
  'current development volume sentence',
);

report = replaceOrFail(
  report,
  /Cette section identifie les principaux postes de consommation numérique, énergétique et computationnelle visibles dans (?:le dépôt au 13 mai 2026|l'état courant du dépôt)\./,
  "Cette section identifie les principaux postes de consommation numérique, énergétique et computationnelle visibles dans l'état courant du dépôt.",
  'technical section intro',
);

report = replaceOrFail(
  report,
  /Repères locaux utilisés : application Next\.js\/React dans `apps\/web` avec [\d\s\u202f]+ fichiers sources dans `apps\/web\/src`, 55 fichiers de routes API, [\d\s\u202f]+ fichiers déclarés comme composants ou modules client, [\d\s\u202f]+ imports de `framer-motion`, [\d\s\u202f]+ usages de SWR, [\d\s\u202f]+ occurrences de `fetch\(` dans `apps\/web\/src`, [\d\s\u202f]+ occurrences de `no-store`, [\d\s\u202f]+ exports `revalidate`, 5 PNG publics et 1 WebP public jusqu'à environ [\d\s\u202f]+ Ko, Leaflet et Leaflet Draw présents, analytics PostHog\/Vercel\/Sentry conditionnées par consentement ou configuration\./,
  `Repères locaux utilisés : application Next.js/React dans \`apps/web\` avec ${formatFr(webSrcStats.files)} fichiers sources dans \`apps/web/src\`, 55 fichiers de routes API, ${formatFr(webSrcStats.useClientFiles)} fichiers déclarés comme composants ou modules client, ${formatFr(webSrcStats.framerMotionImports)} imports de \`framer-motion\`, ${formatFr(webSrcStats.swrUsages)} usages de SWR, ${formatFr(webSrcStats.fetchUsages)} occurrences de \`fetch(\` dans \`apps/web/src\`, ${formatFr(webSrcStats.noStoreUsages)} occurrences de \`no-store\`, ${formatFr(webSrcStats.revalidateExports)} exports \`revalidate\`, ${publicImageCountText} jusqu'à environ ${maxRasterKo} Ko, Leaflet et Leaflet Draw présents, analytics PostHog/Vercel/Sentry conditionnées par consentement ou configuration.`,
  'local reps sentence',
);

report = replaceOrFail(
  report,
  /Confiance : élevée, car 252 fichiers contiennent `use client` \./,
  `Confiance : élevée, car ${formatFr(webSrcStats.useClientFiles)} fichiers contiennent \`use client\`.`,
  'use client confidence sentence',
);

report = replaceOrFail(
  report,
  /Mécanisme : 25 occurrences de `no-store` empêchent la réutilisation de réponses\./,
  `Mécanisme : ${formatFr(webSrcStats.noStoreUsages)} occurrences de \`no-store\` empêchent la réutilisation de réponses.`,
  'no-store mechanism sentence',
);

report = replaceOrFail(
  report,
  /Les assets publics visibles sont raisonnables en nombre\.[^\n]*?Le coût principal futur vient surtout des photos terrain uploadées vers Supabase Storage\./,
  `Les assets publics visibles sont raisonnables en nombre. **Optimisation réalisée (Mai 2026)** : le logo principal ( \`logo-cleanmymap.webp\` ) a été converti de PNG (511 Ko) en WebP (58 Ko), soit une réduction de **88%** . Cependant, plusieurs PNG de documentation restent lourds : environ ${maxRasterKo} Ko, 615 Ko, 590 Ko, 499 Ko et 162 Ko. Le coût principal futur vient surtout des photos terrain uploadées vers Supabase Storage.`,
  'public assets sentence',
);

fs.writeFileSync(reportFile, report, 'utf8');

console.log(
  JSON.stringify(
    {
      repo: repoStats,
      webSrc: webSrcStats,
      raster: {
        count: rasterStats.count,
        png: rasterStats.byExt.get('.png') || 0,
        webp: rasterStats.byExt.get('.webp') || 0,
        maxSizeBytes: rasterStats.maxSize,
        maxSizeKo: maxRasterKo,
      },
      git: gitStats,
      weeks: {
        value: weeks,
        rounded: weeksRounded,
      },
    },
    null,
    2,
  ),
);
