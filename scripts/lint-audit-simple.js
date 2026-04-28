#!/usr/bin/env node

/**
 * Script d'audit ESLint simplifié
 * Parse la sortie de npm run lint pour organiser les warnings par rubrique
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration des rubriques avec patterns de fichiers
const RUBRIQUES = {
  'home': {
    name: 'Page d\'accueil',
    patterns: ['/app/page.tsx', '/components/home/'],
    priority: 1
  },
  'actions': {
    name: 'Carte et Actions', 
    patterns: ['/app/(app)/actions/', '/components/actions/'],
    priority: 2
  },
  'dashboard': {
    name: 'Dashboard et Pilotage',
    patterns: ['/app/(app)/dashboard/', '/components/dashboard/'],
    priority: 3
  },
  'reports': {
    name: 'Rapports et Analytics',
    patterns: ['/components/reports/'],
    priority: 4
  },
  'learn': {
    name: 'Apprentissage et Quiz',
    patterns: ['/components/learn/'],
    priority: 5
  },
  'partners': {
    name: 'Partenaires et Communauté',
    patterns: ['/components/sections/rubriques/', '/components/partners/'],
    priority: 6
  },
  'chat': {
    name: 'Chat et Communication',
    patterns: ['/components/chat/'],
    priority: 7
  },
  'admin': {
    name: 'Administration',
    patterns: ['/components/admin/', '/scripts/'],
    priority: 8
  },
  'other': {
    name: 'Autres fichiers',
    patterns: [], // Catch-all
    priority: 9
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

function matchFileToRubrique(filePath) {
  for (const [key, config] of Object.entries(RUBRIQUES)) {
    if (key === 'other') continue; // Skip catch-all
    
    for (const pattern of config.patterns) {
      if (filePath.includes(pattern)) {
        return key;
      }
    }
  }
  return 'other'; // Default catch-all
}

function parseLintOutput(lintOutput) {
  const lines = lintOutput.split('\n');
  const warnings = [];
  
  let currentFile = null;
  
  for (const line of lines) {
    // Détecter les fichiers (chemins absolus Windows)
    if (line.match(/^[A-Z]:\\.+\.(tsx?|jsx?|mjs)$/)) {
      currentFile = line;
      continue;
    }
    
    // Détecter les warnings/erreurs
    const warningMatch = line.match(/^\s*(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+([a-z-/@]+)$/);
    if (warningMatch && currentFile) {
      const [, lineNum, colNum, type, message, ruleId] = warningMatch;
      
      warnings.push({
        file: currentFile,
        line: parseInt(lineNum),
        column: parseInt(colNum),
        type: type,
        message: message.trim(),
        ruleId: ruleId,
        severity: getSeverity(ruleId)
      });
    }
  }
  
  return warnings;
}

function analyzeWarnings(warnings) {
  const analysis = {};
  
  // Initialiser toutes les rubriques
  for (const [key, config] of Object.entries(RUBRIQUES)) {
    analysis[key] = {
      rubrique: key,
      name: config.name,
      priority: config.priority,
      totalFiles: 0,
      totalWarnings: 0,
      totalErrors: 0,
      files: {},
      severityCount: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      ruleBreakdown: {}
    };
  }
  
  // Analyser chaque warning
  for (const warning of warnings) {
    const rubriqueKey = matchFileToRubrique(warning.file);
    const rubrique = analysis[rubriqueKey];
    
    // Compter par fichier
    if (!rubrique.files[warning.file]) {
      rubrique.files[warning.file] = {
        warnings: 0,
        errors: 0,
        messages: []
      };
      rubrique.totalFiles++;
    }
    
    rubrique.files[warning.file].messages.push(warning);
    
    if (warning.type === 'error') {
      rubrique.files[warning.file].errors++;
      rubrique.totalErrors++;
    } else {
      rubrique.files[warning.file].warnings++;
      rubrique.totalWarnings++;
    }
    
    // Compter par sévérité et règle
    rubrique.severityCount[warning.severity]++;
    rubrique.ruleBreakdown[warning.ruleId] = (rubrique.ruleBreakdown[warning.ruleId] || 0) + 1;
  }
  
  return Object.values(analysis);
}

function generateMarkdownReport(analyses) {
  const now = new Date().toLocaleDateString('fr-FR');
  
  let markdown = `# Rapport d'Audit ESLint par Rubrique\n\n`;
  markdown += `**Généré le** : ${now}  \n`;
  markdown += `**Commande** : \`npm run lint:audit\`\n\n`;
  
  // Résumé global
  const totalWarnings = analyses.reduce((sum, a) => sum + a.totalWarnings, 0);
  const totalErrors = analyses.reduce((sum, a) => sum + a.totalErrors, 0);
  const totalFiles = analyses.reduce((sum, a) => sum + a.totalFiles, 0);
  
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
    if (analysis.totalWarnings === 0 && analysis.totalErrors === 0) continue;
    
    const maxSeverity = analysis.severityCount.critical > 0 ? 'critical' :
                       analysis.severityCount.high > 0 ? 'high' :
                       analysis.severityCount.medium > 0 ? 'medium' : 'low';
    
    markdown += `| ${analysis.name} | ${analysis.priority} | ${analysis.totalErrors} | ${analysis.totalWarnings} | ${analysis.totalFiles} | ${getSeverityEmoji(maxSeverity)} ${maxSeverity} |\n`;
  }
  
  markdown += `\n`;
  
  // Détail par rubrique (seulement celles avec des problèmes)
  markdown += `## 📋 Détail par Rubrique\n\n`;
  
  for (const analysis of analyses.sort((a, b) => a.priority - b.priority)) {
    if (analysis.totalWarnings === 0 && analysis.totalErrors === 0) continue;
    
    const maxSeverity = analysis.severityCount.critical > 0 ? 'critical' : 
                       analysis.severityCount.high > 0 ? 'high' : 'medium';
    
    markdown += `### ${getSeverityEmoji(maxSeverity)} ${analysis.name}\n\n`;
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
    const problematicFiles = Object.entries(analysis.files)
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => (b.warnings + b.errors) - (a.warnings + a.errors))
      .slice(0, 5);
    
    if (problematicFiles.length > 0) {
      markdown += `**Fichiers à traiter** :\n`;
      for (const file of problematicFiles) {
        const fileName = path.basename(file.path);
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
  
  return markdown;
}

function main() {
  console.log('🚀 Démarrage de l\'audit ESLint par rubrique...\n');
  
  try {
    // Exécuter npm run lint et capturer la sortie
    console.log('📋 Exécution de npm run lint...');
    const lintOutput = execSync('npm run lint', { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    console.log('✅ Aucun warning détecté !');
    
    // Générer un rapport vide
    const report = generateMarkdownReport([]);
    const reportPath = path.join(__dirname, '../documentation/development/LINT_AUDIT_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`📄 Rapport généré : ${reportPath}`);
    console.log(`🎉 Code parfaitement propre !`);
    
  } catch (error) {
    // ESLint retourne un code d'erreur même avec des warnings
    console.log('⚠️ Warnings détectés, analyse en cours...');
    
    // Combiner stdout et stderr car les warnings peuvent être dans les deux
    const fullOutput = (error.stdout || '') + '\n' + (error.stderr || '');
    const warnings = parseLintOutput(fullOutput);
    console.log(`📊 ${warnings.length} warnings analysés`);
    
    const analyses = analyzeWarnings(warnings);
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
}

if (require.main === module) {
  main();
}

module.exports = { parseLintOutput, analyzeWarnings, generateMarkdownReport };