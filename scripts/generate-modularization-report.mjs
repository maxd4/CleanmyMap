#!/usr/bin/env node
/**
 * Génère un rapport de modularisation après une session
 * Usage: node scripts/generate-modularization-report.mjs <fichier-modularisé>
 */

import { readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { fileURLToPath } from 'url';

export function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;

    return {
      exists: true,
      size: Buffer.byteLength(content, 'utf8'),
      lines,
      imports: (content.match(/^import /gm) || []).length,
      exports: (content.match(/^export /gm) || []).length,
    };
  } catch (error) {
    return { exists: false };
  }
}

export function main(args = process.argv.slice(2)) {
  if (args.length === 0) {
    console.error('Usage: node scripts/generate-modularization-report.mjs <fichier-modularisé>');
    process.exit(1);
  }

  const targetFile = args[0];
  const reportDate = new Date().toISOString().split('T')[0];
  const fileInfo = analyzeFile(targetFile);

  if (!fileInfo.exists) {
    console.error(`❌ Fichier non trouvé: ${targetFile}`);
    process.exit(1);
  }

  const report = `# Rapport de Modularisation

**Fichier** : \`${targetFile}\`  
**Date** : ${reportDate}

---

## 📊 Métriques

| Métrique | Valeur |
|----------|--------|
| Taille | ${(fileInfo.size / 1024).toFixed(1)} KB |
| Lignes | ${fileInfo.lines} |
| Imports | ${fileInfo.imports} |
| Exports | ${fileInfo.exports} |

---

## ✅ Actions Réalisées

- [ ] Analyse du fichier original
- [ ] Identification des responsabilités
- [ ] Création de la structure de dossiers
- [ ] Extraction des composants
- [ ] Extraction de la logique (hooks)
- [ ] Extraction de la configuration
- [ ] Création du fichier index.ts
- [ ] Mise à jour des imports
- [ ] Tests unitaires
- [ ] Validation du build

---

## 📁 Fichiers Créés

\`\`\`
nouveau-dossier/
├── index.ts
├── composant-1.tsx
├── composant-2.tsx
├── hook-logique.ts
└── config.ts
\`\`\`

---

## 🎯 Résultats

### Avant
- Taille : XXX KB
- Lignes : XXX
- Complexité : Haute

### Après
- Taille : ${(fileInfo.size / 1024).toFixed(1)} KB
- Lignes : ${fileInfo.lines}
- Complexité : Réduite
- Réduction : XX%

---

## 📝 Notes

- Ajouter vos observations ici
- Difficultés rencontrées
- Points d'attention

---

## ✨ Prochaines Étapes

1. Mettre à jour MODULARIZATION_PROGRESS.md
2. Documenter dans MODULARIZATION_SESSION_REPORT.md
3. Passer au fichier suivant

---

**Généré le** : ${new Date().toISOString()}
`;

  const reportPath = join(
    process.cwd(),
    'documentation',
    'sessions',
    'history',
    `modularization-${reportDate}-${basename(targetFile)}.md`,
  );

  try {
    writeFileSync(reportPath, report);
    console.log(`✅ Rapport généré : ${reportPath}`);
    console.log('\n📊 Métriques du fichier :');
    console.log(`   Taille : ${(fileInfo.size / 1024).toFixed(1)} KB`);
    console.log(`   Lignes : ${fileInfo.lines}`);
    console.log(`   Imports : ${fileInfo.imports}`);
    console.log(`   Exports : ${fileInfo.exports}`);
    console.log('\n💡 N\'oubliez pas de :');
    console.log('   1. Compléter le rapport généré');
    console.log('   2. Mettre à jour MODULARIZATION_PROGRESS.md');
    console.log('   3. Documenter dans MODULARIZATION_SESSION_REPORT.md\n');
  } catch (error) {
    console.error(`❌ Erreur lors de la génération du rapport : ${error.message}`);
    process.exit(1);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  main();
}
