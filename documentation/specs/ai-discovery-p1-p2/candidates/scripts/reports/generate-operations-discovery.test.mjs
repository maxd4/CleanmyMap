import test from "node:test";
import assert from "node:assert/strict";
import { buildOperationsDiscovery, readJobMetadata } from "./generate-operations-discovery.mjs";
const sha="a".repeat(40);
const registry='export const MAINTENANCE_JOB_REGISTRY: unknown[] = [{id:"sample",cadence:"daily",run:()=>runSample()}]';
const inputs={
 "package.json": '{"scripts":{"example":"command not exported"}}',
 "apps/web/package.json": '{"scripts":{"build":"other command"}}',
 "apps/mobile/package.json": '{"scripts":{}}',
 "apps/web/src/lib/periodic/maintenance-job-registry.ts":registry,
 "apps/web/vercel.json":'{"crons":[{"path":"/api/cron/maintenance","schedule":"20 3 * * *"}]}',
 ".github/workflows/check.yml":"on:\n  push:\n  schedule:\n    - cron: '20 3 * * *'\njobs: {}\n"
};
const view={mode:"git",readText:p=>inputs[p],listFiles:()=>Object.keys(inputs)};
test("catalogs source declarations without running operations or exporting commands",()=>{
 const report=buildOperationsDiscovery(view,sha);
 assert.equal(report.scripts.length,2);
 assert.deepEqual(report.workflows[0].triggers,["push","schedule"]);
 assert.deepEqual(report.workflows[0].schedules,["20 3 * * *"]);
 assert.equal(report.jobs[0].executor,"runSample");
 assert.equal(report.crons[0].path,"/api/cron/maintenance");
 assert.ok(!JSON.stringify(report).includes("command not exported"));
 assert.ok(report.scripts.every(s=>s.effects==="UNCLASSIFIED"));
});
test("invalid registry entries and provenance fail explicitly",()=>{
 assert.throws(()=>readJobMetadata(registry.replace("daily","never")),/Invalid/);
 assert.throws(()=>readJobMetadata(registry.replace("run:()=>runSample()","...unknown")),/Unsupported/);
 assert.throws(()=>buildOperationsDiscovery({...view,mode:"filesystem"},sha),/Git view/);
});
