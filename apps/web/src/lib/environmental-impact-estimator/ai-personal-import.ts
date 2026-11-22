import {
  normalizePersonalAiDeclaration,
  type PersonalAiDeclarationDraft,
  type PersonalAiNormalizedDeclaration,
} from "./personal-ai-usage-normalization";
import { isCountryCode } from "../user-location-preference";
import { hashPersonalAiImportValue } from "./ai-personal-import-hash";
import { reconstructCumulativeCounters, reconstructDirectCounters } from "../../../../../scripts/data/codex-usage-counter-reconstruction.mjs";

export type PersonalAiImportMetadata = {
  provider: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "OTHER";
  granularity: "PER_REQUEST" | "AGGREGATE" | "UNKNOWN";
  completeness: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  freshnessUtc: string | null;
};

export type PersonalAiImportRow = {
  declaration: PersonalAiNormalizedDeclaration;
  metadata: PersonalAiImportMetadata;
  costAmount: number | null;
  costCurrency: string | null;
  sourceIdentityHash: string;
  normalizedContentHash: string;
};

export type PersonalAiImportResult = {
  rows: readonly PersonalAiImportRow[];
  status: "READY" | "PARTIAL";
  warnings: readonly string[];
};

export const PERSONAL_AI_IMPORT_LIMITS = {
  jsonBytes: 10_000_000,
  jsonLines: 20_000,
  jsonlBytes: 50_000_000,
  jsonlLines: 250_000,
  csvBytes: 10_000_000,
  csvLines: 20_000,
  pdfBytes: 5_000_000,
  pdfPages: 20,
} as const;

type ImportDraft = Omit<PersonalAiDeclarationDraft, "periodStartUtc" | "periodEndUtc"> & {
  periodStartUtc: string | null;
  periodEndUtc: string | null;
};

type RecordValue = Record<string, unknown>;
const EMPTY_TOKENS: PersonalAiDeclarationDraft["tokens"] = {
  inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null,
  outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN",
};

function object(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: objet attendu`);
  return value as RecordValue;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: tableau attendu`);
  return value;
}

function count(value: unknown, label: string, optional = false): number | null {
  if (optional && (value === null || value === undefined)) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label}: entier non négatif requis`);
  return value;
}

function label(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function unixUtc(value: unknown, field: string): string {
  const seconds = count(value, field);
  const result = new Date(seconds! * 1000);
  if (!Number.isFinite(result.getTime())) throw new Error(`${field}: date invalide`);
  return result.toISOString();
}

function explicitIsoInstant(value: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ""] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const milliseconds = Number(fraction.padEnd(3, "0") || 0);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, milliseconds);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
    || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function baseDraft(
  provider: PersonalAiDeclarationDraft["provider"], sourceVersion: string, granularity: PersonalAiDeclarationDraft["granularity"],
  start: string | null, end: string | null,
): ImportDraft {
  return {
    provider, source: "PROVIDER_EXPORT", sourceVersion, provenance: "PROVIDER_REPORTED", granularity,
    periodStartUtc: start, periodEndUtc: end, modelRaw: null, modelCanonical: null, operator: null,
    execution: "CLOUD", inferenceRegion: null, access: "UNKNOWN", requestCount: null,
    tokens: { ...EMPTY_TOKENS }, modality: { images: null, audioMinutes: null, videoSeconds: null },
    energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
  };
}

export async function normalizePersonalAiImportRow(
  draft: ImportDraft, metadata: PersonalAiImportMetadata, identity: unknown, costAmount: number | null = null, costCurrency: string | null = null,
): Promise<PersonalAiImportRow> {
  const declaration = normalizePersonalAiDeclaration(draft);
  const stableIdentity = ["personal-ai-import-v1", identity];
  const canonicalContent = { declaration, metadata, costAmount, costCurrency };
  return {
    declaration, metadata, costAmount, costCurrency,
    sourceIdentityHash: await hashPersonalAiImportValue(stableIdentity),
    normalizedContentHash: await hashPersonalAiImportValue(canonicalContent),
  };
}

export async function parseOpenAiOrganizationUsage(value: unknown): Promise<PersonalAiImportResult> {
  const root = object(value, "OpenAI root");
  if (root.object !== "page") throw new Error("OpenAI : objet page non reconnu");
  const partial = root.has_more !== false || root.next_page !== null;
  const rows: PersonalAiImportRow[] = [];
  const buckets = array(root.data, "OpenAI data");
  for (const [bucketIndex, rawBucket] of buckets.entries()) {
    const bucket = object(rawBucket, `bucket ${bucketIndex}`);
    const start = unixUtc(bucket.start_time, "start_time");
    const end = unixUtc(bucket.end_time, "end_time");
    if (start >= end) throw new Error("OpenAI : bucket temporel invalide");
    for (const [resultIndex, rawResult] of array(bucket.results, "OpenAI results").entries()) {
      const result = object(rawResult, `result ${bucketIndex}/${resultIndex}`);
      const input = count(result.input_tokens, "input_tokens")!;
      const cached = count(result.input_cached_tokens, "input_cached_tokens", true);
      const written = count(result.input_cache_write_tokens, "input_cache_write_tokens", true);
      const uncached = count(result.input_uncached_tokens, "input_uncached_tokens", true);
      const output = count(result.output_tokens, "output_tokens")!;
      if ((cached ?? 0) + (written ?? 0) > input || (uncached !== null && cached !== null && written !== null && uncached + cached + written !== input)) {
        throw new Error("OpenAI : la ventilation d'entrée est incohérente");
      }
      const draft = baseDraft("OPENAI", "organization-usage-completions", "AGGREGATE", start, end);
      draft.modelRaw = label(result.model);
      draft.requestCount = count(result.num_model_requests, "num_model_requests", true);
      draft.tokens = { ...EMPTY_TOKENS, inputTotal: input, inputUncached: uncached, cacheRead: cached, cacheWrite: written, outputTotal: output };
      rows.push(await normalizePersonalAiImportRow(draft, { provider: "OPENAI", granularity: "AGGREGATE", completeness: partial ? "PARTIAL" : "COMPLETE", freshnessUtc: null },
        ["openai", "organization", result.project_id ?? null, start, end, result.model ?? null]));
    }
  }
  return { rows, status: partial ? "PARTIAL" : "READY", warnings: partial ? ["Pagination incomplète : données conservées comme partielles."] : [] };
}

export async function parseAnthropicAnalytics2026(value: unknown): Promise<PersonalAiImportResult> {
  const root = object(value, "Anthropic Analytics 2026 root");
  const partialPagination = root.has_more !== false || root.next_page !== null;
  const refreshedRaw = label(root.data_refreshed_at);
  const refreshedTimestamp = refreshedRaw === null ? null : explicitIsoInstant(refreshedRaw);
  const refreshed = refreshedTimestamp === null ? null : new Date(refreshedTimestamp).toISOString();
  const warnings: string[] = [];
  const rows: PersonalAiImportRow[] = [];
  for (const [index, rawLine] of array(root.data, "Anthropic data").entries()) {
    const line = object(rawLine, `Anthropic row ${index}`);
    const usage = object(line.usage, "Anthropic usage");
    const group = object(line.group, "Anthropic group");
    const cacheCreation = object(usage.cache_creation, "Anthropic cache creation");
    const write5m = count(cacheCreation.ephemeral_5m_input_tokens, "cache 5m")!;
    const write1h = count(cacheCreation.ephemeral_1h_input_tokens, "cache 1h")!;
    const uncached = count(usage.uncached_input_tokens, "uncached_input_tokens")!;
    const cached = count(usage.cache_read_input_tokens, "cache_read_input_tokens")!;
    const input = uncached + cached + write5m + write1h;
    const output = count(usage.output_tokens, "output_tokens")!;
    if (!Number.isSafeInteger(input + output)) throw new Error("Anthropic : dépassement de compteur");
    if (count(usage.total_tokens, "total_tokens") !== input + output) throw new Error("Anthropic : total_tokens incohérent");
    const start = label(line.starting_at);
    const end = label(line.ending_at);
    const startTimestamp = start === null ? null : explicitIsoInstant(start);
    const endTimestamp = end === null ? null : explicitIsoInstant(end);
    if (startTimestamp === null || endTimestamp === null || startTimestamp >= endTimestamp) throw new Error("Anthropic : période invalide");
    const freshnessIsCurrent = refreshedTimestamp !== null && refreshedTimestamp >= endTimestamp;
    const complete = !partialPagination && freshnessIsCurrent;
    if (!freshnessIsCurrent) warnings.push("Fraîcheur Anthropic non démontrée pour une ou plusieurs lignes.");
    const draft = baseDraft("ANTHROPIC", "analytics-usage-cost-2026-08-24", "AGGREGATE", new Date(startTimestamp).toISOString(), new Date(endTimestamp).toISOString());
    draft.modelRaw = label(group.model);
    const reportedRegion = label(group.inference_geo)?.toUpperCase() ?? null;
    draft.inferenceRegion = reportedRegion === null ? null : reportedRegion === "UNKNOWN" || isCountryCode(reportedRegion) ? reportedRegion : "UNKNOWN";
    draft.requestCount = count(usage.requests, "requests", true);
    draft.tokens = { ...EMPTY_TOKENS, inputTotal: input, inputUncached: uncached, cacheRead: cached, cacheWrite: write5m + write1h, outputTotal: output };
    rows.push(await normalizePersonalAiImportRow(draft, { provider: "ANTHROPIC", granularity: "AGGREGATE", completeness: complete ? "COMPLETE" : "PARTIAL", freshnessUtc: refreshed },
      ["anthropic", "analytics-2026", group.workspace_id ?? null, group.model ?? null, start, end]));
  }
  const partial = partialPagination || rows.some((row) => row.metadata.completeness !== "COMPLETE");
  if (partialPagination) warnings.push("Pagination Anthropic incomplète.");
  return { rows, status: partial ? "PARTIAL" : "READY", warnings: [...new Set(warnings)] };
}

export async function parseGeminiGenerateContentUsage(value: unknown): Promise<PersonalAiImportResult> {
  const root = object(value, "Gemini response");
  const usage = object(root.usageMetadata, "Gemini usageMetadata");
  const prompt = count(usage.promptTokenCount, "promptTokenCount")!;
  const tool = count(usage.toolUsePromptTokenCount, "toolUsePromptTokenCount")!;
  const candidates = count(usage.candidatesTokenCount, "candidatesTokenCount")!;
  const thoughts = count(usage.thoughtsTokenCount, "thoughtsTokenCount")!;
  const total = count(usage.totalTokenCount, "totalTokenCount")!;
  const cache = count(usage.cachedContentTokenCount, "cachedContentTokenCount", true);
  if (prompt + tool + candidates + thoughts !== total || (cache !== null && cache > prompt)) throw new Error("Gemini : total ou cache incohérent");
  const draft = baseDraft("GOOGLE", "GenerateContentResponse.usageMetadata", "PER_REQUEST", null, null);
  draft.modelRaw = label(root.modelVersion);
  draft.requestCount = 1;
  draft.tokens = { ...EMPTY_TOKENS, inputTotal: prompt + tool, inputUncached: cache === null ? null : prompt - cache + tool, cacheRead: cache,
    outputVisible: candidates, outputReasoning: thoughts, outputTotal: candidates + thoughts, reasoningRelation: "ADDITIONAL" };
  const row = await normalizePersonalAiImportRow(draft, { provider: "GOOGLE", granularity: "PER_REQUEST", completeness: "COMPLETE", freshnessUtc: null }, ["gemini-response", draft.modelRaw, total, draft.tokens]);
  return { rows: [row], status: "READY", warnings: ["Le cache est inclus dans promptTokenCount; les tokens outils sont inclus dans l'entrée, et le raisonnement est additionnel."] };
}

function createCodexRolloutAccumulator() {
  const threadRecords: { event: RecordValue }[] = [];
  const infoRecords: { event: RecordValue }[] = [];
  const directRecords: { event: RecordValue }[] = [];
  let lineCount = 0;
  const sessionIds = new Set<string>();
  const fields = ["input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens"];
  function addLine(line: string) {
    if (!line.trim()) return;
    lineCount += 1;
    if (lineCount > PERSONAL_AI_IMPORT_LIMITS.jsonlLines) throw new Error("Trop de lignes JSONL");
    let event: RecordValue;
    try { event = object(JSON.parse(line) as unknown, "Codex event"); }
    catch { throw new Error("JSONL Codex invalide; le contenu brut n'est pas conservé"); }
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload as RecordValue : null;
    if (!payload) return;
    if (typeof payload.session_id === "string" && payload.session_id.length <= 128) sessionIds.add(payload.session_id);
    const copyCounters = (value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const source = value as RecordValue;
      const counters: RecordValue = {};
      for (const field of fields) {
        if (source[field] === undefined || source[field] === null) continue;
        counters[field] = count(source[field], `Codex ${field}`);
      }
      return counters;
    };
    if (event.type === "token_usage_record" && payload.thread_token_usage) {
      const counters = copyCounters(payload.thread_token_usage);
      if (counters) threadRecords.push({ event: { payload: { thread_token_usage: counters } } });
    }
    else if (event.type === "event_msg" && payload.info && typeof payload.info === "object" && (payload.info as RecordValue).total_token_usage) {
      const counters = copyCounters((payload.info as RecordValue).total_token_usage);
      if (counters) infoRecords.push({ event: { payload: { total_token_usage: counters } } });
    } else if (event.type === "token_usage_record" && payload.usage) {
      const counters = copyCounters(payload.usage);
      if (counters) directRecords.push({ event: { payload: { usage: counters } } });
    }
  }
  async function finish(): Promise<PersonalAiImportResult> {
  if (sessionIds.size > 1) throw new Error("Le JSONL contient plusieurs sessions; import séparé requis");
  const records = threadRecords.length ? threadRecords : infoRecords.length ? infoRecords : directRecords;
  const sourceKey = threadRecords.length ? "thread_token_usage" : infoRecords.length ? "total_token_usage" : "usage";
  if (!records.length) throw new Error("Aucun compteur Codex utilisable");
  const reconstruction = threadRecords.length || infoRecords.length
    ? reconstructCumulativeCounters(records, { fields, sourceKey })
    : reconstructDirectCounters(records, { fields, sourceKey });
  const values = reconstruction.values;
  const numeric = (field: string) => typeof values[field] === "number" ? values[field] as number : null;
  const input = numeric("input_tokens");
  const cached = numeric("cached_input_tokens");
  const cacheWrite = numeric("cache_write_input_tokens");
  const rawOutput = numeric("output_tokens");
  const reasoning = numeric("reasoning_output_tokens");
  const directTotal = numeric("total_tokens");
  let coherentTotal = directTotal;
  if (input !== null && rawOutput !== null && directTotal !== null && directTotal !== input + rawOutput) coherentTotal = null;
  const uncached = input !== null && cached !== null && cacheWrite !== null && input >= cached + cacheWrite ? input - cached - cacheWrite : null;
  const visible = rawOutput !== null && reasoning !== null && rawOutput >= reasoning ? rawOutput - reasoning : null;
  const outputNormalized = visible !== null && reasoning !== null ? visible + reasoning : rawOutput;
  const draft = baseDraft("OTHER", "codex-rollout-jsonl-cumulative-reset", "AGGREGATE", null, null);
  draft.tokens = { ...EMPTY_TOKENS, inputTotal: input, inputUncached: uncached, cacheRead: cached, cacheWrite,
    outputVisible: visible, outputReasoning: reasoning, outputTotal: outputNormalized, reasoningRelation: "INCLUDED" };
  const sessionId = sessionIds.values().next().value ?? null;
  const identity = sessionId === null
    ? ["codex-rollout-content", input, cached, cacheWrite, rawOutput, reasoning, directTotal]
    : ["codex-rollout", sessionId];
  const row = await normalizePersonalAiImportRow(draft,
    { provider: "OTHER", granularity: "AGGREGATE", completeness: "PARTIAL", freshnessUtc: null }, identity);
  const warnings = ["Période et type d'accès non identifiés; ce relevé de session reste hors agrégation temporelle."];
  if (coherentTotal === null && directTotal !== null) warnings.push("Le total Codex fourni est incohérent; il reste inconnu.");
  if (sessionIds.size === 0) warnings.push("Identifiant de session absent; seul un import strictement identique est idempotent.");
  return { rows: [row], status: "PARTIAL", warnings };
  }
  return { addLine, finish };
}

export async function parseCodexRolloutJsonl(jsonl: string): Promise<PersonalAiImportResult> {
  if (new TextEncoder().encode(jsonl).byteLength > PERSONAL_AI_IMPORT_LIMITS.jsonlBytes) throw new Error("Fichier JSONL trop volumineux");
  const parser = createCodexRolloutAccumulator();
  for (const line of jsonl.split(/\r?\n/)) parser.addLine(line);
  return parser.finish();
}

export async function parseCodexRolloutJsonlStream(stream: ReadableStream<Uint8Array>): Promise<PersonalAiImportResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parser = createCodexRolloutAccumulator();
  let remainder = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > PERSONAL_AI_IMPORT_LIMITS.jsonlBytes) throw new Error("Fichier JSONL trop volumineux");
      const text = remainder + decoder.decode(value, { stream: true });
      const lines = text.split(/\r?\n/);
      remainder = lines.pop() ?? "";
      for (const line of lines) parser.addLine(line);
    }
    remainder += decoder.decode();
    parser.addLine(remainder);
    return await parser.finish();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof TypeError) throw new Error("JSONL: encodage UTF-8 invalide");
    throw error;
  } finally { reader.releaseLock(); }
}

export async function parsePersonalAiJson(text: string): Promise<PersonalAiImportResult> {
  if (new TextEncoder().encode(text).byteLength > PERSONAL_AI_IMPORT_LIMITS.jsonBytes) throw new Error("JSON trop volumineux");
  if ((text.match(/\n/g)?.length ?? 0) + 1 > PERSONAL_AI_IMPORT_LIMITS.jsonLines) throw new Error("JSON au-delà de la limite de lignes prises en charge");
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { throw new Error("JSON invalide; le contenu brut n'est pas conservé"); }
  const root = object(value, "JSON root");
  let result: PersonalAiImportResult;
  if (root.object === "page" && Array.isArray(root.data) && root.data.every((entry) => {
    const bucket = entry && typeof entry === "object" && !Array.isArray(entry) ? entry as RecordValue : null;
    return bucket?.object === "bucket" && Array.isArray(bucket.results);
  })) result = await parseOpenAiOrganizationUsage(root);
  else if (Array.isArray(root.data) && root.data.every((entry) => {
    const row = entry && typeof entry === "object" && !Array.isArray(entry) ? entry as RecordValue : null;
    return row !== null && typeof row.starting_at === "string" && typeof row.ending_at === "string" && row.usage !== undefined;
  })) result = await parseAnthropicAnalytics2026(root);
  else if (root.usageMetadata && typeof root.usageMetadata === "object") result = await parseGeminiGenerateContentUsage(root);
  else throw new Error("Format JSON non supporté; aucun schéma fournisseur n'a été reconnu avec certitude");
  if (result.rows.length > PERSONAL_AI_IMPORT_LIMITS.jsonLines) throw new Error("JSON au-delà de la limite de lignes prises en charge");
  return result;
}

function parseInvoiceAmount(raw: string): number {
  const normalized = raw.trim().replace(/[\s']/g, "");
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  let canonical = normalized;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    canonical = normalized.replace(decimalSeparator === "," ? /\./g : /,/g, "").replace(decimalSeparator, ".");
  } else if (comma >= 0) {
    canonical = /,\d{1,2}$/.test(normalized) ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  } else if (dot >= 0 && !/\.\d{1,2}$/.test(normalized)) canonical = normalized.replace(/\./g, "");
  const amount = Number(canonical);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Montant PDF invalide");
  return amount;
}

function explicitPdfToken(text: string, pattern: RegExp): number | null {
  const raw = pattern.exec(text)?.[1];
  if (raw === undefined) return null;
  const digits = raw.replace(/[\s,._']/g, "");
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Compteur de tokens PDF invalide");
  return value;
}

export async function parsePersonalAiTextualPdf(file: File): Promise<PersonalAiImportResult> {
  if (file.size > PERSONAL_AI_IMPORT_LIMITS.pdfBytes) throw new Error("PDF trop volumineux");
  let loadingTask: {
    promise: Promise<{ numPages: number; getPage(page: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }> }>;
    destroy(): Promise<void>;
  } | null = null;
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false });
    const pdfDocument = await loadingTask.promise;
    if (pdfDocument.numPages < 1 || pdfDocument.numPages > PERSONAL_AI_IMPORT_LIMITS.pdfPages) throw new Error("PDF hors limite de pages");
    let text = "";
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      text += `${content.items.flatMap((item) => {
        if (!item || typeof item !== "object" || !("str" in item) || typeof item.str !== "string") return [];
        return [item.str];
      }).join(" ")}\n`;
    }
    if (text.trim().length === 0) throw new Error("PDF sans texte extractible; les PDF scannés ne sont pas pris en charge");

    const inputTotal = explicitPdfToken(text, /\b(?:input|prompt)\s+tokens?\s*[:=]\s*([0-9][0-9\s,._']*)/i);
    const outputTotal = explicitPdfToken(text, /\b(?:output|completion)\s+tokens?\s*[:=]\s*([0-9][0-9\s,._']*)/i);
    const invoiceId = /\binvoice(?:\s+(?:number|no\.?))?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,63})/i.exec(text)?.[1] ?? null;
    const issuer = /\b(?:vendor|supplier|provider)\s*[:=]\s*([A-Z0-9][A-Z0-9._-]{1,63})\b/i.exec(text)?.[1]?.toLowerCase() ?? null;
    const money = /\b(?:invoice\s+)?(?:total|amount\s+due)\s*[:=]?\s*(?:(EUR|USD|GBP|CAD|AUD|JPY|€|\$|£)\s*([0-9][0-9\s.,']*)|([0-9][0-9\s.,']*)\s*(EUR|USD|GBP|CAD|AUD|JPY|€|\$|£))(?![A-Z])/i.exec(text);
    const currencyToken = money?.[1] ?? money?.[4] ?? null;
    const rawAmount = money?.[2] ?? money?.[3] ?? null;
    if (currencyToken === "$") throw new Error("Symbole dollar ambigu; un code devise explicite est requis");
    const currencyMap: Record<string, string> = { "€": "EUR", "£": "GBP" };
    const currency = currencyToken ? currencyMap[currencyToken] ?? currencyToken : null;
    const costAmount = rawAmount === null ? null : parseInvoiceAmount(rawAmount);
    if (inputTotal === null && outputTotal === null && costAmount === null) throw new Error("Aucun coût ou compteur explicitement libellé n'a été trouvé dans le PDF");
    const draft = baseDraft("OTHER", "textual-pdf-invoice-v1", "UNKNOWN", null, null);
    draft.source = "MANUAL";
    draft.provenance = "USER_DECLARED";
    draft.tokens = { ...EMPTY_TOKENS, inputTotal, outputVisible: outputTotal, outputTotal, reasoningRelation: "UNKNOWN" };
    const normalizedIdentity = invoiceId && issuer
      ? ["invoice-id", issuer, invoiceId]
      : ["invoice-content-digest", await hashPersonalAiImportValue(text)];
    const row = await normalizePersonalAiImportRow(draft,
      { provider: "OTHER", granularity: "UNKNOWN", completeness: "PARTIAL", freshnessUtc: null },
      normalizedIdentity, costAmount, currency);
    return { rows: [row], status: "PARTIAL", warnings: [
      "PDF analysé localement; aucune période, région, fournisseur ou activité absente du texte n'est inventée.",
      inputTotal === null || outputTotal === null ? "Le coût seul ne permet pas de déduire tokens, énergie ou CO₂e." : "Les tokens extraits restent une déclaration partielle faute de ventilation complète.",
    ] };
  } catch (error) {
    if (error instanceof Error && /hors limite|sans texte|Aucun coût|invalide|devise explicite/.test(error.message)) throw error;
    throw new Error("PDF chiffré, illisible ou non pris en charge; son contenu n'a pas été conservé");
  } finally {
    await loadingTask?.destroy().catch(() => undefined);
  }
}
