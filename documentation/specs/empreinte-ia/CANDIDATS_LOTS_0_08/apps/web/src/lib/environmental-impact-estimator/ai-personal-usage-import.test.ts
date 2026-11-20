import {describe,expect,it} from "vitest";
import {parseOpenAiOrganizationUsage,parseAnthropicAnalytics2026,parseGeminiGenerateContentUsage,parseCodexRolloutJsonl} from "./ai-personal-usage-import";
import {parseExplicitlyMappedCsv} from "./ai-personal-csv";
import {normalizePersonalAiUsage, type PersonalAiUsageDraft} from "./ai-personal-usage-normalization";
const openai={object:"page",data:[{object:"bucket",start_time:1730419200,end_time:1730505600,results:[{input_tokens:1000,input_cached_tokens:400,input_cache_write_tokens:100,input_uncached_tokens:500,output_tokens:500,num_model_requests:5,model:null,project_id:null}]}],has_more:false,next_page:null};
const anthropic={data:[{starting_at:"2026-09-03T00:00:00Z",ending_at:"2026-09-04T00:00:00Z",group:{model:"claude-sonnet-5",inference_geo:null,workspace_id:null},usage:{uncached_input_tokens:1284500,cache_creation:{ephemeral_1h_input_tokens:0,ephemeral_5m_input_tokens:215300},cache_read_input_tokens:3200000,output_tokens:891000,total_tokens:5590800,requests:4210}}],has_more:false,next_page:null,data_refreshed_at:"2026-09-18T16:02:11Z"};
const gemini={modelVersion:"gemini-model-example",usageMetadata:{promptTokenCount:231,cachedContentTokenCount:50,candidatesTokenCount:242,toolUsePromptTokenCount:0,thoughtsTokenCount:524,totalTokenCount:997}};
describe("lot 2 supplier imports",()=>{
  it("OpenAI does not count cache twice and preserves null model",()=>{
    const r=parseOpenAiOrganizationUsage(openai);const row=r.rows[0];
    expect(row.tokens.inputTotal).toBe(1000);expect(row.tokens.cacheRead).toBe(400);expect(row.tokens.cacheWrite).toBe(100);
    expect(row.tokens.logicalTotal).toBe(1500);expect(row.requestCount).toBe(5);expect(row.modelRaw).toBeNull();expect(row.inferenceRegion).toBeNull();
  });
  it("OpenAI refuses cache larger than total",()=>{
    expect(()=>parseOpenAiOrganizationUsage({...openai,data:[{...openai.data[0],results:[{...openai.data[0].results[0],input_cached_tokens:1100}]}]})).toThrow();
  });
  it("OpenAI pagination incomplete remains partial",()=>{
    expect(parseOpenAiOrganizationUsage({...openai,has_more:true,next_page:"opaque"}).status).toBe("PARTIAL");
  });
  it("Anthropic analytics 2026 uses disjoint input categories",()=>{
    const r=parseAnthropicAnalytics2026(anthropic),row=r.rows[0];
    expect(row.tokens.inputTotal).toBe(4699800);expect(row.tokens.outputTotal).toBe(891000);
    expect(row.tokens.logicalTotal).toBe(5590800);expect(row.requestCount).toBe(4210);expect(row.inferenceRegion).toBeNull();
    expect(r.status).toBe("READY");
  });
  it("Anthropic old schema is not parsed silently as Analytics 2026",()=>{
    expect(()=>parseAnthropicAnalytics2026({data:[{bucket:{results:[]}}],has_more:false,next_page:null})).toThrow();
  });
  it("Anthropic freshness and has_more determine partial status",()=>{
    const r=parseAnthropicAnalytics2026({...anthropic,data_refreshed_at:"2026-09-02T00:00:00Z"});
    expect(r.status).toBe("PARTIAL");
  });
  it("Gemini total is prompt+candidates+tools+thoughts, cache already within prompt",()=>{
    const r=parseGeminiGenerateContentUsage(gemini),t=r.rows[0].tokens;
    expect(t.inputTotal).toBe(231);expect(t.outputReasoning).toBe(524);expect(t.outputTotal).toBe(766);
    expect(t.logicalTotal).toBe(997);expect(t.cacheRead).toBe(50);
  });
  it("Gemini tool tokens add to input and reported total",()=>{
    const body={...gemini,usageMetadata:{...gemini.usageMetadata,toolUsePromptTokenCount:100,totalTokenCount:1097}};
    expect(parseGeminiGenerateContentUsage(body).rows[0].tokens.logicalTotal).toBe(1097);
  });
  it("Gemini rejects inconsistent reasoning total",()=>{
    expect(()=>parseGeminiGenerateContentUsage({...gemini,usageMetadata:{...gemini.usageMetadata,totalTokenCount:473}})).toThrow();
  });
  it("Codex cumulative counters subtract increases, count reset as new work, never expose transcript",()=>{
    const events=[
      {type:"token_usage_record",payload:{thread_token_usage:{input_tokens:100,output_tokens:20,cached_input_tokens:30}}},
      {type:"token_usage_record",payload:{thread_token_usage:{input_tokens:140,output_tokens:35,cached_input_tokens:50}}},
      {type:"token_usage_record",payload:{thread_token_usage:{input_tokens:10,output_tokens:2,cached_input_tokens:5}},message:"PRIVATE CONTENT"},
    ];
    const r=parseCodexRolloutJsonl(events.map(x=>JSON.stringify(x)).join("\n"));
    expect(r.rows[0].tokens.inputTotal).toBe(150);expect(r.rows[0].tokens.outputTotal).toBe(37);
    expect(JSON.stringify(r)).not.toContain("PRIVATE CONTENT");
    expect(r.status).toBe("PARTIAL");
  });
  it("CSV accepts BOM, quotes and user-supplied mapping without inferring a provider",()=>{
    const csv='\uFEFFstart;end;model;input;output\n"2026-11-01T00:00:00Z";"2026-11-02T00:00:00Z";"model, version";100;50';
    const rows=parseExplicitlyMappedCsv(csv,{delimiter:";",startUtcColumn:"start",endUtcColumn:"end",inputColumn:"input",outputColumn:"output",modelColumn:"model",sourceVersion:"manual-verified-v1",granularity:"bucket"});
    expect(rows[0].tokens.logicalTotal).toBe(150);expect(rows[0].modelRaw).toBe("model, version");
  });
  it("CSV formula-like tokens and malformed quoting cannot sneak in",()=>{
    const cfg={delimiter:"," as const,startUtcColumn:"start",endUtcColumn:"end",inputColumn:"input",outputColumn:"output",sourceVersion:"a",granularity:"bucket" as const};
    expect(()=>parseExplicitlyMappedCsv('start,end,input,output\n2026-11-01T00:00:00Z,2026-11-02T00:00:00Z,=3,20',cfg)).toThrow();
    expect(()=>parseExplicitlyMappedCsv('start,end,input,output\n"bad,10,20',cfg)).toThrow();
  });
});

const manualBase:PersonalAiUsageDraft = {
  source:"manual",sourceVersion:"2026-11",granularity:"manual",accountScope:null,
  periodStartUtc:"2026-11-01T00:00:00Z",periodEndUtc:"2026-11-02T00:00:00Z",modelRaw:null,modelCanonical:null,
  operator:null,execution:"cloud_api",inferenceRegion:null,requestCount:1,
  tokens:{inputTotal:12,inputUncached:null,cacheRead:null,cacheWrite:null,outputVisible:null,
    outputReasoning:null,outputTotal:8,reasoningRelation:"unknown",toolUseInput:null},
};
describe("lot 1 access settings compatible with lot 21",()=>{
  it("subscription retains the selected coding platform without inventing a price or entitlement",()=>{
    const result=normalizePersonalAiUsage({...manualBase,access:{billingMode:"SUBSCRIPTION",codingPlatformId:"codex",subscriptionPlanId:"plan-user-declared"}});
    expect(result.access?.billingMode).toBe("SUBSCRIPTION");
    expect(result.access?.codingPlatformId).toBe("codex");
    expect(result.cost).toBeUndefined();
  });
  it("rejects crossing local-owned, cloud, and subscription metadata boundaries",()=>{
    expect(()=>normalizePersonalAiUsage({...manualBase,access:{billingMode:"LOCAL_OWNED"}})).toThrow();
    expect(()=>normalizePersonalAiUsage({...manualBase,access:{billingMode:"API",codingPlatformId:"codex"}})).toThrow();
    expect(()=>normalizePersonalAiUsage({...manualBase,execution:"local_device",access:{billingMode:"SUBSCRIPTION"}})).toThrow();
    expect(normalizePersonalAiUsage({...manualBase,execution:"local_device",access:{billingMode:"LOCAL_OWNED"}}).access?.billingMode).toBe("LOCAL_OWNED");
  });
});
