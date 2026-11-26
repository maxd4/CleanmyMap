// CANDIDATE: integrate into audit-github-release.mjs after checkout validation.
export function evaluateGithubRelease({dependabot,codeScanning,secretScanning,runs,rulesets,sha}) {
  const fail = (reason) => ({status:"BLOCKED_ACCESS",reason,openAlerts:null,failedRuns:null,pendingRuns:null,missingRunEvidence:true,rulesetsObserved:false});
  if(!/^[a-f0-9]{40}$/i.test(sha??""))return fail("Invalid candidate SHA");
  const validObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
  const validAlerts=x=>Array.isArray(x)&&x.every(e=>validObject(e)&&e.state==="open");
  if(![dependabot,codeScanning,secretScanning].every(validAlerts))return fail("Invalid or non-open alerts payload");
  if(!Array.isArray(runs)||!runs.every(r=>validObject(r)&&r.head_sha===sha&&typeof r.path==="string"&&typeof r.status==="string"))return fail("Malformed or wrong-SHA workflow evidence");
  if(!Array.isArray(rulesets)||!rulesets.every(r=>validObject(r)&&typeof r.enforcement==="string"&&typeof r.target==="string"&&Array.isArray(r.rules)&&Array.isArray(r.bypass_actors)))return fail("Incomplete ruleset details");
  const scoped=rulesets.filter(r=>r.enforcement==="active"&&r.target==="branch"&&Array.isArray(r.conditions?.ref_name?.include)&&Array.isArray(r.conditions?.ref_name?.exclude)&&r.conditions.ref_name.exclude.length===0&&r.conditions.ref_name.include.some(x=>x==="refs/heads/main"||x==="~DEFAULT_BRANCH"));
  const historyRules=new Set(scoped.filter(r=>r.bypass_actors.length===0).flatMap(r=>r.rules.map(rule=>rule?.type)));
  const protectionVerified=historyRules.has("deletion")&&historyRules.has("non_fast_forward")&&scoped.some(r=>r.rules.some(rule=>rule?.type==="update"));
  const requiredPaths=[".github/workflows/ci.yml",".github/workflows/codeql.yml"];
  const validConclusion=new Set(["success","failure","cancelled","timed_out","action_required","startup_failure","stale","skipped","neutral"]);
  const inFlight=new Set(["queued","in_progress","requested","waiting","pending"]);
  if(runs.some(r=>r.status==="completed"?!validConclusion.has(r.conclusion):!inFlight.has(r.status)))return fail("Unknown run status or conclusion");
  const completed=runs.filter(r=>r.status==="completed");
  const failedRuns=completed.filter(r=>!["success","skipped","neutral"].includes(r.conclusion)).length;
  const pendingRuns=runs.filter(r=>inFlight.has(r.status)).length;
  const missingRequiredWorkflows=requiredPaths.filter(p=>!completed.some(r=>r.path===p&&r.head_branch==="main"&&["push","workflow_dispatch"].includes(r.event)&&r.conclusion==="success"));
  const openAlerts=dependabot.length+codeScanning.length+secretScanning.length;
  return {
    status:openAlerts||failedRuns||!protectionVerified?"FAIL":pendingRuns||missingRequiredWorkflows.length?"NOT_RUN":"PASS",
    openAlerts,failedRuns,pendingRuns,missingRunEvidence:missingRequiredWorkflows.length>0,
    rulesetsObserved:true,protectionVerified,missingRequiredWorkflows,
  };
}
