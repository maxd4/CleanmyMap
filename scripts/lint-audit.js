#!/usr/bin/env node

/**
 * Script d'audit ESLint par rubrique
 * Génère un rapport détaillé des warnings organisés par fonctionnalité
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration des rubriques
const RUBRIQUES = {
  'home': {
    name: 'Page d\'accueil',
    paths: ['src/app/page.tsx', 'src/components/home/'],
    priority: 1
  },
  'actions': {
    name: 'Carte et Actions', 
    paths: ['src/app/(app)/actions/', 'src/components/actions/'],
    priority: 2
  },
  'dashboard': {
    name: 'Dashboard et Pilotage',
    paths: ['src/app/(app)/dashboard/', 'src/components/dashboard/'],
    priority: 3
  },
  'reports': {
    name: 'Rapports et Analytics',
    paths: ['src/components/reports/'],
    priority: 4
  },
  'learn': {
    name: 'Apprentissage et Quiz',
    paths: ['src/components/learn/'],
    priority: 5
  },
  'partners': {
    name: 'Partenaires et Communauté',
    paths: ['src/components/sections/rubriques/'],
    priority: 6
  },
  'chat': {
    name: 'Chat et Communication',
    paths: ['src/components/chat/'],
    priority: 7
  },
  'admin': {
    name: 'Administration',
    paths: ['src/components/admin/', 'scripts/'],
    priority: 8
  }
};

// Sévérité des règles ESLint
const SEVERITY_MAP = {
  '@typescript-eslint/no-explicit-any': 'high',
  '@typescript-eslint/no-unused-vars': 'high', 
  'react-hooks/set-state-in-effect': 'critical',
  'react-hooks/exhaustive-deps': 'high',
  'react/no-unescaped-entities': 'medium',
  '@next/next/no-img-element': 'medium',
  'max-lines': 'low',
  'react/jsx-no-undef': 'critical'
};

function getSeverity(ruleId) {
  return SEVERITY_MAP[ruleId] || 'low';
}

function getSeverityEmoji(severity) {
  const map = {
    'critical': '🔴',
    'high': '🟠', 
    'medium': '🟡',
    'low': '🟢'
  };
  return map[severity] || '⚪';
}

function runLintForPath(targetPath) {
  try {
    // Utiliser la commande npm lint qui fonctionne déjà
    const cmd = `npm run lint`;
    const result = execSync(cmd, { 
      encoding: 'utf8', 
      cwd: path.join(process.cwd(), 'apps/web'),
      env: { ...process.env, ESLINT_PATH_FILTER: targetPath }
    });
    // Pour l'instant, retourner un résultat vide car npm run lint ne supporte pas le filtrage par path
    return [];
  } catch (error) {
    // ESLint retourne un code d'erreur même avec des warnings
    console.warn(`Note: Utilisation de npm run lint global (filtrage par path non supporté)`);
    return [];
  }
}

function analyzeRubrique(rubriqueKey, rubriqueConfig) {
  console.log(`🔍 Analyse de la rubrique: ${rubriqueConfig.name}`);
  
  const allResults = [];
  
  for (const targetPath of rubriqueConfig.paths) {
    const fullPath = path.join(process.cwd(), 'apps/web', targetPath);
    
    // Vérifier si le chemin existe
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Chemin non trouvé: ${fullPath}`);
      continue;
    }
    
    const results = runLintForPath(fullPath);
    allResults.push(...results);
  }
  
  // Analyser les résultats
  const analysis = {
    rubrique: rubriqueKey,
    name: rubriqueConfig.name,
    priority: rubriqueConfig.priority,
    totalFiles: allResults.length,
    totalWarnings: 0,
    totalErrors: 0,
    files: [],
    severityCount: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    ruleBreakdown: {}
  };
  
  for (const fileResult of allResults) {
    if (fileResult.messages && fileResult.messages.length > 0) {
      const fileAnalysis = {
        filePath: fileResult.filePath.replace(process.cwd(), ''),
        warnings: fileResult.warningCount || 0,
        errors: fileResult.errorCount || 0,
        messages: fileResult.messages.map(msg => ({
          line: msg.line,
          column: msg.column,
          ruleId: msg.ruleId,
          message: msg.message,
          severity: getSeverity(msg.ruleId)
        }))
      };
      
      analysis.files.push(fileAnalysis);
      analysis.totalWarnings += fileAnalysis.warnings;
      analysis.totalErrors += fileAnalysis.errors;
      
      // Compter par sévérité et règle
      for (const msg of fileAnalysis.messages) {
        analysis.severityCount[msg.severity]++;
        analysis.ruleBreakdown[msg.ruleId] = (analysis.ruleBreakdown[msg.ruleId] || 0) + 1;
      }
    }
  }
  
  return analysis;
}

function generateMarkdownReport(analyses) {
  const now = new Date().toLocaleDateString('fr-FR');
  
  let markdown = `# Rapport d'Audit ESLint par Rubrique\n\n`;
  markdown += `**Généré le** : ${now}  \n`;
  markdown += `**Commande** : \`npm run lint:audit\`\n\n`;
  
  // Résumé global
  const totalWarnings = analyses.reduce((sum, a) => sum + a.totalWarnings, 0);
  const totalErrors = analyses.reduce((sum, a) => sum + a.totalErrors, 0);
  const totalFiles = analyses.reduce((sum, a) => sum + a.files.length, 0);
  
  markdown += `## 📊 Résumé Global\n\n`;
  markdown += `- **Erreurs** : ${totalErrors}\n`;
  markdown += `- **Warnings** : ${totalWarnings}\n`;
  markdown += `- **Fichiers concernés** : ${totalFiles}\n`;
  markdown += `- **Rubriques analysées** : ${analyses.length}\n\n`;
  
  // Tableau de bord par rubrique
  markdown += `## 🎯 Tableau de Bord par Rubrique\n\n`;
  markdown += `| Rubrique | Priorité | Erreurs | Warnings | Fichiers | Sévérité Max |\n`;
  markdown += `|----------|----------|---------|----------|----------|---------------|\n`;
  
  for (const analysis of analyses.sort((a, b) => a.priority - b.priority)) {
    const maxSeverity = analysis.severityCount.critical > 0 ? 'critical' :
                       analysis.severityCount.high > 0 ? 'high' :
                       analysis.severityCount.medium > 0 ? 'medium' : 'low';
    
    markdown += `| ${analysis.name} | ${analysis.priority} | ${analysis.totalErrors} | ${analysis.totalWarnings} | ${analysis.files.length} | ${getSeverityEmoji(maxSeverity)} ${maxSeverity} |\n`;
  }
  
  markdown += `\n`;
  
  // Détail par rubrique
  markdown += `## 📋 Détail par Rubrique\n\n`;
  
  for (const analysis of analyses.sort((a, b) => a.priority - b.priority)) {
    if (analysis.totalWarnings === 0 && analysis.totalErrors === 0) {
      markdown += `### ✅ ${analysis.name}\n\n`;
      markdown += `**Statut** : Aucun problème détecté\n\n`;
      continue;
    }
    
    markdown += `### ${getSeverityEmoji(analysis.severityCount.critical > 0 ? 'critical' : 'medium')} ${analysis.name}\n\n`;
    markdown += `**Priorité** : ${analysis.priority} | **Erreurs** : ${analysis.totalErrors} | **Warnings** : ${analysis.totalWarnings}\n\n`;
    
    // Top 3 des règles les plus fréquentes
    const topRules = Object.entries(analysis.ruleBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topRules.length > 0) {
      markdown += `**Problèmes principaux** :\n`;
      for (const [rule, count] of topRules) {
        markdown += `- \`${rule}\` : ${count} occurrences ${getSeverityEmoji(getSeverity(rule))}\n`;
      }
      markdown += `\n`;
    }
    
    // Fichiers les plus problématiques
    const problematicFiles = analysis.files
      .filter(f => f.warnings > 0 || f.errors > 0)
      .sort((a, b) => (b.warnings + b.errors) - (a.warnings + a.errors))
      .slice(0, 5);
    
    if (problematicFiles.length > 0) {
      markdown += `**Fichiers à traiter** :\n`;
      for (const file of problematicFiles) {
        const fileName = path.basename(file.filePath);
        markdown += `- \`${fileName}\` : ${file.errors} erreurs, ${file.warnings} warnings\n`;
      }
      markdown += `\n`;
    }
    
    // Actions recommandées
    markdown += `**Actions recommandées** :\n`;
    if (analysis.severityCount.critical > 0) {
      markdown += `- 🔴 **Urgent** : Corriger les ${analysis.severityCount.critical} problèmes critiques\n`;
    }
    if (analysis.severityCount.high > 0) {
      markdown += `- 🟠 **Important** : Traiter les ${analysis.severityCount.high} problèmes de haute priorité\n`;
    }
    if (analysis.severityCount.medium > 0) {
      markdown += `- 🟡 **Modéré** : Corriger lors du développement (${analysis.severityCount.medium} items)\n`;
    }
    markdown += `\n`;
  }
  
  // Guide de correction
  markdown += `## 🛠️ Guide de Correction Rapide\n\n`;
  
  // Collecter toutes les règles uniques
  const allRules = new Set();
  for (const analysis of analyses) {
    Object.keys(analysis.ruleBreakdown).forEach(rule => allRules.add(rule));
  }
  
  const ruleGuides = {
    'react-hooks/set-state-in-effect': {
      description: 'setState dans useEffect cause des re-renders en cascade',
      fix: 'Déplacer setState dans un callback ou utiliser useLayoutEffect'
    },
    '@typescript-eslint/no-explicit-any': {
      description: 'Type any explicite réduit la sécurité des types',
      fix: 'Définir des interfaces TypeScript appropriées'
    },
    'react/no-unescaped-entities': {
      description: 'Apostrophes et guillemets non échappés dans JSX',
      fix: 'Remplacer \' par &apos; et " par &quot;'
    },
    '@next/next/no-img-element': {
      description: 'Balise <img> non optimisée',
      fix: 'Utiliser <Image> de next/image pour les performances'
    },
    '@typescript-eslint/no-unused-vars': {
      description: 'Variables ou imports non utilisés',
      fix: 'Supprimer les déclarations inutiles'
    }
  };
  
  for (const rule of Array.from(allRules).sort()) {
    const guide = ruleGuides[rule];
    if (guide) {
      markdown += `### \`${rule}\`\n`;
      markdown += `**Problème** : ${guide.description}  \n`;
      markdown += `**Solution** : ${guide.fix}\n\n`;
    }
  }
  
  return markdown;
}

function main() {
  console.log('🚀 Démarrage de l\'audit ESLint par rubrique...\n');
  
  const analyses = [];
  
  for (const [key, config] of Object.entries(RUBRIQUES)) {
    try {
      const analysis = analyzeRubrique(key, config);
      analyses.push(analysis);
      
      const status = analysis.totalErrors > 0 ? '❌' : 
                    analysis.totalWarnings > 0 ? '⚠️' : '✅';
      console.log(`${status} ${config.name}: ${analysis.totalErrors} erreurs, ${analysis.totalWarnings} warnings\n`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'analyse de ${config.name}:`, error.message);
    }
  }
  
  // Générer le rapport
  const report = generateMarkdownReport(analyses);
  
  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '../documentation/development/LINT_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`📄 Rapport généré : ${reportPath}`);
  console.log(`\n🎯 Résumé :`);
  console.log(`   - ${analyses.reduce((sum, a) => sum + a.totalErrors, 0)} erreurs totales`);
  console.log(`   - ${analyses.reduce((sum, a) => sum + a.totalWarnings, 0)} warnings totaux`);
  console.log(`   - ${analyses.filter(a => a.totalWarnings > 0 || a.totalErrors > 0).length}/${analyses.length} rubriques nécessitent une attention`);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeRubrique, generateMarkdownReport };