import { describe, expect, it, vi } from "vitest";
const pdfMocks = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: "" } }));
vi.mock("pdfjs-dist", () => pdfMocks);
import {
  parseAnthropicAnalytics2026,
  parseCodexRolloutJsonl,
  parseCodexRolloutJsonlStream,
  parseGeminiGenerateContentUsage,
  parseOpenAiOrganizationUsage,
  parsePersonalAiTextualPdf,
} from "./ai-personal-import";
import { hashPersonalAiImportValue } from "./ai-personal-import-hash";

const openAiFixture = {
  object: "page", data: [{ object: "bucket", start_time: 1730419200, end_time: 1730505600, results: [{
    input_tokens: 1000, input_cached_tokens: 400, input_cache_write_tokens: 100, input_uncached_tokens: 500,
    output_tokens: 500, num_model_requests: 5, model: null, project_id: null,
  }] }], has_more: false, next_page: null,
};

const anthropicFixture = {
  data: [{ starting_at: "2026-09-03T00:00:00Z", ending_at: "2026-09-04T00:00:00Z",
    group: { model: "claude-sonnet-5", inference_geo: null, workspace_id: null },
    usage: { uncached_input_tokens: 1_284_500, cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 215_300 },
      cache_read_input_tokens: 3_200_000, output_tokens: 891_000, total_tokens: 5_590_800, requests: 4210 } }],
  has_more: false, next_page: null, data_refreshed_at: "2026-09-18T16:02:11Z",
};

const geminiFixture = { modelVersion: "gemini-model-example", usageMetadata: {
  promptTokenCount: 231, cachedContentTokenCount: 50, candidatesTokenCount: 242, toolUsePromptTokenCount: 0,
  thoughtsTokenCount: 524, totalTokenCount: 997,
} };

describe("personal AI provider imports", () => {
  it("hashes normalized objects independently of property insertion order", async () => {
    expect(await hashPersonalAiImportValue({ first: 1, nested: { left: 2, right: 3 } }))
      .toBe(await hashPersonalAiImportValue({ nested: { right: 3, left: 2 }, first: 1 }));
  });

  it("parses OpenAI buckets without adding cache twice and retains missing model/region", async () => {
    const { rows, status } = await parseOpenAiOrganizationUsage(openAiFixture);
    expect(status).toBe("READY");
    expect(rows[0].declaration.tokens).toMatchObject({ inputTotal: 1000, cacheRead: 400, cacheWrite: 100, outputTotal: 500, logicalTotal: 1500 });
    expect(rows[0].declaration.modelRaw).toBeNull();
    expect(rows[0].declaration.inferenceRegion).toBeNull();
  });

  it("marks a paginated OpenAI response incomplete and rejects cache above input", async () => {
    expect((await parseOpenAiOrganizationUsage({ ...openAiFixture, has_more: true, next_page: "cursor" })).status).toBe("PARTIAL");
    const bucket = openAiFixture.data[0];
    await expect(parseOpenAiOrganizationUsage({ ...openAiFixture, data: [{ ...bucket, results: [{ ...bucket.results[0], input_cached_tokens: 1100 }] }] })).rejects.toThrow();
  });

  it("uses Anthropic's mutually exclusive cache inputs and freshness timestamp", async () => {
    const result = await parseAnthropicAnalytics2026(anthropicFixture);
    expect(result.status).toBe("READY");
    expect(result.rows[0].declaration.tokens).toMatchObject({ inputTotal: 4_699_800, outputTotal: 891_000, logicalTotal: 5_590_800 });
    expect(result.rows[0].declaration.requestCount).toBe(4210);
    expect(result.rows[0].metadata.freshnessUtc).toBe("2026-09-18T16:02:11.000Z");
  });

  it("keeps stale and paginated Anthropic analytics partial and rejects legacy envelopes", async () => {
    expect((await parseAnthropicAnalytics2026({ ...anthropicFixture, data_refreshed_at: "2026-09-02T00:00:00Z" })).status).toBe("PARTIAL");
    expect((await parseAnthropicAnalytics2026({ ...anthropicFixture, has_more: true, next_page: "cursor" })).status).toBe("PARTIAL");
    const localTimeOnly = { ...anthropicFixture, data: [{ ...anthropicFixture.data[0], starting_at: "2026-09-03T00:00:00", }] };
    await expect(parseAnthropicAnalytics2026(localTimeOnly)).rejects.toThrow(/période invalide/);
    await expect(parseAnthropicAnalytics2026({ data: [{ bucket: { results: [] } }], has_more: false, next_page: null })).rejects.toThrow();
  });

  it("keeps Gemini cache inside prompt, adds reasoning and tools once, and leaves time unknown", async () => {
    const result = await parseGeminiGenerateContentUsage(geminiFixture);
    expect(result.rows[0].declaration.tokens).toMatchObject({ inputTotal: 231, cacheRead: 50, outputVisible: 242, outputReasoning: 524, outputTotal: 766, logicalTotal: 997 });
    expect(result.rows[0].declaration.periodStartUtc).toBeNull();
    const toolFixture = { ...geminiFixture, usageMetadata: { ...geminiFixture.usageMetadata, toolUsePromptTokenCount: 100, totalTokenCount: 1097 } };
    expect((await parseGeminiGenerateContentUsage(toolFixture)).rows[0].declaration.tokens.logicalTotal).toBe(1097);
    await expect(parseGeminiGenerateContentUsage({ ...geminiFixture, usageMetadata: { ...geminiFixture.usageMetadata, totalTokenCount: 473 } })).rejects.toThrow();
  });

  it("reconstructs Codex cumulative increments and resets without retaining transcript text", async () => {
    const lines = [
      { type: "token_usage_record", payload: { session_id: "session-fixture", thread_token_usage: { input_tokens: 100, cached_input_tokens: 30, cache_write_input_tokens: 0, output_tokens: 20, reasoning_output_tokens: 5, total_tokens: 120 }, message: "PRIVATE" } },
      { type: "token_usage_record", payload: { session_id: "session-fixture", thread_token_usage: { input_tokens: 140, cached_input_tokens: 50, cache_write_input_tokens: 0, output_tokens: 35, reasoning_output_tokens: 8, total_tokens: 175 } } },
      { type: "token_usage_record", payload: { session_id: "session-fixture", thread_token_usage: { input_tokens: 10, cached_input_tokens: 5, cache_write_input_tokens: 0, output_tokens: 2, reasoning_output_tokens: 1, total_tokens: 12 } } },
    ].map((line) => JSON.stringify(line)).join("\n");
    const result = await parseCodexRolloutJsonl(lines);
    expect(result.rows[0].declaration.tokens).toMatchObject({ inputTotal: 150, cacheRead: 55, outputTotal: 37, logicalTotal: 187 });
    expect(result.status).toBe("PARTIAL");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });

  it("rejects multiple Codex sessions and preserves content-free parse errors", async () => {
    const content = [{ type: "token_usage_record", payload: { session_id: "a", thread_token_usage: { input_tokens: 1 } } },
      { type: "token_usage_record", payload: { session_id: "b", thread_token_usage: { input_tokens: 2 } } }].map((event) => JSON.stringify(event)).join("\n");
    await expect(parseCodexRolloutJsonl(content)).rejects.toThrow(/plusieurs sessions/);
    await expect(parseCodexRolloutJsonl('{"message":"private text"}')).rejects.toThrow(/Aucun compteur/);
  });

  it("parses Codex JSONL from UTF-8 chunks incrementally", async () => {
    const encoder = new TextEncoder();
    const lines = [
      JSON.stringify({ type: "token_usage_record", payload: { session_id: "chunked", thread_token_usage: { input_tokens: 10, cached_input_tokens: 2, cache_write_input_tokens: 0, output_tokens: 5, reasoning_output_tokens: 1, total_tokens: 15 } } }),
      JSON.stringify({ type: "token_usage_record", payload: { session_id: "chunked", thread_token_usage: { input_tokens: 14, cached_input_tokens: 3, cache_write_input_tokens: 0, output_tokens: 7, reasoning_output_tokens: 2, total_tokens: 21 } } }),
    ].join("\n");
    const bytes = encoder.encode(lines);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(bytes.slice(0, 23)); controller.enqueue(bytes.slice(23)); controller.close(); },
    });
    const result = await parseCodexRolloutJsonlStream(stream);
    expect(result.rows[0].declaration.tokens.logicalTotal).toBe(21);
  });

  it("extracts only explicitly labeled text PDF cost and keeps tokens unknown", async () => {
    pdfMocks.getDocument.mockReturnValue({ promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "Invoice Total EUR 34.20" }] }) }),
    }), destroy: async () => undefined });
    const input = new File(["synthetic pdf"], "invoice.pdf", { type: "application/pdf" });
    const result = await parsePersonalAiTextualPdf(input);
    expect(result.status).toBe("PARTIAL");
    expect(result.rows[0].costAmount).toBe(34.2);
    expect(result.rows[0].costCurrency).toBe("EUR");
    expect(result.rows[0].declaration.tokens.logicalTotal).toBeNull();
    expect(result.rows[0].declaration.periodStartUtc).toBeNull();
  });

  it("does not guess a currency from an ambiguous dollar symbol", async () => {
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "Invoice Total $ 34.20" }] }) }) }), destroy: async () => undefined });
    await expect(parsePersonalAiTextualPdf(new File(["dollar invoice"], "invoice.pdf", { type: "application/pdf" })))
      .rejects.toThrow(/code devise explicite/);
  });

  it("uses an explicit issuer plus invoice ID as stable identity for a revised PDF", async () => {
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "Vendor: OpenAI invoice # INV-2026-04 Total EUR 34.20" }] }) }) }), destroy: async () => undefined });
    const first = await parsePersonalAiTextualPdf(new File(["invoice one"], "invoice.pdf", { type: "application/pdf" }));
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "Vendor: OpenAI invoice # INV-2026-04 Total EUR 35.20" }] }) }) }), destroy: async () => undefined });
    const revised = await parsePersonalAiTextualPdf(new File(["invoice two"], "invoice.pdf", { type: "application/pdf" }));
    expect(revised.rows[0].sourceIdentityHash).toBe(first.rows[0].sourceIdentityHash);
    expect(revised.rows[0].normalizedContentHash).not.toBe(first.rows[0].normalizedContentHash);
  });

  it("rejects scanned and excessive-page PDFs without OCR", async () => {
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }), destroy: async () => undefined });
    const scanned = new File(["scanned"], "scan.pdf", { type: "application/pdf" });
    await expect(parsePersonalAiTextualPdf(scanned)).rejects.toThrow(/sans texte extractible/);
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 21, getPage: vi.fn() }), destroy: async () => undefined });
    await expect(parsePersonalAiTextualPdf(scanned)).rejects.toThrow(/limite de pages/);
  });
});
