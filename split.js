const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/environmental-impact-estimator';
const serviceFile = path.join(srcDir, 'service.ts');
const outDir = path.join(srcDir, 'services');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(serviceFile, 'utf8');

// I will extract based on function definitions.
// Instead of writing a complex regex, I will just write a script that has the file content hardcoded? No, that defeats the purpose.
// I can just replace the file contents using a script.
