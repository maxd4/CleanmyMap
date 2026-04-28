const fs = require('fs');

const file1 = 'apps/web/src/components/sections/rubriques/climate-section.tsx';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace(
  'import { useSitePreferences } from "@/components/ui/site-preferences-provider";',
  'import { useSitePreferences } from "@/components/ui/site-preferences-provider";\nimport { CmmSkeleton } from "@/components/ui/cmm-skeleton";'
);

content1 = content1.replace(
  /\{\s*isLoading \? \([\s\S]*?Chargement des indicateurs\.\.\.[\s\S]*?\) : null\}/m,
  `{isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <CmmSkeleton className="h-48 w-full rounded-xl" />
            <CmmSkeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
            </div>
            <CmmSkeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : null}`
);

fs.writeFileSync(file1, content1);


const file2 = 'apps/web/src/components/sections/rubriques/trash-spotter-section.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  'import { useSitePreferences } from "@/components/ui/site-preferences-provider";',
  'import { useSitePreferences } from "@/components/ui/site-preferences-provider";\nimport { CmmSkeleton } from "@/components/ui/cmm-skeleton";'
);

content2 = content2.replace(
  '{/* KPI RAPIDES */}\n  {!isLoading && !error ? (',
  `{/* KPI RAPIDES */}
  {isLoading ? (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <CmmSkeleton className="h-24 rounded-xl" />
      <CmmSkeleton className="h-24 rounded-xl" />
      <CmmSkeleton className="h-24 rounded-xl" />
      <CmmSkeleton className="h-24 rounded-xl" />
    </div>
  ) : !error ? (`
);

content2 = content2.replace(
  /\{\s*isLoading \? \([\s\S]*?Chargement des indicateurs Spotter\.\.\.[\s\S]*?\) : null\}/m,
  `{isLoading ? (
          <div className="space-y-4">
            <CmmSkeleton className="h-[250px] w-full rounded-xl" />
            <CmmSkeleton className="h-[400px] w-full rounded-xl" />
          </div>
        ) : null}`
);

fs.writeFileSync(file2, content2);
console.log("Done.");
