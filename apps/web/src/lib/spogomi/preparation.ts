import { strFromU8, unzipSync } from "fflate";
import type {
  SpogomiRosterColumn,
  SpogomiRosterColumnMapping,
  SpogomiRosterPreview,
  SpogomiRosterRow,
  SpogomiRosterRowError,
  SpogomiTeamFormation,
} from "./types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 64;
const MAX_NAME_LENGTH = 160;
const MAX_GROUP_LENGTH = 120;
const MAX_EXTERNAL_REFERENCE_LENGTH = 160;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().replace(/\s+/g, " ");
}

function fingerprint(row: Pick<SpogomiRosterRow, "name" | "groupPreference" | "externalReference" | "sourceRowId">): string {
  let hash = 2166136261;
  const stableKey = row.externalReference ?? row.sourceRowId ?? `${row.name ?? ""}|${row.groupPreference ?? ""}`;
  for (const character of `${normalizeHeader(stableKey)}|${normalizeHeader(row.groupPreference ?? "")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const delimiter = (text.split("\n", 1)[0].match(/;/g)?.length ?? 0) > (text.split("\n", 1)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  if (quoted) throw new Error("CSV invalide : guillemet non fermé.");
  return rows;
}

function xmlText(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) =>
    match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  );
}

function parseXlsx(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes);
  const entries = Object.entries(files);
  const expandedBytes = entries.reduce((total, [, value]) => total + value.byteLength, 0);
  if (entries.length > 100 || expandedBytes > 25 * 1024 * 1024) throw new Error("XLSX refusé : archive trop volumineuse.");
  if (entries.some(([, value]) => strFromU8(value).includes("<!DOCTYPE"))) throw new Error("XLSX refusé : déclaration XML interdite.");
  const workbook = strFromU8(files["xl/workbook.xml"] ?? new Uint8Array());
  const relations = strFromU8(files["xl/_rels/workbook.xml.rels"] ?? new Uint8Array());
  const firstSheet = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/i)?.[1];
  const target = firstSheet
    ? relations.match(new RegExp(`<Relationship[^>]*Id="${firstSheet}"[^>]*Target="([^"]+)"`, "i"))?.[1]
    : null;
  const sheetPath = target ? `xl/${target.replace(/^\//, "").replace(/^xl\//, "")}` : "xl/worksheets/sheet1.xml";
  const sheet = strFromU8(files[sheetPath] ?? new Uint8Array());
  if (!sheet) throw new Error("XLSX invalide : première feuille introuvable.");
  const shared = xmlText(strFromU8(files["xl/sharedStrings.xml"] ?? new Uint8Array()), "t");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const values: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attributes = cell[1];
      const body = cell[2];
      const reference = attributes.match(/\br="([A-Z]+)\d+"/i)?.[1] ?? "A";
      const column = [...reference].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
      const type = attributes.match(/\bt="([^"]+)"/i)?.[1];
      const raw = xmlText(body, "v")[0] ?? xmlText(body, "t").join("");
      const value = type === "s" ? shared[Number(raw)] ?? "" : raw;
      values[column] = value;
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function inferMapping(headers: string[]): SpogomiRosterColumnMapping {
  const mapping: SpogomiRosterColumnMapping = {};
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!mapping.ticketReference && /^(n billet|numero billet|ticket id|place id|place reference)$/.test(normalized)) mapping.ticketReference = header;
    else if (!mapping.orderReference && /^(n de commande|numero commande|order id|order reference|order group id)$/.test(normalized)) mapping.orderReference = header;
    else if (!mapping.orderAlternativeReference && /^(n de commande avance|numero commande avance|advanced order id|advanced order reference)$/.test(normalized)) mapping.orderAlternativeReference = header;
    else if (!mapping.ticketStatus && /(statut .*billet|ticket status|statut ticket|registration status)/.test(normalized)) mapping.ticketStatus = header;
    else if (!mapping.ticketDeleted && /(supprime|deleted|annule|cancelled)/.test(normalized)) mapping.ticketDeleted = header;
    else if (!mapping.name && /^(nom|nom complet|participant|prenom nom|full name|person display name)$/.test(normalized)) mapping.name = header;
    else if (!mapping.group && /(equipe|groupe|amis|team|group)/.test(normalized)) mapping.group = header;
    else if (!mapping.sourceRowId && /(id|identifiant|reference|ref|ligne source)/.test(normalized)) mapping.sourceRowId = header;
  }
  return mapping;
}

const ROSTER_MAPPING_KEYS = ["name", "group", "sourceRowId", "ticketReference", "orderReference", "orderAlternativeReference", "ticketStatus", "ticketDeleted"] as const;

function resolveMapping(headers: string[], mapping?: SpogomiRosterColumnMapping): SpogomiRosterColumnMapping {
  const candidate = mapping ?? inferMapping(headers);
  const resolved: SpogomiRosterColumnMapping = {};
  const seenHeaders = new Set<string>();
  for (const key of ROSTER_MAPPING_KEYS) {
    const header = candidate[key];
    if (header === undefined) continue;
    if (!headers.includes(header)) throw new Error("Validation: la correspondance référence une colonne absente.");
    if (seenHeaders.has(header)) throw new Error("Validation: une même colonne ne peut pas être utilisée deux fois.");
    seenHeaders.add(header);
    resolved[key] = header;
  }
  return resolved;
}

function canonicalMapping(mapping: SpogomiRosterColumnMapping): string {
  return JSON.stringify(
    ROSTER_MAPPING_KEYS
      .filter((key) => mapping[key] !== undefined)
      .map((key) => [key, mapping[key]]),
  );
}

async function deterministicImportKey(contentHash: string, mapping: SpogomiRosterColumnMapping): Promise<string> {
  const digest = await sha256Hex(new TextEncoder().encode(`spogomi-roster-v1:${contentHash}:${canonicalMapping(mapping)}`));
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function buildRows(rawRows: string[][], mapping: SpogomiRosterColumnMapping) {
  const headers = rawRows[0] ?? [];
  const indexes = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, headers.indexOf(header ?? "")])) as Partial<Record<SpogomiRosterColumn, number>>;
  const errors: SpogomiRosterRowError[] = [];
  const rows: SpogomiRosterRow[] = [];
  const ticketImport = Boolean(mapping.ticketReference);
  for (const [offset, values] of rawRows.slice(1, MAX_ROWS + 1).entries()) {
    const rowNumber = offset + 2;
    if (values.length > MAX_COLUMNS) {
      errors.push({ rowNumber, code: "row_too_wide", message: "Trop de colonnes dans cette ligne." });
      continue;
    }
    const rawName = normalizeValue(indexes.name === undefined ? "" : values[indexes.name]);
    const name = rawName || null;
    const group = normalizeValue(indexes.group === undefined ? "" : values[indexes.group]);
    const sourceRowId = normalizeValue(indexes.sourceRowId === undefined ? "" : values[indexes.sourceRowId]);
    const externalReference = normalizeValue(indexes.ticketReference === undefined ? "" : values[indexes.ticketReference]);
    const orderReference = normalizeValue(indexes.orderReference === undefined ? "" : values[indexes.orderReference]);
    const orderAlternativeReference = normalizeValue(indexes.orderAlternativeReference === undefined ? "" : values[indexes.orderAlternativeReference]);
    const ticketStatus = normalizeValue(indexes.ticketStatus === undefined ? "" : values[indexes.ticketStatus]);
    const rawDeleted = normalizeHeader(normalizeValue(indexes.ticketDeleted === undefined ? "" : values[indexes.ticketDeleted]));
    const ticketDeleted = ["1", "oui", "yes", "true", "vrai", "supprime", "deleted", "annule", "cancelled", "canceled"].includes(rawDeleted);
    if (ticketImport && !externalReference) {
      errors.push({ rowNumber, code: "ticket_reference_required", message: "La référence N. Billet est obligatoire pour une ligne de billetterie." });
      continue;
    }
    if (ticketImport && !orderReference) {
      errors.push({ rowNumber, code: "order_reference_required", message: "La référence N. de commande est obligatoire pour une ligne de billetterie." });
      continue;
    }
    if (!ticketImport && !name) {
      errors.push({ rowNumber, code: "name_required", message: "Le nom du participant est obligatoire." });
      continue;
    }
    if (name && name.length > MAX_NAME_LENGTH) {
      errors.push({ rowNumber, code: "name_too_long", message: "Le nom du participant est trop long." });
      continue;
    }
    if (sourceRowId.length > MAX_EXTERNAL_REFERENCE_LENGTH || externalReference.length > MAX_EXTERNAL_REFERENCE_LENGTH || orderReference.length > MAX_EXTERNAL_REFERENCE_LENGTH || orderAlternativeReference.length > MAX_EXTERNAL_REFERENCE_LENGTH) {
      errors.push({ rowNumber, code: "invalid_source_row_id", message: "La référence de ligne est trop longue." });
      continue;
    }
    const candidate: SpogomiRosterRow = {
      rowNumber,
      name,
      groupPreference: (orderReference || group) ? (orderReference || group).slice(0, MAX_GROUP_LENGTH) : null,
      sourceRowId: sourceRowId || externalReference || null,
      externalReference: externalReference || null,
      orderReference: orderReference || null,
      orderAlternativeReference: orderAlternativeReference || null,
      ticketStatus: ticketStatus || null,
      ticketDeleted,
      sourceSystem: ticketImport ? "cachan_ticketing" : "manual_roster",
      sourceFingerprint: "",
    };
    candidate.sourceFingerprint = fingerprint(candidate);
    rows.push(candidate);
  }
  return { headers, rows, errors };
}

export async function previewRosterFile(file: File, mapping?: SpogomiRosterColumnMapping): Promise<SpogomiRosterPreview> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  const fileName = file.name.trim() || "roster";
  const extension = fileName.toLocaleLowerCase().endsWith(".xlsx") ? "xlsx" : fileName.toLocaleLowerCase().endsWith(".csv") ? "csv" : null;
  if (!extension) throw new Error("Format refusé : utilisez un fichier CSV ou XLSX.");
  const allowedMimeTypes = extension === "csv"
    ? new Set(["", "text/csv", "application/csv", "text/plain"])
    : new Set(["", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"]);
  if (!allowedMimeTypes.has(file.type.toLocaleLowerCase())) throw new Error("Type MIME incohérent avec l'extension du fichier.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rawRows = extension === "csv" ? parseCsv(new TextDecoder().decode(bytes).replace(/^\uFEFF/, "")) : parseXlsx(bytes);
  if (!rawRows.length || !rawRows[0]?.length) throw new Error("Le fichier ne contient pas d'en-tête exploitable.");
  if (rawRows[0].length > MAX_COLUMNS) throw new Error("Le fichier contient trop de colonnes.");
  const headers = rawRows[0].map(normalizeValue);
  const resolvedMapping = resolveMapping(headers, mapping);
  const { rows, errors } = buildRows([headers, ...rawRows.slice(1)], resolvedMapping);
  const mappedHeaders = new Set(Object.values(resolvedMapping).filter(Boolean));
  const unknownHeaders = headers.filter((header) => !mappedHeaders.has(header));
  const byFingerprint = new Map<string, number[]>();
  for (const row of rows) byFingerprint.set(row.sourceFingerprint, [...(byFingerprint.get(row.sourceFingerprint) ?? []), row.rowNumber]);
  const duplicateTicketRows = resolvedMapping.ticketReference
    ? [...new Map(rows.filter((row) => row.externalReference).map((row) => [row.externalReference as string, [] as number[]])).entries()]
      .map(([reference]) => [reference, rows.filter((row) => row.externalReference === reference).map((row) => row.rowNumber)] as const)
      .filter(([, rowNumbers]) => rowNumbers.length > 1)
    : [];
  for (const [, rowNumbers] of duplicateTicketRows) {
    for (const rowNumber of rowNumbers) errors.push({ rowNumber, code: "ticket_reference_collision", message: "La même référence de billet apparaît plusieurs fois dans le fichier." });
  }
  return {
    format: extension,
    fileName,
    contentHash: await sha256Hex(bytes),
    headers,
    unknownHeaders,
    mapping: resolvedMapping,
    rows,
    errors,
    probableDuplicateRowNumbers: [...byFingerprint.values()].filter((group) => group.length > 1),
    sourceSystem: resolvedMapping.ticketReference ? "cachan_ticketing" : "manual_roster",
    cancelledRowNumbers: rows.filter((row) => row.ticketDeleted || /annul|cancel|supprim|deleted|refus|refund/i.test(row.ticketStatus ?? "")).map((row) => row.rowNumber),
    importKey: await deterministicImportKey(await sha256Hex(bytes), resolvedMapping),
  };
}

export function buildDeterministicTeamFormation(input: {
  participants: Array<{ id: string; sourceOrder: number; groupPreference: string | null }>;
  mode: "casual" | "world_cup";
  casualTeamSize: number | null;
  casualTeamBounds?: { minMembers: number | null; maxMembers: number | null };
}): SpogomiTeamFormation {
  const casualMin = input.casualTeamBounds?.minMembers ?? input.casualTeamSize;
  const casualMax = input.casualTeamBounds?.maxMembers ?? input.casualTeamSize;
  const minMembers = input.mode === "world_cup" ? 3 : casualMin;
  const maxMembers = input.mode === "world_cup" ? 3 : casualMax;
  if (!maxMembers || maxMembers < 1 || (minMembers !== null && minMembers !== undefined && minMembers < 1) || (minMembers !== null && minMembers !== undefined && minMembers > maxMembers)) {
    return {
      teams: [],
      unassignedParticipantIds: input.participants.map(({ id }) => id),
      reasons: Object.fromEntries(input.participants.map(({ id }) => [id, "team_size_required"])),
      explanation: ["La configuration de taille d'équipe est incomplète ou incohérente."],
    };
  }
  const effectiveMinMembers = minMembers ?? 1;
  const sorted = [...input.participants].sort((a, b) => a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id));
  const groups = new Map<string, typeof sorted>();
  const ungrouped: typeof sorted = [];
  for (const participant of sorted) {
    const key = participant.groupPreference?.trim().toLocaleLowerCase("fr-FR");
    if (key) groups.set(key, [...(groups.get(key) ?? []), participant]);
    else ungrouped.push(participant);
  }
  const remainder: typeof sorted = [];
  const teams: SpogomiTeamFormation["teams"] = [];
  const unassigned: string[] = [];
  const reasons: SpogomiTeamFormation["reasons"] = {};
  const explanation: string[] = [];
  const addTrio = (members: typeof sorted, reason: "same_order_trio" | "remainder_repacked") => {
    teams.push({
      draftKey: `team-${teams.length + 1}`,
      teamNumber: teams.length + 1,
      participantIds: members.map(({ id }) => id),
      compositionState: "draft",
      explanation: reason,
    });
  };
  for (const group of groups.values()) {
    let offset = 0;
    while (offset + 3 <= group.length && effectiveMinMembers <= 3 && maxMembers >= 3) {
      addTrio(group.slice(offset, offset + 3), "same_order_trio");
      offset += 3;
    }
    remainder.push(...group.slice(offset));
  }
  remainder.push(...ungrouped);

  const allowedSizes = Array.from({ length: maxMembers }, (_, index) => index + 1)
    .filter((size) => size >= effectiveMinMembers && (input.mode === "world_cup" ? size === 3 : true));
  const preferredSizes = allowedSizes.sort((a, b) => {
    const preference = (size: number) => (size === 3 ? 0 : size === 4 ? 1 : size === 2 ? 2 : 3);
    return preference(a) - preference(b) || a - b;
  });
  const best: Array<{ trios: number; teamCount: number; sizes: number[] } | undefined> = [{ trios: 0, teamCount: 0, sizes: [] }];
  const better = (candidate: { trios: number; teamCount: number; sizes: number[] }, current: typeof candidate) => {
    if (candidate.trios !== current.trios) return candidate.trios > current.trios;
    if (candidate.teamCount !== current.teamCount) return candidate.teamCount < current.teamCount;
    const ranks = (size: number) => preferredSizes.indexOf(size);
    for (let index = 0; index < Math.min(candidate.sizes.length, current.sizes.length); index += 1) {
      if (ranks(candidate.sizes[index]) !== ranks(current.sizes[index])) return ranks(candidate.sizes[index]) < ranks(current.sizes[index]);
    }
    return candidate.sizes.length < current.sizes.length;
  };
  for (let count = 1; count <= remainder.length; count += 1) {
    for (const size of preferredSizes) {
      if (size > count || !best[count - size]) continue;
      const previous = best[count - size] as { trios: number; teamCount: number; sizes: number[] };
      const candidate = { trios: previous.trios + (size === 3 ? 1 : 0), teamCount: previous.teamCount + 1, sizes: [...previous.sizes, size] };
      if (!best[count] || better(candidate, best[count] as typeof candidate)) best[count] = candidate;
    }
  }
  let assignedRemainder = remainder.length;
  while (assignedRemainder > 0 && !best[assignedRemainder]) assignedRemainder -= 1;
  const selected = assignedRemainder ? best[assignedRemainder] : undefined;
  let remainderOffset = 0;
  for (const size of selected?.sizes ?? []) {
    addTrio(remainder.slice(remainderOffset, remainderOffset + size), "remainder_repacked");
    remainderOffset += size;
  }
  for (const participant of remainder.slice(remainderOffset)) {
    unassigned.push(participant.id);
    reasons[participant.id] = input.mode === "world_cup" ? "incomplete_team" : "casual_bounds_no_fit";
  }
  if (teams.length) explanation.push(`Proposition déterministe : ${teams.filter((team) => team.explanation === "same_order_trio").length} trio(s) conservé(s) par commande/groupe.`);
  if (selected?.sizes.length) explanation.push(`Les restes sont regroupés selon les bornes de l'événement : ${selected.sizes.join(" + ")}.`);
  if (unassigned.length) explanation.push(`${unassigned.length} place(s) restent en attente car aucune équipe conforme ne peut être formée.`);
  return { teams, unassignedParticipantIds: unassigned, reasons, explanation };
}
