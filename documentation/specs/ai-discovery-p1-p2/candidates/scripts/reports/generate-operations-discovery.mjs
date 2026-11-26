#!/usr/bin/env node
// CANDIDATE. Inventory only: never imports or executes application jobs or npm scripts.
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import yaml from "js-yaml";
import { createGitRepositoryView } from "../checks/repository-view.mjs";

const MANIFESTS = ["package.json","apps/web/package.json","apps/mobile/package.json"];
const REGISTRY = "apps/web/src/lib/periodic/maintenance-job-registry.ts";
const VERCEL_CONFIG = "apps/web/vercel.json";

function manifestEntries(manifestPath, input) {
  const manifest=JSON.parse(input);
  const scripts=manifest?.scripts??{};
  if(typeof scripts!=="object"||Array.isArray(scripts)||!Object.values(scripts).every(v=>typeof v==="string"))throw Error("Invalid manifest scripts");
  return Object.keys(scripts).sort().map(name=>({manifest:manifestPath,name,effects:"UNCLASSIFIED"}));
}

function workflowMetadata(file, workflow) {
  if(!workflow||typeof workflow!=="object"||Array.isArray(workflow))throw Error("Invalid workflow");
  const on=workflow.on;
  const triggers=typeof on==="string"?[on]:Array.isArray(on)?on:Object.keys(on??{});
  if(!triggers.every(t=>typeof t==="string"))throw Error("Invalid workflow triggers");
  const schedules=Array.isArray(on?.schedule)?on.schedule.map(s=>s?.cron).filter(c=>typeof c==="string"&&/^[\d* ,\/\-A-Za-z]+$/.test(c)):[];
  return {file,triggers:[...new Set(triggers)].sort(),schedules,effects:"UNCLASSIFIED"};
}

function literalProperty(object,name) {
  const props=object.properties.filter(p=>ts.isPropertyAssignment(p)
    && (ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)) && p.name.text===name);
  if(props.length!==1)throw new Error("Missing or duplicate registry property: "+name);
  return props[0].initializer;
}

export function readJobMetadata(source) {
  const parsed=ts.createSourceFile(REGISTRY,source,ts.ScriptTarget.Latest,true);
  const declarations=parsed.statements.filter(ts.isVariableStatement)
    .flatMap(s=>Array.from(s.declarationList.declarations))
    .filter(d=>ts.isIdentifier(d.name)&&d.name.text==="MAINTENANCE_JOB_REGISTRY");
  if(declarations.length!==1||!declarations[0].initializer||!ts.isArrayLiteralExpression(declarations[0].initializer))throw new Error("Registry literal unavailable");
  const ids=new Set();
  return declarations[0].initializer.elements.map(node=>{
    if(!ts.isObjectLiteralExpression(node)||node.properties.some(ts.isSpreadAssignment))throw new Error("Unsupported registry entry");
    const id=literalProperty(node,"id"),cadence=literalProperty(node,"cadence"),run=literalProperty(node,"run");
    if(!ts.isStringLiteral(id)||!ts.isStringLiteral(cadence)||!["daily","weekly","monthly"].includes(cadence.text)||ids.has(id.text))throw new Error("Invalid or duplicate registry job");
    ids.add(id.text);
    const executor=ts.isArrowFunction(run)&&ts.isCallExpression(run.body)&&ts.isIdentifier(run.body.expression)?run.body.expression.text:null;
    return {id:id.text,cadence:cadence.text,registry:REGISTRY,line:parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line+1,executor,effects:"UNCLASSIFIED"};
  });
}

export function buildOperationsDiscovery(view,sha) {
  if(!/^[a-f0-9]{40}$/.test(sha)||view.mode!=="git")throw new Error("Full Git SHA and Git view required");
  const scripts=MANIFESTS.flatMap(p=>manifestEntries(p,view.readText(p)));
  const workflows=view.listFiles(".github/workflows").filter(p=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)).sort()
    .map(p=>workflowMetadata(p,yaml.load(view.readText(p),{schema:yaml.JSON_SCHEMA})));
  const jobs=readJobMetadata(view.readText(REGISTRY));
  const config=JSON.parse(view.readText(VERCEL_CONFIG));
  const crons=(config.crons??[]).map(c=>{
    if(typeof c.path!=="string"||typeof c.schedule!=="string")throw new Error("Invalid cron config");
    return {path:c.path,schedule:c.schedule,source:VERCEL_CONFIG,effects:"UNCLASSIFIED"};
  });
  return {schemaVersion:1,sourceSha:sha,measuredSource:"git",status:"STATIC_DISCOVERY",scripts,workflows,jobs,crons,
    limitations:"Declared operations only. Names and triggers do not prove effects, authorization, availability or deployment. UNCLASSIFIED entries must not be executed automatically."};
}

function main(args) {
  if(args.length!==1||!/^[a-f0-9]{40}$/.test(args[0]))throw new Error("Usage: node scripts/reports/generate-operations-discovery.mjs FULL_GIT_SHA");
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
  const view=createGitRepositoryView(args[0],root);
  process.stdout.write(JSON.stringify(buildOperationsDiscovery(view,args[0]),null,2)+"\n");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main(process.argv.slice(2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
