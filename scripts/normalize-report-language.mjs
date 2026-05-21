import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'impact_IA.md');

const replacements = [
  [/\bworkflows?\b/gi, 'flux de travail'],
  [/\bdashboards?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'tableaux de bord' : 'tableau de bord')],
  [/\bfrontend\b/gi, 'interface client'],
  [/\bbackend\b/gi, 'serveur'],
  [/\bbuilds?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'compilations' : 'compilation')],
  [/\bpreviews?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'aperçus' : 'aperçu')],
  [/\bdebug\b/gi, 'débogage'],
  [/\bprompts?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'instructions' : 'instruction')],
  [/\bopen source\b/gi, 'source ouverte'],
  [/\blegacy\b/gi, 'héritage'],
  [/\banalytics\b/gi, 'mesure d’audience'],
  [/\bfeatures?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'fonctionnalités' : 'fonctionnalité')],
  [/\bsampling\b/gi, 'échantillonnage'],
  [/\block-in\b/gi, 'enfermement propriétaire'],
  [/\bbundle analyzer\b/gi, 'analyseur de paquets'],
  [/\btree-shaking\b/gi, 'élagage des importations inutiles'],
  [/\btokens?\b/gi, (m) => (m.toLowerCase().endsWith('s') ? 'jetons' : 'jeton')],
  [/\bLLM\b/g, 'modèle de langage'],
  [/\bLLMs\b/g, 'modèles de langage'],
  [/\bSaaS\b/g, 'logiciel en tant que service'],
];

function protectInlineCode(line) {
  const placeholders = [];
  const protectedLine = line.replace(/`[^`]*`/g, (match) => {
    const token = `@@CODE_${placeholders.length}@@`;
    placeholders.push(match);
    return token;
  });

  return {
    protectedLine,
    restore(value) {
      return placeholders.reduce((acc, match, index) => acc.replaceAll(`@@CODE_${index}@@`, match), value);
    },
  };
}

function applyReplacements(text) {
  let output = text;
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  output = output.replace(/\bCommits depuis le début du projet\b/g, 'Validations Git depuis le début du projet');
  output = output.replace(/\bCommit(s)?\b/g, (m) => (m.toLowerCase().endsWith('s') ? 'validations Git' : 'validation Git'));
  output = output.replace(/AI-driven Bloat/g, 'gonflement induit par l’IA');
  output = output.replace(/fonctionnalité creep/g, 'dérive fonctionnelle');
  output = output.replace(/jailbreak progressif/g, 'contournement progressif des garde-fous');
  output = output.replace(/jailbreak/g, 'contournement des garde-fous');
  output = output.replace(/### mesure d’audience, notifications et bruit numérique/g, '### Mesures d’audience, notifications et bruit numérique');
  output = output.replace(/\bles mesure d’audience\b/g, 'les mesures d’audience');
  output = output.replace(/\bmesure d’audience minimales\b/g, 'mesures d’audience minimales');
  output = output.replace(/\bmesure d’audience avancés\b/g, 'outils de mesure d’audience avancés');
  output = output.replace(/\bVolume d'mesure d’audience\b/g, 'Volume de mesure d’audience');
  output = output.replace(/\bChaque événement mesure d’audience\b/g, 'Chaque événement de mesure d’audience');
  output = output.replace(/\bévénements mesure d’audience\b/g, 'événements de mesure d’audience');
  output = output.replace(/\bmesure d’audience et des services tiers\b/g, 'mesures d’audience et des services tiers');
  output = output.replace(/\bmesure d’audience PostHog\/Vercel\/Sentry\b/g, 'mesures d’audience PostHog/Vercel/Sentry');
  return output;
}

function normalizeMarkdownSection(section) {
  const lines = section.split(/\r?\n/);
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
        inFence = !inFence;
        return line;
      }

      if (inFence) {
        return line;
      }

      const protectedLine = protectInlineCode(line);
      const replaced = applyReplacements(protectedLine.protectedLine);
      return protectedLine.restore(replaced);
    })
    .join('\n');
}

const original = fs.readFileSync(reportFile, 'utf8');
const splitToken = '\n# Bibliographie';
const splitIndex = original.indexOf(splitToken);

if (splitIndex === -1) {
  throw new Error('Bibliography section not found in report.');
}

const prefix = original.slice(0, splitIndex);
const suffix = original.slice(splitIndex);
const updated = normalizeMarkdownSection(prefix) + suffix;

fs.writeFileSync(reportFile, updated, 'utf8');
console.log('Report language normalized.');
