import { describe, expect, it } from "vitest";
import { parseOpenAiOrganizationUsage, parseGeminiGenerateContentUsage } from "./ai-personal-import";
import { previewPersonalAiImport } from "./ai-personal-import-preview";

const openAi = { object: "page", data: [{ object: "bucket", start_time: 1730419200, end_time: 1730505600, results: [{
  input_tokens: 100, input_cached_tokens: 20, input_cache_write_tokens: 0, input_uncached_tokens: 80,
  output_tokens: 40, num_model_requests: 1, model: "gpt-4.1", project_id: "private-project-id", api_key_id: "key-a",
}] }], has_more: false, next_page: null };

describe("personal AI import preview identity and conflicts", () => {
  it("classifies exact repeats as duplicate and changed contents as revision", async () => {
    const first = (await parseOpenAiOrganizationUsage(openAi)).rows[0];
    const duplicate = previewPersonalAiImport([first], [{
      source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      import_metadata: first.metadata, declaration: first.declaration, status: "ACTIVE",
    }]);
    expect(duplicate[0].status).toBe("DUPLICATE");
    const revised = await parseOpenAiOrganizationUsage({ ...openAi, data: [{ ...openAi.data[0], results: [{ ...openAi.data[0].results[0], input_tokens: 120, input_uncached_tokens: 100 }] }] });
    expect(previewPersonalAiImport(revised.rows, [{
      source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      import_metadata: first.metadata, declaration: first.declaration, status: "ACTIVE",
    }])[0].status).toBe("REVISION");
  });

  it("blocks overlapping same-provider/model buckets and leaves unknown periods unconflicted", async () => {
    const first = (await parseOpenAiOrganizationUsage(openAi)).rows[0];
    const overlap = await parseOpenAiOrganizationUsage({ ...openAi, data: [{ ...openAi.data[0], start_time: openAi.data[0].start_time + 3600, end_time: openAi.data[0].end_time + 3600 }] });
    expect(previewPersonalAiImport(overlap.rows, [{
      source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      import_metadata: first.metadata, declaration: first.declaration, status: "ACTIVE",
    }])[0].status).toBe("CONFLICT");
    const cataloguedExisting = { ...first.declaration, modelRaw: null, modelCanonical: "gpt-4.1" };
    expect(previewPersonalAiImport(overlap.rows, [{
      source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      import_metadata: first.metadata, declaration: cataloguedExisting, status: "ACTIVE",
    }])[0].status).toBe("CONFLICT");
    const gemini = await parseGeminiGenerateContentUsage({ modelVersion: "gemini-model-example", usageMetadata: {
      promptTokenCount: 1, cachedContentTokenCount: 0, candidatesTokenCount: 1, toolUsePromptTokenCount: 0, thoughtsTokenCount: 0, totalTokenCount: 2,
    } });
    expect(previewPersonalAiImport(gemini.rows, [{
      source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      source_scope: first.sourceScope, import_metadata: first.metadata, declaration: first.declaration, status: "ACTIVE",
    }])[0].status).toBe("IDENTITY_INCOMPLETE");
  });

  it("allows disjoint OpenAI API-key scopes and blocks aggregate-to-subset overlap", async () => {
    const first = (await parseOpenAiOrganizationUsage(openAi)).rows[0];
    const store = [{ source_identity_hash: first.sourceIdentityHash, normalized_content_hash: first.normalizedContentHash,
      source_scope: first.sourceScope, import_metadata: first.metadata, declaration: first.declaration, status: "ACTIVE" as const }];
    const bucket = openAi.data[0];
    const differentKey = await parseOpenAiOrganizationUsage({ ...openAi, data: [{ ...bucket, results: [{ ...bucket.results[0], api_key_id: "key-b" }] }] });
    expect(previewPersonalAiImport(differentKey.rows, store)[0].status).toBe("READY");
    const global = await parseOpenAiOrganizationUsage({ ...openAi, data: [{ ...bucket, results: [{ ...bucket.results[0], api_key_id: null }] }] });
    expect(previewPersonalAiImport(global.rows, store)[0].status).toBe("CONFLICT");
  });

  it("keeps one exact duplicate in a file and blocks conflicting incoming revisions", async () => {
    const first = (await parseOpenAiOrganizationUsage(openAi)).rows[0];
    expect(previewPersonalAiImport([first, first]).map((item) => item.status)).toEqual(["READY", "DUPLICATE"]);
    const different = (await parseOpenAiOrganizationUsage({ ...openAi, data: [{ ...openAi.data[0], results: [{ ...openAi.data[0].results[0], input_tokens: 120, input_uncached_tokens: 100 }] }] })).rows[0];
    expect(previewPersonalAiImport([first, different]).map((item) => item.status)).toEqual(["CONFLICT", "CONFLICT"]);
  });
});
