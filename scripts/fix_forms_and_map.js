const fs = require('fs');

// 1. actions-map-canvas.tsx
const mapFile = 'apps/web/src/components/actions/actions-map-canvas.tsx';
let mapContent = fs.readFileSync(mapFile, 'utf8');

mapContent = mapContent.replace(
  /\.cmm-infrastructure-emoji__glyph \{[\s\S]*?line-height: 1;\s*\}/,
  `.cmm-infrastructure-emoji__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--bg-elevated, rgba(255,255,255,0.92));
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  font-size: 16px;
  line-height: 1;
  }`
);

if (!mapContent.includes('html.dark .cmm-infrastructure-emoji__glyph')) {
  mapContent = mapContent.replace(
    '.leaflet-container {',
    `html.dark .cmm-infrastructure-emoji__glyph {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
  .leaflet-container {`
  );
}

mapContent = mapContent.replace(
  'background: #020617;',
  'background: var(--bg-canvas, #020617);'
);

fs.writeFileSync(mapFile, mapContent);


// 2. action-declaration-form.actions.tsx
const formActionsFile = 'apps/web/src/components/actions/action-declaration-form.actions.tsx';
let formActionsContent = fs.readFileSync(formActionsFile, 'utf8');

if (!formActionsContent.includes('Loader2')) {
  formActionsContent = formActionsContent.replace(
    'import type { SubmissionState } from "./action-declaration-form.model";',
    'import type { SubmissionState } from "./action-declaration-form.model";\nimport { Loader2 } from "lucide-react";'
  );
}

formActionsContent = formActionsContent.replace(
  /className="rounded-full bg-gradient-to-br[\s\S]*?"/,
  `className="rounded-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-3 font-bold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"`
);

formActionsContent = formActionsContent.replace(
  /\{isPending \? "Envoi\.\.\." : "Déclarer l'action"\}/,
  `{isPending ? (
          <><Loader2 className="animate-spin" size={20} /> Envoi...</>
        ) : (
          "Déclarer l'action"
        )}`
);

fs.writeFileSync(formActionsFile, formActionsContent);


// 3. trash-spotter-section.tsx
const spotterFile = 'apps/web/src/components/sections/rubriques/trash-spotter-section.tsx';
let spotterContent = fs.readFileSync(spotterFile, 'utf8');

if (!spotterContent.includes('import { Loader2 }')) {
  spotterContent = spotterContent.replace(
    'import { CmmSkeleton } from "@/components/ui/cmm-skeleton";',
    'import { CmmSkeleton } from "@/components/ui/cmm-skeleton";\nimport { Loader2 } from "lucide-react";'
  );
}

spotterContent = spotterContent.replace(
  /className="rounded-lg bg-amber-600 px-4 py-2 cmm-text-small font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"/,
  `className="rounded-lg bg-amber-600 px-4 py-2 cmm-text-small font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400 flex items-center justify-center gap-2"`
);

spotterContent = spotterContent.replace(
  /\{spotState === "pending"\s*\?\s*fr\s*\?\s*"Création\.\.\."\s*:\s*"Creating\.\.\."\s*:\s*fr\s*\?\s*"Créer le signalement"\s*:\s*"Create report"\}/,
  `{spotState === "pending" ? (
            <><Loader2 className="animate-spin" size={16} /> {fr ? "Création..." : "Creating..."}</>
          ) : (
            fr ? "Créer le signalement" : "Create report"
          )}`
);

fs.writeFileSync(spotterFile, spotterContent);

console.log("Forms and map CSS updated successfully.");
