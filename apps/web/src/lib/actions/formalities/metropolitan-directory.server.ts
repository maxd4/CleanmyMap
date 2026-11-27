import { fetchJsonWithTimeout, type FetchLike } from "@/lib/geo/action-department-resolver";
import { isMetropolitanCommune, type ServiceType, type DirectoryContact } from "./metropolitan-contacts-contract";
import type { SupportNeed } from "./accompaniment";

const BASE = "https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/";
const COMPETENCE = "api-lannuaire-administration-locale-competence-geographique";
const CONTACTS = "api-lannuaire-administration";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 30;
const MAX_COMPETENCE_ROWS = 200;
const BATCH = 15;
const MAX_DETAIL_BATCHES = 2;
const TTL = 6 * 60 * 60 * 1000;
type Result = { contacts: DirectoryContact[]; complete: boolean };
const cache = new Map<string, { expires: number; value: Result }>();
const pending = new Map<string, Promise<Result>>();

export const MAX_DILA_REQUESTS_PER_ACTION = 48;
export type DilaRequestBudget = { remaining: number; used: number };

export function createDilaRequestBudget(limit = MAX_DILA_REQUESTS_PER_ACTION): DilaRequestBudget {
  return { remaining: Math.max(0, Math.trunc(limit)), used: 0 };
}

const NEED_TYPE_SIGNALS: Partial<Record<SupportNeed, RegExp>> = {
  notify: /(?:mairie|commune|pref|gendarmerie|commissariat|police)/,
  equipment: /(?:mairie|commune|epci|metropole|intercommunal|dechet|proprete)/,
  pickup: /(?:dechet|collecte|syndicat|epci|metropole|intercommunal|mairie|commune)/,
  safety: /(?:police|gendarmerie|pref|sdis|pompier|ddpn|dipn|ofb)/,
  communication: /(?:mairie|commune|epci|metropole|intercommunal)/,
};

function relevance(types: readonly ServiceType[], needs: readonly SupportNeed[]): number {
  if (needs.length === 0) return types.some((type) => /^(?:mairie|commune)$/.test(type)) ? 1 : 0;
  return needs.reduce((score, need) => {
    const signal = NEED_TYPE_SIGNALS[need];
    return score + (signal && types.some((type) => signal.test(type)) ? 1 : 0);
  }, 0);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try { const data: unknown = JSON.parse(value); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function https(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; }
  catch { return null; }
}
function values(value: unknown, predicate: (value: string) => boolean): string[] {
  const parsed = array(value);
  const entries = typeof value === "string" && value.trim() && parsed.length === 0
    ? [value]
    : parsed;
  const list = entries.flatMap(item => {
    const v = str(item) ?? str(record(item)?.valeur);
    return v && predicate(v) ? [v] : [];
  });
  return [...new Set(list)].slice(0, 10);
}
function isType(value: unknown): value is ServiceType {
  return typeof value === "string" && /^[a-z0-9_]{1,80}$/.test(value);
}
async function records(dataset: string, where: string, select: string, fetchImpl: FetchLike, offset = 0, budget?: DilaRequestBudget, orderBy = "id") {
  if (budget) {
    if (budget.remaining <= 0) return null;
    budget.remaining -= 1;
    budget.used += 1;
  }
  const url = new URL(BASE + dataset + "/records");
  url.searchParams.set("where", where);
  url.searchParams.set("select", select);
  url.searchParams.set("limit", "100");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("order_by", orderBy);
  const data = record(await fetchJsonWithTimeout(fetchImpl, url.href));
  if (!data || !Array.isArray(data.results) || typeof data.total_count !== "number" ||
    !Number.isSafeInteger(data.total_count) || data.total_count < data.results.length) {
    throw new Error("Invalid DILA response");
  }
  return { rows: data.results as unknown[], total_count: data.total_count, complete: offset + data.results.length >= data.total_count };
}

function parseContact(raw: unknown, types: ServiceType[], commune: string, retrievedAt: string): DirectoryContact | null {
  const row = record(raw);
  if (!row) return null;
  const id = str(row.id);
  const name = str(row.nom);
  const directoryUrl = https(row.url_service_public);
  if (!id || !ID.test(id) || !name || !directoryUrl ||
    (row.statut_de_diffusion !== true && row.statut_de_diffusion !== "true") ||
    !["lannuaire.service-public.gouv.fr","lannuaire.service-public.fr"].includes(new URL(directoryUrl).hostname)) return null;
  return {
    id, name, types, communeCodes: [commune], retrievedAt, directoryUrl,
    territorialRelation: "official_geographic_competence" as const,
    taskCompetence: "not_verified" as const,
    phones: values(row.telephone, v => /^[+0-9(). /-]{5,30}$/.test(v)),
    emails: values(row.adresse_courriel, v => /^[A-Za-z0-9.!#$%&'*+/=_~^+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)),
    websites: values(row.site_internet, v => Boolean(https(v))),
    formUrl: https(row.formulaire_contact) ?? values(row.formulaire_contact, v => Boolean(https(v)))[0] ?? null,
  };
}

async function lookup(code: string, fetchImpl: FetchLike, needs: readonly SupportNeed[], budget?: DilaRequestBudget): Promise<Result> {
  if (!isMetropolitanCommune(code)) return { contacts: [], complete: false };
  const where = 'code_insee_commune = "' + code + '"';
  const competence = await records(COMPETENCE, where,
    "code_insee_commune,code_type_service_local,id_service_local", fetchImpl, 0, budget,
    "code_insee_commune,code_type_service_local,id_service_local");
  if (!competence) return { contacts: [], complete: false };
  const rows = [...competence.rows];
  let complete = competence.rows.length >= Math.min(competence.total_count, 100);
  const cappedTotal = Math.min(competence.total_count, MAX_COMPETENCE_ROWS);
  for (let offset = 100; offset < cappedTotal; offset += 100) {
    const page = await records(COMPETENCE, where,
      "code_insee_commune,code_type_service_local,id_service_local", fetchImpl, offset, budget,
      "code_insee_commune,code_type_service_local,id_service_local");
    if (!page) { complete = false; break; }
    rows.push(...page.rows);
    if (page.rows.length < Math.min(100, competence.total_count - offset)) complete = false;
  }
  if (competence.total_count > MAX_COMPETENCE_ROWS) complete = false;
  const ids = new Map<string, Set<ServiceType>>();
  for (const raw of rows) {
    const row = record(raw);
    if (!row || row.code_insee_commune !== code || !isType(row.code_type_service_local)) {
      complete = false; continue;
    }
    const serviceIds = array(row.id_service_local);
    if (!serviceIds.length) complete = false;
    for (const id of serviceIds) {
      if (typeof id !== "string" || !ID.test(id)) { complete = false; continue; }
      const set = ids.get(id) ?? new Set<ServiceType>();
      set.add(row.code_type_service_local);
      ids.set(id, set);
    }
  }
  if (!ids.size) return { contacts: [], complete: false };
  const selected = [...ids.keys()].sort((left, right) =>
    relevance([...(ids.get(right) ?? [])], needs) - relevance([...(ids.get(left) ?? [])], needs) ||
    left.localeCompare(right),
  ).slice(0, MAX_IDS);
  if (selected.length !== ids.size) complete = false;
  const contacts = new Map<string, DirectoryContact>();
  const now = new Date().toISOString();
  for (let i = 0, detailBatches = 0; i < selected.length && detailBatches < MAX_DETAIL_BATCHES; i += BATCH, detailBatches += 1) {
    const batch = selected.slice(i, i + BATCH);
    try {
      const detail = await records(CONTACTS, batch.map(id => 'id = "' + id + '"').join(" OR "),
        "id,nom,telephone,adresse_courriel,site_internet,formulaire_contact,url_service_public,statut_de_diffusion", fetchImpl, 0, budget);
      if (!detail) { complete = false; break; }
      if (!detail.complete) complete = false;
      for (const raw of detail.rows) {
        const id = str(record(raw)?.id);
        if (!id || !batch.includes(id)) { complete = false; continue; }
        const contact = parseContact(raw, [...(ids.get(id) ?? [])].sort(), code, now);
        if (contact) contacts.set(id, contact); else complete = false;
      }
    } catch { complete = false; }
  }
  if (selected.length > MAX_DETAIL_BATCHES * BATCH) complete = false;
  return { contacts: [...contacts.values()], complete: complete && contacts.size === selected.length };
}

/** Process-local bounded cache; no private data and no failed-result cache. */
export async function lookupMetropolitanContacts(
  code: string,
  fetchImpl?: FetchLike,
  needs: readonly SupportNeed[] = [],
  budget?: DilaRequestBudget,
): Promise<Result> {
  if (!isMetropolitanCommune(code)) return { contacts: [], complete: false };
  const cacheKey = `${code}:${[...needs].sort().join(",")}`;
  if (fetchImpl) return lookup(code, fetchImpl, needs, budget);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return structuredClone(cached.value);
  const previous = pending.get(cacheKey);
  if (previous) return structuredClone(await previous);
  if (pending.size >= 12) return { contacts: [], complete: false };
  const promise = lookup(code, fetch, needs, budget).then(value => {
    if (value.complete) {
      if (cache.size >= 500) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
      cache.set(cacheKey, { expires: Date.now() + TTL, value });
    }
    return value;
  }).finally(() => pending.delete(cacheKey));
  pending.set(cacheKey, promise);
  return structuredClone(await promise);
}
