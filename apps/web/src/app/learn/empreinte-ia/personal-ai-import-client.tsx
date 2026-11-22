"use client";

import { useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CmmCard } from "@/components/ui/cmm-card";
import { parseCodexRolloutJsonlStream, parsePersonalAiJson, parsePersonalAiTextualPdf, type PersonalAiImportResult, type PersonalAiImportRow } from "@/lib/environmental-impact-estimator/ai-personal-import";
import { parseExplicitlyMappedPersonalAiCsv, readPersonalAiCsvHeaders, type PersonalAiCsvMapping } from "@/lib/environmental-impact-estimator/ai-personal-csv";
import { previewPersonalAiImport, type PersonalAiImportPreviewItem, type PersonalAiStoredImport } from "@/lib/environmental-impact-estimator/ai-personal-import-preview";

const STATUS_LABELS: Record<PersonalAiImportPreviewItem["status"], string> = {
  READY: "Prêt", PARTIAL: "Partiel", DUPLICATE: "Doublon exact", REVISION: "Révision fournisseur", CONFLICT: "Chevauchement à résoudre", IDENTITY_INCOMPLETE: "Identité source insuffisante", REJECTED: "Rejeté",
};

const TOKEN_FIELDS = [
  ["startUtcColumn", "Début UTC"], ["endUtcColumn", "Fin UTC"], ["modelColumn", "Modèle"],
  ["inputColumn", "Entrée (tokens)"], ["outputColumn", "Sortie (tokens)"], ["cacheReadColumn", "Cache lu"],
  ["cacheWriteColumn", "Cache écrit"], ["costColumn", "Coût"], ["currencyColumn", "Devise"],
] as const;

type PersonalAiImportReadback = {
  id: string;
  status: string;
  periodStartUtc: string | null;
  modelRaw: string | null;
  inputTotal: number | null;
  outputTotal: number | null;
};

function formatToken(value: number | null): string {
  return value === null ? "NA" : new Intl.NumberFormat("fr-FR").format(value);
}

export function PersonalAiImportClient() {
  const { isSignedIn, isLoaded } = useUser();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<readonly string[]>([]);
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [csvUnit, setCsvUnit] = useState<"" | "tokens">("");
  const [mapping, setMapping] = useState<Partial<Record<typeof TOKEN_FIELDS[number][0], string>>>({});
  const [identityColumns, setIdentityColumns] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<readonly PersonalAiImportPreviewItem[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedRows, setSavedRows] = useState<readonly PersonalAiImportReadback[]>([]);
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => preview.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {}), [preview]);

  function clearPreview() {
    setPreview([]); setSelected(new Set()); setWarnings([]); setRejectedCount(0); setError(""); setMessage(""); setSavedRows([]);
  }

  async function chooseFile(candidate: File | undefined) {
    clearPreview(); setHeaders([]); setMapping({}); setIdentityColumns(new Set());
    if (!candidate) { setFile(null); return; }
    const extension = candidate.name.split(".").pop()?.toLowerCase();
    const max = extension === "jsonl" ? 50_000_000 : extension === "pdf" ? 5_000_000 : 10_000_000;
    if (!new Set(["json", "jsonl", "csv", "pdf"]).has(extension ?? "")) { setFile(null); setError("Format non pris en charge. Les relevés JSON, JSONL Codex, CSV mappés et PDF textuels peuvent être analysés."); return; }
    if (candidate.size > max) { setFile(null); setError(`Fichier trop volumineux (limite ${Math.round(max / 1_000_000)} Mo).`); return; }
    setFile(candidate);
    try {
      if (extension === "csv") {
        const text = await candidate.text();
        let detected: readonly string[];
        try { detected = readPersonalAiCsvHeaders(text, delimiter); }
        catch { setDelimiter(";"); detected = readPersonalAiCsvHeaders(text, ";"); }
        setHeaders(detected);
        return;
      }
      setBusy(true);
      const parsed = extension === "jsonl"
        ? await parseCodexRolloutJsonlStream(candidate.stream())
        : extension === "pdf" ? await parsePersonalAiTextualPdf(candidate) : await parsePersonalAiJson(await candidate.text());
      await publishPreview(parsed);
    } catch (cause) {
      setRejectedCount(1);
      setError(cause instanceof Error ? cause.message : "Le fichier ne peut pas être analysé.");
    } finally { setBusy(false); }
  }

  async function publishPreview(result: PersonalAiImportResult) {
    setWarnings(result.warnings);
    let current: readonly PersonalAiStoredImport[] = [];
    if (isSignedIn) {
      const loaded: PersonalAiStoredImport[] = [];
      for (let offset = 0; offset <= 5000; offset += 50) {
        const response = await fetch(`/api/personal-ai/declarations?limit=50&offset=${offset}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Les déclarations existantes n'ont pas pu être vérifiées; aucun aperçu confirmable n'est affiché.");
        const payload = await response.json() as { items?: PersonalAiStoredImport[]; hasMore?: boolean };
        if (!Array.isArray(payload.items) || typeof payload.hasMore !== "boolean") throw new Error("La vérification des doublons a renvoyé une réponse invalide.");
        loaded.push(...payload.items);
        if (!payload.hasMore) break;
        if (offset === 5000) throw new Error("La vérification est limitée à 5 050 déclarations; aucun aperçu confirmable n'est affiché.");
      }
      current = loaded;
    }
    const resultPreview = previewPersonalAiImport(result.rows, current);
    setPreview(resultPreview);
    setSelected(new Set(resultPreview.flatMap((item, index) => item.status === "READY" || item.status === "PARTIAL" || item.status === "REVISION" ? [index] : [])));
  }

  async function mapCsv() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (csvUnit !== "tokens") throw new Error("Confirmez l'unité des colonnes de tokens avant de poursuivre.");
      const csvMapping: PersonalAiCsvMapping = {
        delimiter, unit: csvUnit, sourceVersion: "user-mapped-csv-v1",
        identityColumns: [...identityColumns],
        ...Object.fromEntries(TOKEN_FIELDS.flatMap(([field]) => mapping[field] ? [[field, mapping[field]]] : [])),
      } as PersonalAiCsvMapping;
      const parsed = await parseExplicitlyMappedPersonalAiCsv(await file.text(), csvMapping);
      setRejectedCount(parsed.rejectedCount);
      await publishPreview({ rows: parsed.rows, status: parsed.rejectedCount > 0 ? "PARTIAL" : "READY", warnings: ["Le CSV est une source mappée explicitement; aucune colonne fournisseur n'est présumée.", ...parsed.warnings] });
    } catch (cause) { setRejectedCount(1); setError(cause instanceof Error ? cause.message : "Le CSV n'a pas pu être analysé."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!isSignedIn || selected.size === 0) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const rows = [...selected].map((index) => preview[index].row).filter(Boolean);
      const response = await fetch("/api/personal-ai/imports", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((row: PersonalAiImportRow) => ({
          declaration: row.declaration, sourceIdentityHash: row.sourceIdentityHash, sourceScope: row.sourceScope, normalizedContentHash: row.normalizedContentHash,
          metadata: row.metadata, costAmount: row.costAmount, costCurrency: row.costCurrency,
        })) }),
      });
      if (!response.ok) throw new Error("La confirmation a échoué. Aucune ligne partielle n'a été enregistrée.");
      const payload = await response.json() as { items?: Array<Record<string, unknown>> };
      if (!Array.isArray(payload.items) || payload.items.length !== rows.length) {
        throw new Error("La confirmation a répondu sans relire toutes les lignes; vous pouvez réessayer sans créer de doublons.");
      }
      const persistedRows = (payload.items ?? []).flatMap((item): PersonalAiImportReadback[] => {
        const declaration = item.declaration;
        if (typeof item.id !== "string" || !declaration || typeof declaration !== "object") return [];
        const value = declaration as Record<string, unknown>;
        const tokens = value.tokens && typeof value.tokens === "object" ? value.tokens as Record<string, unknown> : {};
        const readCount = (candidate: unknown) => typeof candidate === "number" && Number.isSafeInteger(candidate) ? candidate : null;
        return [{
          id: item.id,
          status: typeof item.status === "string" ? item.status : "ACTIVE",
          periodStartUtc: typeof value.periodStartUtc === "string" ? value.periodStartUtc : null,
          modelRaw: typeof value.modelRaw === "string" ? value.modelRaw : null,
          inputTotal: readCount(tokens.inputTotal),
          outputTotal: readCount(tokens.outputTotal),
        }];
      });
      if (persistedRows.length !== rows.length) throw new Error("La réponse ne contient pas toutes les lignes normalisées relues; réessayez sans risque de doublons.");
      setSavedRows(persistedRows);
      setMessage(`${persistedRows.length} ligne(s) relue(s) après confirmation atomique.`);
      setPreview([]); setSelected(new Set()); setFile(null); setHeaders([]); setRejectedCount(0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Confirmation indisponible."); }
    finally { setBusy(false); }
  }

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  return <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-import-title">
    <h2 id="personal-ai-import-title" className="text-xl font-black text-slate-950">Importer un relevé</h2>
    <p className="mt-2 text-sm text-slate-700">Les fichiers sont analysés dans votre navigateur. Seules les lignes normalisées sont envoyées après confirmation. Aucun prompt, transcript, fichier brut ou identifiant fournisseur n&apos;est transmis.</p>
    <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void chooseFile(event.dataTransfer.files[0]); }}>
      <p className="text-sm text-slate-700">Déposez un fichier JSON, JSONL Codex, CSV ou PDF textuel, ou sélectionnez-le.</p>
      <input ref={fileInput} type="file" accept=".json,.jsonl,.csv,.pdf,application/json,text/csv,application/pdf" className="sr-only" aria-label="Sélectionner un relevé IA" onChange={(event) => void chooseFile(event.currentTarget.files?.[0])} />
      <button type="button" className="mt-3 rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-800" onClick={() => fileInput.current?.click()}>Choisir un fichier</button>
      {file ? <p className="mt-2 break-all text-xs text-slate-600">{file.name} · {new Intl.NumberFormat("fr-FR").format(file.size)} octets</p> : null}
      <p className="mt-3 text-xs text-slate-600">Limites : JSON/CSV 10 Mo et 20 000 lignes; JSONL Codex 50 Mo et 250 000 lignes; PDF textuel 5 Mo et 20 pages. Aucun OCR.</p>
    </div>

    {headers.length > 0 ? <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-900">Confirmer le mapping CSV</h3>
      <label className="mt-3 flex items-center gap-2 text-sm">Unité des tokens<select className="rounded border border-slate-300 p-2" value={csvUnit} onChange={(event) => setCsvUnit(event.target.value as "" | "tokens")}><option value="">Choisir une unité</option><option value="tokens">Tokens entiers</option></select></label>
      <label className="mt-3 flex items-center gap-2 text-sm">Séparateur<select className="rounded border border-slate-300 p-2" value={delimiter} onChange={(event) => setDelimiter(event.target.value as "," | ";")}><option value=",">Virgule</option><option value=";">Point-virgule</option></select></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{TOKEN_FIELDS.map(([key, label]) => <label key={key} className="grid gap-1 text-sm">{label}<select className="rounded border border-slate-300 p-2" value={mapping[key] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value || undefined }))}><option value="">Non mappée</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
      <fieldset className="mt-3 rounded border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Colonnes attestant l’identité de la source</legend><p className="text-xs text-slate-600">Sélectionnez une ou plusieurs clés stables (par exemple ID de ligne ou de facture). Sans clé renseignée, la ligne reste non confirmable. Les valeurs sélectionnées sont hachées localement.</p><div className="mt-2 flex flex-wrap gap-3">{headers.map((header) => <label key={header} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={identityColumns.has(header)} onChange={() => setIdentityColumns((current) => { const next = new Set(current); if (next.has(header)) next.delete(header); else next.add(header); return next; })} />{header}</label>)}</div></fieldset>
      <p className="mt-3 text-xs text-slate-600">Les quantités de tokens sont en unités de tokens entiers. Une facture avec coût seul conserve coût et devise; ses tokens restent NA.</p>
      <button type="button" onClick={() => void mapCsv()} disabled={busy || csvUnit !== "tokens"} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 font-bold text-white disabled:opacity-50">Analyser le mapping</button>
    </div> : null}

    {preview.length > 0 ? <div className="mt-5">
      <h3 className="font-bold text-slate-900">Aperçu · {preview.length} ligne(s)</h3>
      <p className="mt-1 text-sm text-slate-700">{preview.length} ligne(s) analysée(s), {rejectedCount} rejetée(s).</p>
      <p className="mt-1 text-sm text-slate-700">{Object.entries(summary).map(([key, value]) => `${STATUS_LABELS[key as keyof typeof STATUS_LABELS]} : ${value}`).join(" · ")}</p>
      <ul className="mt-3 grid max-h-96 gap-2 overflow-auto">{preview.map((item, index) => <li key={`${item.row.sourceIdentityHash}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <label className="flex items-start gap-2"><input type="checkbox" checked={selected.has(index)} disabled={item.status === "DUPLICATE" || item.status === "CONFLICT" || item.status === "IDENTITY_INCOMPLETE" || item.status === "REJECTED"} onChange={() => toggle(index)} />
          <span><strong>{STATUS_LABELS[item.status]}</strong> · {item.row.metadata.provider} · {item.row.declaration.sourceVersion ?? "Version de source inconnue"} · {item.row.declaration.modelRaw ?? "Modèle inconnu"}<br />Période : {item.row.declaration.periodStartUtc ?? "inconnue"}{item.row.declaration.periodEndUtc ? ` – ${item.row.declaration.periodEndUtc}` : ""} · région : {item.row.declaration.inferenceRegion ?? "inconnue"} · fraîcheur : {item.row.metadata.freshnessUtc ?? "inconnue"} · requêtes : {item.row.declaration.requestCount ?? "NA"}<br />Entrée {formatToken(item.row.declaration.tokens.inputTotal)} · sortie {formatToken(item.row.declaration.tokens.outputTotal)} · coût {item.row.costAmount ?? "NA"} {item.row.costCurrency ?? ""}</span>
        </label>
      </li>)}</ul>
      {isSignedIn ? <button type="button" onClick={() => void confirm()} disabled={busy || selected.size === 0} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Confirmation…" : `Confirmer ${selected.size} ligne(s)`}</button>
        : <p className="mt-4 text-sm text-slate-700">L&apos;aperçu reste anonyme. <a className="font-bold underline" href="/sign-in?redirect_url=%2Flearn%2Fempreinte-ia">Connectez-vous pour confirmer l&apos;import</a>.</p>}
    </div> : null}
    {warnings.map((warning) => <p key={warning} className="mt-3 text-sm text-amber-900">{warning}</p>)}
    {preview.length === 0 && rejectedCount > 0 ? <p className="mt-3 text-sm text-rose-800">Lignes rejetées : {rejectedCount}.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p> : null}
    {message ? <div role="status" className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
      <p>{message}</p>
      <ul className="mt-2 grid gap-1 font-normal">{savedRows.map((row) => <li key={row.id}>{row.status === "ACTIVE" ? "Active" : row.status} · {row.periodStartUtc ?? "période inconnue"} · {row.modelRaw ?? "modèle inconnu"} · entrée {formatToken(row.inputTotal)} · sortie {formatToken(row.outputTotal)}</li>)}</ul>
    </div> : null}
    {!isLoaded ? <p className="sr-only" aria-live="polite">Chargement de l&apos;état de connexion</p> : null}
  </CmmCard>;
}
