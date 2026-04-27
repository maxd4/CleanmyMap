const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('apps/web/src/components').concat(walk('apps/web/src/app'));

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Colors
  content = content.replace(/\btext-slate-900\b/g, 'cmm-text-primary');
  content = content.replace(/\btext-slate-800\b/g, 'cmm-text-primary');
  content = content.replace(/\btext-slate-700\b/g, 'cmm-text-secondary');
  content = content.replace(/\btext-slate-600\b/g, 'cmm-text-secondary');
  content = content.replace(/\btext-slate-500\b/g, 'cmm-text-muted');
  content = content.replace(/\btext-slate-400\b/g, 'cmm-text-muted');
  content = content.replace(/\btext-gray-900\b/g, 'cmm-text-primary');
  content = content.replace(/\btext-gray-800\b/g, 'cmm-text-primary');
  content = content.replace(/\btext-gray-700\b/g, 'cmm-text-secondary');
  content = content.replace(/\btext-gray-600\b/g, 'cmm-text-secondary');
  content = content.replace(/\btext-gray-500\b/g, 'cmm-text-muted');
  
  // Dark mode text
  content = content.replace(/\bdark:text-slate-100\b/g, '');
  content = content.replace(/\bdark:text-slate-200\b/g, '');
  content = content.replace(/\bdark:text-slate-300\b/g, '');
  content = content.replace(/\bdark:text-slate-400\b/g, '');
  content = content.replace(/\bdark:text-gray-100\b/g, '');
  content = content.replace(/\bdark:text-gray-200\b/g, '');

  // Surfaces and cards
  content = content.replace(/\bbg-white dark:bg-slate-900\b/g, 'cmm-surface');
  content = content.replace(/\bbg-white dark:bg-gray-900\b/g, 'cmm-surface');
  content = content.replace(/\bbg-slate-50 dark:bg-slate-800\b/g, 'cmm-surface-muted');
  content = content.replace(/\bbg-gray-50 dark:bg-gray-800\b/g, 'cmm-surface-muted');
  content = content.replace(/\bbg-slate-50 dark:bg-slate-900\b/g, 'cmm-surface-muted');

  // Borders
  content = content.replace(/\bborder-slate-200 dark:border-slate-800\b/g, '');
  content = content.replace(/\bborder-slate-200 dark:border-slate-700\b/g, '');
  content = content.replace(/\bborder-gray-200 dark:border-gray-800\b/g, '');

  // Typography
  content = content.replace(/\btext-sm\b/g, 'cmm-text-small');
  content = content.replace(/\btext-xs\b/g, 'cmm-text-caption');
  
  // Weights (reducing 800/extrabold to bold/semibold)
  content = content.replace(/\bfont-extrabold\b/g, 'font-bold');
  content = content.replace(/\bfont-black\b/g, 'font-bold');

  // Spacing (standardizing weird ones if any, though Tailwind spacing is generally already standardized,
  // we could just leave spacing to Tailwind as requested by the user's unit of 4px which tailwind uses by default.
  // The user says "impose un système d'espacement basé sur une unité constante (ex. 4px)".
  // Tailwind uses 0.25rem (4px) per unit, so p-4 is 16px, p-2 is 8px. It's already compliant.

  // Cleanup double spaces created by empty replacements
  content = content.replace(/ {2,}/g, ' ');
  content = content.replace(/className=\" /g, 'className=\"');
  content = content.replace(/ \"/g, '\"');
  // cleanup trailing space before quote
  content = content.replace(/ \"/g, '\"');

  // Replace text-[10px] with cmm-text-caption
  content = content.replace(/text-\[10px\]/g, 'cmm-text-caption');
  content = content.replace(/text-\[11px\]/g, 'cmm-text-caption');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log('Modified ' + modifiedCount + ' files.');
