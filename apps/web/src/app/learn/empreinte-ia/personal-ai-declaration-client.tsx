"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CmmCard } from "@/components/ui/cmm-card";
import { estimatePersonalAiFootprint, type PersonalAiFootprintEstimate } from "@/lib/environmental-impact-estimator/personal-ai-estimator";
import { listAiModels } from "@/lib/environmental-impact-estimator/model-catalog";
import { normalizePersonalAiDeclaration, toPersonalAiEstimatorInput, type PersonalAiDeclarationDraft } from "@/lib/environmental-impact-estimator/personal-ai-usage-normalization";
import { PersonalAiQuickScenarioClient } from "./personal-ai-quick-scenario-client";

type FormState = {
  periodStart: string; periodEnd: string; provider: PersonalAiDeclarationDraft["provider"];
  source: PersonalAiDeclarationDraft["source"]; granularity: PersonalAiDeclarationDraft["granularity"];
  modelRaw: string; modelCanonical: string; operator: string; execution: PersonalAiDeclarationDraft["execution"];
  inferenceRegion: string; access: PersonalAiDeclarationDraft["access"]; requestCount: string;
  inputTotal: string; inputUncached: string; cacheRead: string; cacheWrite: string;
  outputVisible: string; outputReasoning: string; outputTotal: string;
  reasoningRelation: PersonalAiDeclarationDraft["tokens"]["reasoningRelation"];
  images: string; audioMinutes: string; videoSeconds: string;
  energyKwh: string; energyBoundary: PersonalAiDeclarationDraft["energy"]["boundary"];
  energyEvidence: PersonalAiDeclarationDraft["energy"]["evidence"];
  averageWatts: string; durationSeconds: string; idleWatts: string;
};

type DeclarationRow = {
  id: string; status: "ACTIVE" | "EXCLUDED"; declaration: PersonalAiDeclarationDraft;
  snapshot: PersonalAiFootprintEstimate; created_at: string; source_identity_hash?: string | null;
};

function utcDay(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    periodStart: utcDay(0), periodEnd: utcDay(1), provider: "MANUAL", source: "MANUAL", granularity: "UNKNOWN",
    modelRaw: "", modelCanonical: "", operator: "", execution: "CLOUD", inferenceRegion: "", access: "API", requestCount: "",
    inputTotal: "", inputUncached: "", cacheRead: "", cacheWrite: "", outputVisible: "", outputReasoning: "", outputTotal: "", reasoningRelation: "UNKNOWN",
    images: "", audioMinutes: "", videoSeconds: "", energyKwh: "", energyBoundary: null, energyEvidence: null,
    averageWatts: "", durationSeconds: "", idleWatts: "",
  };
}

function nullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toDraft(form: FormState): PersonalAiDeclarationDraft {
  const start = new Date(`${form.periodStart}T00:00:00.000Z`).toISOString();
  const end = new Date(`${form.periodEnd}T00:00:00.000Z`).toISOString();
  return {
    provider: form.provider,
    source: form.source,
    sourceVersion: null,
    provenance: form.source === "PROVIDER_EXPORT" || form.source === "PROVIDER_DASHBOARD" ? "PROVIDER_REPORTED" : form.source === "LOCAL_LOG" ? "DEVICE_MEASURED" : "USER_DECLARED",
    granularity: form.granularity,
    periodStartUtc: start,
    periodEndUtc: end,
    modelRaw: form.modelRaw.trim() || null,
    modelCanonical: form.modelCanonical || null,
    operator: form.operator.trim() || null,
    execution: form.execution,
    inferenceRegion: form.inferenceRegion.trim().toUpperCase() || null,
    access: form.access,
    requestCount: nullableNumber(form.requestCount),
    tokens: {
      inputTotal: nullableNumber(form.inputTotal), inputUncached: nullableNumber(form.inputUncached),
      cacheRead: nullableNumber(form.cacheRead), cacheWrite: nullableNumber(form.cacheWrite),
      outputVisible: nullableNumber(form.outputVisible), outputReasoning: nullableNumber(form.outputReasoning),
      outputTotal: nullableNumber(form.outputTotal), reasoningRelation: form.reasoningRelation,
    },
    modality: { images: nullableNumber(form.images), audioMinutes: nullableNumber(form.audioMinutes), videoSeconds: nullableNumber(form.videoSeconds) },
    energy: {
      kwh: nullableNumber(form.energyKwh), boundary: form.energyBoundary, evidence: form.energyEvidence,
      averageWatts: nullableNumber(form.averageWatts), durationSeconds: nullableNumber(form.durationSeconds), idleWatts: nullableNumber(form.idleWatts),
    },
  };
}

function formFromDraft(draft: PersonalAiDeclarationDraft): FormState {
  const value = (input: number | null | undefined) => input == null ? "" : String(input);
  return {
    ...emptyForm(), periodStart: draft.periodStartUtc?.slice(0, 10) ?? "", periodEnd: draft.periodEndUtc?.slice(0, 10) ?? "",
    provider: draft.provider, source: draft.source, granularity: draft.granularity, modelRaw: draft.modelRaw ?? "",
    modelCanonical: draft.modelCanonical ?? "", operator: draft.operator ?? "", execution: draft.execution,
    inferenceRegion: draft.inferenceRegion ?? "", access: draft.access, requestCount: value(draft.requestCount),
    inputTotal: value(draft.tokens.inputTotal), inputUncached: value(draft.tokens.inputUncached), cacheRead: value(draft.tokens.cacheRead), cacheWrite: value(draft.tokens.cacheWrite),
    outputVisible: value(draft.tokens.outputVisible), outputReasoning: value(draft.tokens.outputReasoning), outputTotal: value(draft.tokens.outputTotal), reasoningRelation: draft.tokens.reasoningRelation,
    images: value(draft.modality.images), audioMinutes: value(draft.modality.audioMinutes), videoSeconds: value(draft.modality.videoSeconds),
    energyKwh: value(draft.energy.kwh), energyBoundary: draft.energy.boundary, energyEvidence: draft.energy.evidence,
    averageWatts: value(draft.energy.averageWatts), durationSeconds: value(draft.energy.durationSeconds), idleWatts: value(draft.energy.idleWatts),
  };
}

const models = listAiModels();

export function PersonalAiDeclarationClient() {
  const { isSignedIn, isLoaded } = useUser();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [estimate, setEstimate] = useState<PersonalAiFootprintEstimate | null>(null);
  const [items, setItems] = useState<DeclarationRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    const refresh = () => {
      void fetch("/api/personal-ai/declarations?limit=50", { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Historique privé indisponible.")))
        .then((payload: { items: DeclarationRow[]; hasMore: boolean }) => { if (active) { setItems(payload.items); setHasMore(payload.hasMore); } })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Historique privé indisponible."); });
    };
    refresh();
    window.addEventListener("personal-ai-chat-scenario-saved", refresh);
    return () => { active = false; window.removeEventListener("personal-ai-chat-scenario-saved", refresh); };
  }, [isLoaded, isSignedIn]);

  const normalized = useMemo(() => {
    if (!estimate) return null;
    try { return normalizePersonalAiDeclaration(toDraft(form)); } catch { return null; }
  }, [estimate, form]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setEstimate(null);
  }

  function calculate() {
    setError(""); setMessage("");
    try {
      const declaration = normalizePersonalAiDeclaration(toDraft(form));
      setEstimate(estimatePersonalAiFootprint(toPersonalAiEstimatorInput(declaration)));
    } catch (cause) {
      setEstimate(null);
      setError(cause instanceof Error ? cause.message : "Vérifiez les champs de la déclaration.");
    }
  }

  async function save() {
    if (!normalized || !isSignedIn) return;
    const draft = toDraft(form);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(editingId ? `/api/personal-ai/declarations/${editingId}` : "/api/personal-ai/declarations", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { declaration: draft } : draft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Enregistrement indisponible.");
      if (editingId) setItems((current) => current.map((item) => item.id === editingId ? payload.item : item));
      else setItems((current) => [payload.item, ...current]);
      setEditingId(null); setForm(emptyForm()); setEstimate(null); setMessage("Déclaration enregistrée dans votre espace privé.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement indisponible.");
    } finally { setBusy(false); }
  }

  async function updateStatus(item: DeclarationRow, status: "ACTIVE" | "EXCLUDED") {
    const response = await fetch(`/api/personal-ai/declarations/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error("Mise à jour indisponible.");
    const payload = await response.json();
    setItems((current) => current.map((row) => row.id === item.id ? payload.item : row));
  }

  async function remove(item: DeclarationRow) {
    if (!window.confirm("Supprimer définitivement cette déclaration ?")) return;
    const response = await fetch(`/api/personal-ai/declarations/${item.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Suppression indisponible."); return; }
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (editingId === item.id) { setEditingId(null); setForm(emptyForm()); setEstimate(null); }
  }

  async function loadMore() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/personal-ai/declarations?limit=50&offset=${items.length}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Historique privé indisponible.");
      setItems((current) => [...current, ...payload.items]); setHasMore(payload.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Historique privé indisponible.");
    } finally { setBusy(false); }
  }

  const number = (value: number | null) => value === null ? "NA" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(value);
  const fields = (values: Array<[string, string, (value: string) => void, string?]>) => values.map(([label, value, onChange, type = "number"]) => (
    <label key={label} className="grid gap-1 text-sm text-slate-800">{label}<input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" /></label>
  ));

  return <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
    <header><p className="text-sm font-bold uppercase tracking-wide text-rose-700">Apprendre · calcul personnel</p><h1 className="mt-2 text-3xl font-black text-slate-950">Mon empreinte IA</h1><p className="mt-3 max-w-3xl text-slate-700">Déclarez une période d’usage et consultez une estimation à partir des données disponibles. Les champs laissés vides restent inconnus; aucune conversation ni aucun prompt ne sont demandés.</p></header>
    <PersonalAiQuickScenarioClient isSignedIn={isSignedIn === true} isLoaded={isLoaded} />
    <CmmCard as="section" tone="slate" variant="glass" size="lg">
      <h2 className="text-xl font-black text-slate-950">Déclaration d’usage</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields([["Début de période (UTC)", form.periodStart, (v) => setField("periodStart", v), "date"], ["Fin exclusive (UTC)", form.periodEnd, (v) => setField("periodEnd", v), "date"]])}
        <label className="grid gap-1 text-sm text-slate-800">Fournisseur<select value={form.provider} onChange={(e) => setField("provider", e.target.value as FormState["provider"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">{["MANUAL", "OPENAI", "ANTHROPIC", "GOOGLE", "MISTRAL", "OTHER"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-sm text-slate-800">Source déclarée<select value={form.source} onChange={(e) => setField("source", e.target.value as FormState["source"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">{[["MANUAL", "Saisie manuelle"], ["PROVIDER_EXPORT", "Export fournisseur"], ["PROVIDER_DASHBOARD", "Tableau de bord fournisseur"], ["LOCAL_LOG", "Journal local"]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm text-slate-800">Granularité<select value={form.granularity} onChange={(e) => setField("granularity", e.target.value as FormState["granularity"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="UNKNOWN">Inconnue</option><option value="AGGREGATE">Agrégat de période</option><option value="PER_REQUEST">Requête explicitement ventilée</option></select></label>
        <label className="grid gap-1 text-sm text-slate-800">Modèle du catalogue<select value={form.modelCanonical} onChange={(e) => setField("modelCanonical", e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="">Inconnu / autre</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        {fields([["Nom de modèle déclaré (facultatif)", form.modelRaw, (v) => setField("modelRaw", v), "text"], ["Opérateur d’inférence (facultatif)", form.operator, (v) => setField("operator", v), "text"]])}
        <label className="grid gap-1 text-sm text-slate-800">Environnement<select value={form.execution} onChange={(e) => { const execution = e.target.value as FormState["execution"]; setField("execution", execution); setField("access", execution === "LOCAL" ? "LOCAL_OWNED" : "API"); if (execution === "CLOUD" && form.energyBoundary === "LOCAL_WALL") setField("energyBoundary", null); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="CLOUD">Cloud</option><option value="LOCAL">Appareil local possédé</option></select></label>
        <label className="grid gap-1 text-sm text-slate-800">Accès déclaré<select value={form.access} onChange={(e) => setField("access", e.target.value as FormState["access"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="API">API</option><option value="SUBSCRIPTION">Abonnement</option><option value="LOCAL_OWNED">Appareil possédé</option></select></label>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields([["Tokens d’entrée déclarés", form.inputTotal, (v) => setField("inputTotal", v)], ["Tokens d’entrée non cachés", form.inputUncached, (v) => setField("inputUncached", v)], ["Cache lu (tokens)", form.cacheRead, (v) => setField("cacheRead", v)], ["Cache écrit (tokens)", form.cacheWrite, (v) => setField("cacheWrite", v)], ["Tokens de sortie visibles", form.outputVisible, (v) => setField("outputVisible", v)], ["Tokens de raisonnement", form.outputReasoning, (v) => setField("outputReasoning", v)], ["Total sortie déclaré", form.outputTotal, (v) => setField("outputTotal", v)], ["Nombre de requêtes déclaré", form.requestCount, (v) => setField("requestCount", v)]])}
        <label className="grid gap-1 text-sm text-slate-800">Relation du raisonnement<select value={form.reasoningRelation} onChange={(e) => setField("reasoningRelation", e.target.value as FormState["reasoningRelation"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="UNKNOWN">Inconnue</option><option value="INCLUDED">Inclus dans la sortie</option><option value="ADDITIONAL">S’ajoute à la sortie visible</option></select></label>
      </div>
      <details open={advanced} onToggle={(event) => setAdvanced(event.currentTarget.open)} className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold text-slate-900">Données avancées, multimodalité et énergie</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fields([["Région physique connue (code ISO alpha-2 ou UNKNOWN)", form.inferenceRegion, (v) => setField("inferenceRegion", v), "text"], ["Images (compte déclaré)", form.images, (v) => setField("images", v)], ["Audio (minutes)", form.audioMinutes, (v) => setField("audioMinutes", v)], ["Vidéo (secondes)", form.videoSeconds, (v) => setField("videoSeconds", v)], ["Énergie mesurée/déclarée (kWh)", form.energyKwh, (v) => setField("energyKwh", v)], ["Puissance moyenne locale (W)", form.averageWatts, (v) => setField("averageWatts", v)], ["Durée de mesure locale (s)", form.durationSeconds, (v) => setField("durationSeconds", v)], ["Puissance à vide locale (W)", form.idleWatts, (v) => setField("idleWatts", v)]])}
          <label className="grid gap-1 text-sm text-slate-800">Frontière énergétique<select value={form.energyBoundary ?? ""} onChange={(e) => setField("energyBoundary", (e.target.value || null) as FormState["energyBoundary"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="">Inconnue / non mesurée</option><option value="IT_FULL">IT complète (IT_FULL)</option><option value="FACILITY">Site complet (FACILITY)</option><option value="LOCAL_WALL">Prise murale locale (LOCAL_WALL)</option></select></label>
          <label className="grid gap-1 text-sm text-slate-800">Preuve énergétique<select value={form.energyEvidence ?? ""} onChange={(e) => setField("energyEvidence", (e.target.value || null) as FormState["energyEvidence"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="">Inconnue</option><option value="MEASURED">Mesurée</option><option value="DECLARED">Déclarée</option><option value="ASSUMPTION">Hypothèse</option></select></label>
        </div>
      </details>
      <p className="mt-4 text-sm text-slate-600">Une valeur vide reste inconnue; zéro doit être saisi explicitement. Les coûts et forfaits ne sont pas estimés.</p>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={calculate} className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white hover:bg-rose-800">Calculer</button>{isSignedIn && estimate ? <button type="button" onClick={() => void save()} disabled={busy || !normalized} className="rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-800 disabled:opacity-50">{busy ? "Enregistrement…" : editingId ? "Enregistrer la modification" : "Enregistrer dans mon espace privé"}</button> : null}{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); setEstimate(null); }} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700">Annuler la modification</button> : null}</div>
      {!isSignedIn && isLoaded && estimate ? <p className="mt-3 text-sm text-slate-700">Le calcul reste anonyme sur cette page. <a className="font-bold underline" href="/sign-in?redirect_url=%2Flearn%2Fempreinte-ia">Connectez-vous pour enregistrer cette déclaration</a>.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p> : null}{message ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
    </CmmCard>

    {estimate ? <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-results-title">
      <h2 id="personal-ai-results-title" className="text-xl font-black text-slate-950">Résultats qualifiés</h2>
      <p className="mt-2 text-sm text-slate-700">Qualité des données : <strong>{estimate.dataQuality}</strong>. Les valeurs NA représentent des facteurs inconnus ou une méthode non applicable.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["Énergie IT", estimate.physicalTotals.itEnergyKwh, "kWh"], ["Énergie site", estimate.physicalTotals.facilityEnergyKwh, "kWh"], ["Énergie murale locale", estimate.physicalTotals.localWallEnergyKwh ?? null, "kWh"], ["CO₂e opérationnel", estimate.physicalTotals.operationalKgCo2e, "kgCO₂e"], ["Eau directe", estimate.physicalTotals.directWaterLiters, "L"], ["Eau indirecte", estimate.physicalTotals.indirectWaterLiters, "L"], ["Eau totale", estimate.physicalTotals.totalWaterLiters, "L"], ["ACV partielle", estimate.physicalTotals.partialLcaKgCo2e, "kgCO₂e"]].map(([label, value, unit]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-bold tabular-nums text-slate-950">{number(value as number | null)} {unit}</dd></div>)}</dl>
      <p className="mt-4 text-sm text-slate-700">{estimate.methodologyNotes.join(" ")}</p><p className="mt-2 text-xs text-slate-600">Méthode {estimate.methodologyTrace.version} · facteurs versionnés {estimate.version} · aucune compensation carbone ou hydrique revendiquée.</p>
      <ul aria-label="Sources scientifiques" className="mt-3 grid gap-1 text-sm">{estimate.methodologyTrace.sources.map((source) => <li key={source} className="break-all"><a className="text-rose-800 underline" href={source} target="_blank" rel="noreferrer">{source}</a></li>)}</ul>
    </CmmCard> : null}

    {isSignedIn ? (
      <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-history-title">
        <h2 id="personal-ai-history-title" className="text-xl font-black text-slate-950">Mes déclarations privées</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">Aucune déclaration enregistrée.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.id} data-testid="personal-ai-declaration-row" data-declaration-id={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-950">
                  {item.declaration.quickScenario
                    ? `Estimation rapide · ${item.declaration.quickScenario.chatbot === "OTHER" ? item.declaration.quickScenario.chatbotLabel : item.declaration.quickScenario.chatbot}`
                    : item.declaration.provider} · {item.declaration.periodStartUtc?.slice(0, 10) ?? "Période inconnue"}
                  {item.declaration.periodEndUtc ? ` – ${item.declaration.periodEndUtc.slice(0, 10)} UTC` : ""}
                  {" · "}{item.status === "ACTIVE" ? "Active" : "Exclue"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  CO₂e : {number(item.snapshot.physicalTotals.operationalKgCo2e)} kg · eau : {number(item.snapshot.physicalTotals.totalWaterLiters)} L
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {item.source_identity_hash ? (
                    <span className="text-slate-700">Pour modifier ce relevé, réimportez la source.</span>
                  ) : (
                    <button type="button" className="font-bold text-rose-800 underline" onClick={() => {
                      if (item.declaration.quickScenario) {
                        window.dispatchEvent(new CustomEvent("personal-ai-edit-chat-scenario", { detail: item }));
                      } else {
                        setForm(formFromDraft(item.declaration)); setEditingId(item.id); setEstimate(item.snapshot);
                      }
                    }}>Modifier</button>
                  )}
                  <button type="button" className="font-bold text-rose-800 underline" onClick={() => void updateStatus(item, item.status === "ACTIVE" ? "EXCLUDED" : "ACTIVE").catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Mise à jour indisponible."))}>
                    {item.status === "ACTIVE" ? "Exclure" : "Réactiver"}
                  </button>
                  <button type="button" className="font-bold text-rose-800 underline" onClick={() => void remove(item)}>Supprimer</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMore ? (
          <button type="button" onClick={() => void loadMore()} disabled={busy} className="mt-4 rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-800 disabled:opacity-50">
            {busy ? "Chargement…" : "Charger plus"}
          </button>
        ) : null}
      </CmmCard>
    ) : null}
  </div>;
}
