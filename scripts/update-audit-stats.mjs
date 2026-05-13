import fs from 'fs';
import path from 'path';

const rootDir = 'c:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main';
const auditFile = path.join(rootDir, 'documentation/ai-guides/impact_IA.md');

const EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'public',
    'documentation',
    '.gemini',
    'out'
];

const EXCLUDE_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'impact_IA.md'
];

let totalFiles = 0;
let totalLines = 0;
const statsByExt = {};

function countLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(rootDir, fullPath);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                traverse(fullPath);
            }
        } else {
            if (!EXCLUDE_FILES.includes(file)) {
                totalFiles++;
                const lines = countLines(fullPath);
                totalLines += lines;
                
                const ext = path.extname(file) || 'no-ext';
                statsByExt[ext] = (statsByExt[ext] || 0) + lines;
            }
        }
    }
}

console.log('Counting files and lines...');
traverse(rootDir);

console.log(`Found ${totalFiles} files and ${totalLines} lines.`);

// Update impact_IA.md
let auditContent = fs.readFileSync(auditFile, 'utf8');

const now = new Date();
const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Update header date
auditContent = auditContent.replace(/Dernière mise à jour : \d+ \w+ \d+/g, `Dernière mise à jour : ${dateStr}`);

// Update stats in Section 1
auditContent = auditContent.replace(/\*\*987 fichiers\*\* et \*\*\d+ \d+ lignes de code\*\*/g, `**${totalFiles} fichiers** et **${totalLines.toLocaleString('fr-FR')} lignes de code**`);

// Update stats in Section 2
auditContent = auditContent.replace(/\*\*987 fichiers source\*\* pour \*\*\d+ \d+ lignes source\*\*/g, `**${totalFiles} fichiers source** pour **${totalLines.toLocaleString('fr-FR')} lignes source**`);

// Update table in Section 2 (simplified approach, targeting the lines)
// This part is harder to automate perfectly without a more robust parser, 
// but we can at least update the total values in the text.

fs.writeFileSync(auditFile, auditContent, 'utf8');
console.log('Audit document updated successfully.');
