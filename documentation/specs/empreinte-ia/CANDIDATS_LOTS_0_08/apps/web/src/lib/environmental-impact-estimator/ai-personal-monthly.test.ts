import {describe,expect,it} from "vitest";
import {normalizePersonalAiUsage,type PersonalAiUsageDraft} from "./ai-personal-usage-normalization";
import {computePersonalAiMonthlyBudget,summarizePersonalAiMonth} from "./ai-personal-monthly";
function row(input:number|null,output:number|null,start="2026-11-01T00:00:00Z",end="2026-11-02T00:00:00Z",sourceRef="ref"){
  const x:PersonalAiUsageDraft={source:"manual",sourceVersion:"1",granularity:"bucket",accountScope:null,periodStartUtc:start,periodEndUtc:end,modelRaw:"demo",modelCanonical:null,operator:null,execution:"cloud_api",inferenceRegion:null,requestCount:1,
    tokens:{inputTotal:input,inputUncached:null,cacheRead:null,cacheWrite:null,outputVisible:output,outputReasoning:null,outputTotal:output,reasoningRelation:"included",toolUseInput:null},sourceRef,completeness:"COMPLETE"};
  return normalizePersonalAiUsage(x);
}
describe("lots 1+3 normalization, budgets, and overlap",()=>{
  it("zero and null differ; incomplete does not become a complete total",()=>{
    expect(row(0,0).tokens.logicalTotal).toBe(0);
    expect(row(null,0).tokens.logicalTotal).toBeNull();
  });
  it("rejects invalid UTC ranges and overflow",()=>{
    expect(()=>row(1,1,"2026-11-02T00:00:00Z","2026-11-01T00:00:00Z")).toThrow();
    expect(()=>row(Number.MAX_SAFE_INTEGER,2)).toThrow();
  });
  it("exact UTC end-of-month exclusive period belongs to November",()=>{
    const x=row(10,20,"2026-11-30T00:00:00Z","2026-12-01T00:00:00Z");
    expect(summarizePersonalAiMonth([{id:"a",usage:x,state:"ACTIVE"}],"2026-11").completeLogicalTokens).toBe(30);
  });
  it("bucket spanning month cannot be allocated by guesswork",()=>{
    const x=row(10,20,"2026-11-30T00:00:00Z","2026-12-02T00:00:00Z");
    const s=summarizePersonalAiMonth([{id:"a",usage:x,state:"ACTIVE"}],"2026-11");
    expect(s.completeLogicalTokens).toBeNull();expect(s.unknownCoverageIds).toContain("a");
  });
  it("overlapping same-source rows are conflicts until user chooses one",()=>{
    const entries=[{id:"a",usage:row(10,20),state:"ACTIVE" as const},{id:"b",usage:row(20,40),state:"ACTIVE" as const}];
    const s=summarizePersonalAiMonth(entries,"2026-11");
    expect(s.conflictIds).toHaveLength(2);expect(s.completeLogicalTokens).toBeNull();
    const decided=summarizePersonalAiMonth([{...entries[0],conflictChoice:"PREFER_THIS"},{...entries[1],conflictChoice:"EXCLUDE_THIS"}],"2026-11");
    expect(decided.completeLogicalTokens).toBe(30);
  });
  it("coverage incomplete displays a known minimum but no exhaustive progress",()=>{
    const entries=[{id:"a",usage:row(10,20),state:"ACTIVE" as const},{id:"b",usage:row(null,40,"2026-11-03T00:00:00Z","2026-11-04T00:00:00Z"),state:"ACTIVE" as const}];
    const s=summarizePersonalAiMonth(entries,"2026-11");
    expect(s.lowerBoundKnownLogicalTokens).toBe(30);expect(s.completeLogicalTokens).toBeNull();
    const b=computePersonalAiMonthlyBudget(s,50);
    expect(b.ratio).toBe(.6);expect(b.isLowerBound).toBe(true);
  });
  it("budget is optional; zero budget with nonzero usage is over budget",()=>{
    const s=summarizePersonalAiMonth([{id:"a",usage:row(10,20),state:"ACTIVE"}],"2026-11");
    expect(computePersonalAiMonthlyBudget(s,null).ratio).toBeNull();
    expect(computePersonalAiMonthlyBudget(s,0).overBudget).toBe(true);
    expect(computePersonalAiMonthlyBudget(s,40).nearWarning).toBe(false);
  });
  it("monetary amount cannot be converted into tokens or carbon",()=>{
    const bill=row(null,null);
    const withCost=normalizePersonalAiUsage({...bill,cost:{amount:34.2,currency:"EUR"},source:"pdf_invoice",granularity:"invoice"});
    expect(withCost.tokens.logicalTotal).toBeNull();
  });
});
