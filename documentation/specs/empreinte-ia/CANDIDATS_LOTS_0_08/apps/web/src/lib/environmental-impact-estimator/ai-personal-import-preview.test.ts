import {describe,expect,it} from "vitest";
import {normalizePersonalAiUsage,type PersonalAiUsageDraft} from "./ai-personal-usage-normalization";
import {previewPersonalAiImport,hashPersonalAiStableKey} from "./ai-personal-import-preview";
const make=(input:number,start="2026-11-01T00:00:00Z",end="2026-11-02T00:00:00Z")=>{
 const draft:PersonalAiUsageDraft={source:"openai_usage",sourceVersion:"v1",granularity:"bucket",accountScope:"opaque",periodStartUtc:start,periodEndUtc:end,modelRaw:"demo",modelCanonical:null,operator:null,execution:"cloud_api",inferenceRegion:null,requestCount:1,tokens:{inputTotal:input,inputUncached:null,cacheRead:null,cacheWrite:null,outputVisible:10,outputReasoning:null,outputTotal:10,reasoningRelation:"included",toolUseInput:null},completeness:"COMPLETE"};
 return normalizePersonalAiUsage(draft);
};
describe("lot2 preview not persistence",()=>{
  it("identical reimport is idempotent candidate, never added twice",()=>{
    const a=make(100);
    const r=previewPersonalAiImport([a],[a]);expect(r[0].status).toBe("DUPLICATE_EXACT");
  });
  it("late supplier revision retains stable identity but requires confirmation",()=>{
    const r=previewPersonalAiImport([make(110)],[make(100)]);
    expect(r[0].status).toBe("REVISION_REQUIRES_CONFIRMATION");
    expect(r[0].conflictsWith).toContain(0);
  });
  it("overlapping buckets cannot be counted together automatically",()=>{
    const r=previewPersonalAiImport([make(100,"2026-11-01T06:00:00Z","2026-11-02T06:00:00Z")],[make(90)]);
    expect(r[0].status).toBe("CONFLICT_OVERLAP");
  });
  it("unidentified invoice cannot get a fabricated deterministic id",()=>{
    const invoice=normalizePersonalAiUsage({...make(100),source:"pdf_invoice",sourceRef:null,periodStartUtc:null,periodEndUtc:null,granularity:"invoice"});
    expect(previewPersonalAiImport([invoice])[0].status).toBe("IDENTITY_INCOMPLETE");
  });
  it("stable identity digest has no visible account identifier",async()=>{
    const key=previewPersonalAiImport([make(100)])[0].stableSourceKey as string;
    const digest=await hashPersonalAiStableKey(key);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain("opaque");
  });
});
