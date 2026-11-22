"use client";

import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { estimateQuickChatScenario, type QuickChatScenarioInput, type QuickChatScenarioResult } from "@/lib/environmental-impact-estimator/personal-ai-quick-scenario";
import type { PersonalAiQuickScenario } from "@/lib/environmental-impact-estimator/personal-ai-usage-normalization";

type DeclarationRow = {
  id: string;
  declaration: { periodStartUtc: string | null; periodEndUtc: string | null; quickScenario?: PersonalAiQuickScenario };
};

type FormState = Omit<QuickChatScenarioInput, "periodStart" | "periodEnd"> & { periodStart: string; periodEnd: string; periodUnknown: boolean };

function emptyForm(): FormState {
  return {
    chatbot: "UNKNOWN", chatbotLabel: null, accessMode: "UNKNOWN", frequency: "UNKNOWN", exchanges: null,
    questionCharacters: null, answerCharacters: null, imageUse: null, audioUse: null,
    periodStart: "", periodEnd: "", periodUnknown: true, hypotheticalRegion: "UNKNOWN",
  };
}

function parseOptionalInteger(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function asRequestDraft(result: QuickChatScenarioResult) {
  const declaration = { ...result.declaration };
  const tokens = { ...declaration.tokens };
  delete (declaration as Partial<typeof declaration>).normalizationVersion;
  delete (tokens as Partial<typeof tokens>).logicalTotal;
  return { ...declaration, tokens };
}

function fromSaved(row: DeclarationRow): FormState | null {
  const quick = row.declaration.quickScenario;
  if (!quick) return null;
  return {
    ...quick,
    periodStart: row.declaration.periodStartUtc?.slice(0, 10) ?? "",
    periodEnd: row.declaration.periodEndUtc?.slice(0, 10) ?? "",
    periodUnknown: false,
    hypotheticalRegion: "UNKNOWN",
  };
}

function number(value: number | null): string {
  return value === null ? "NA" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(value);
}

const CHATBOT_LABELS: Record<PersonalAiQuickScenario["chatbot"], string> = {
  CHATGPT: "ChatGPT", CLAUDE: "Claude", GEMINI: "Gemini", COPILOT: "Copilot", MISTRAL: "Mistral",
  PERPLEXITY: "Perplexity", OTHER: "Autre", UNKNOWN: "Non précisé",
};

const FREQUENCY_LABELS: Record<PersonalAiQuickScenario["frequency"], string> = {
  OCCASIONAL: "occasionnelle", WEEKLY: "environ une fois par semaine", SEVERAL_WEEKLY: "plusieurs fois par semaine",
  DAILY: "chaque jour", MULTIPLE_DAILY: "plusieurs fois par jour", UNKNOWN: "inconnue",
};

export function PersonalAiQuickScenarioClient({ isSignedIn, isLoaded }: { isSignedIn: boolean; isLoaded: boolean }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [result, setResult] = useState<QuickChatScenarioResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onEdit = (event: Event) => {
      const row = (event as CustomEvent<DeclarationRow>).detail;
      const saved = fromSaved(row);
      if (!saved) return;
      setForm(saved);
      setResult(null);
      setEditingId(row.id);
      setError("");
      setMessage("");
    };
    window.addEventListener("personal-ai-edit-chat-scenario", onEdit);
    return () => window.removeEventListener("personal-ai-edit-chat-scenario", onEdit);
  }, []);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function calculate() {
    setError("");
    setMessage("");
    try {
      const { periodUnknown, ...values } = form;
      setResult(estimateQuickChatScenario({ ...values, periodStart: periodUnknown ? null : form.periodStart || null, periodEnd: periodUnknown ? null : form.periodEnd || null }));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Vérifiez les informations saisies.");
    }
  }

  async function save() {
    if (!isSignedIn || !result) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/personal-ai/declarations/${editingId}` : "/api/personal-ai/declarations", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { declaration: asRequestDraft(result) } : asRequestDraft(result)),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Enregistrement indisponible.");
      setEditingId(null);
      setMessage("Scénario enregistré dans votre espace privé comme activité déclarée.");
      window.dispatchEvent(new Event("personal-ai-chat-scenario-saved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement indisponible.");
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setResult(null);
    setError("");
    setMessage("");
  }

  return <div className="grid gap-6">
    <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-quick-title">
      <p className="text-sm font-bold uppercase tracking-wide text-rose-700">Sans facture ni tokens</p>
      <h2 id="personal-ai-quick-title" className="mt-1 text-xl font-black text-slate-950">Estimation rapide</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-700">Décrivez votre usage sans prompt ni compte fournisseur. Les longueurs restent des caractères visibles déclarés; elles ne sont pas converties en tokens.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-800">Chatbot
          <select value={form.chatbot} onChange={(event) => {
            const chatbot = event.target.value as FormState["chatbot"];
            setField("chatbot", chatbot);
            if (chatbot !== "OTHER") setField("chatbotLabel", null);
          }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="UNKNOWN">Je ne sais pas</option><option value="CHATGPT">ChatGPT</option><option value="CLAUDE">Claude</option><option value="GEMINI">Gemini</option><option value="COPILOT">Copilot</option><option value="MISTRAL">Mistral</option><option value="PERPLEXITY">Perplexity</option><option value="OTHER">Autre</option>
          </select>
        </label>
        {form.chatbot === "OTHER" ? <label className="grid gap-1 text-sm text-slate-800">Nom du chatbot (facultatif)
          <input maxLength={80} value={form.chatbotLabel ?? ""} onChange={(event) => setField("chatbotLabel", event.target.value || null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" />
        </label> : null}
        <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" checked={form.periodUnknown} onChange={(event) => {
          setField("periodUnknown", event.target.checked);
          if (event.target.checked) { setField("periodStart", ""); setField("periodEnd", ""); }
        }} /> Je ne sais pas la période
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Période (début inclus, fin exclue)
          <input type="date" disabled={form.periodUnknown} value={form.periodStart} onChange={(event) => { setField("periodStart", event.target.value); setField("periodUnknown", false); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 disabled:bg-slate-100" />
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Fin de période (UTC)
          <input type="date" disabled={form.periodUnknown} value={form.periodEnd} onChange={(event) => { setField("periodEnd", event.target.value); setField("periodUnknown", false); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 disabled:bg-slate-100" />
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Fréquence approximative
          <select value={form.frequency} onChange={(event) => setField("frequency", event.target.value as FormState["frequency"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="UNKNOWN">Je ne sais pas</option><option value="OCCASIONAL">Occasionnelle</option><option value="WEEKLY">Environ une fois par semaine</option><option value="SEVERAL_WEEKLY">Plusieurs fois par semaine</option><option value="DAILY">Chaque jour</option><option value="MULTIPLE_DAILY">Plusieurs fois par jour</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Nombre d’échanges sur cette période (facultatif)
          <input type="number" min="0" step="1" value={form.exchanges ?? ""} onChange={(event) => setField("exchanges", parseOptionalInteger(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" />
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Longueur habituelle d’une question, en caractères (facultatif)
          <input type="number" min="0" max="1000000" step="1" value={form.questionCharacters ?? ""} onChange={(event) => setField("questionCharacters", parseOptionalInteger(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" />
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Longueur habituelle d’une réponse, en caractères (facultatif)
          <input type="number" min="0" max="1000000" step="1" value={form.answerCharacters ?? ""} onChange={(event) => setField("answerCharacters", parseOptionalInteger(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" />
        </label>
        <label className="grid gap-1 text-sm text-slate-800">Offre utilisée (n’influence pas le calcul énergétique)
          <select value={form.accessMode} onChange={(event) => setField("accessMode", event.target.value as FormState["accessMode"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="UNKNOWN">Je ne sais pas</option><option value="FREE">Gratuite</option><option value="SUBSCRIPTION">Abonnement</option>
          </select>
        </label>
        {(["imageUse", "audioUse"] as const).map((field) => <label key={field} className="grid gap-1 text-sm text-slate-800">{field === "imageUse" ? "Utilisation d’images" : "Utilisation audio"}
          <select value={form[field] === null ? "UNKNOWN" : form[field] ? "YES" : "NO"} onChange={(event) => setField(field, event.target.value === "UNKNOWN" ? null : event.target.value === "YES")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="UNKNOWN">Je ne sais pas</option><option value="YES">Oui, non quantifiable ici</option><option value="NO">Non</option>
          </select>
        </label>)}
        <label className="grid gap-1 text-sm text-slate-800">Simulation régionale séparée (hypothétique)
          <select value={form.hypotheticalRegion} onChange={(event) => setField("hypotheticalRegion", event.target.value as FormState["hypotheticalRegion"])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="UNKNOWN">Aucune région hypothétique</option><option value="FR">France — simulation</option><option value="US">États-Unis — simulation</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={calculate} className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white hover:bg-rose-800">Calculer sans compte</button>
        {isSignedIn && result && result.declaration.periodStartUtc !== null ? <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-800 disabled:opacity-50">{busy ? "Enregistrement…" : editingId ? "Enregistrer la modification" : "Enregistrer mon scénario"}</button> : null}
        {editingId ? <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700">Annuler la modification</button> : null}
      </div>
      {!isSignedIn && isLoaded && result && result.declaration.periodStartUtc !== null ? <p className="mt-3 text-sm text-slate-700">Le calcul reste anonyme. <a className="font-bold underline" href="/sign-in?redirect_url=%2Flearn%2Fempreinte-ia">Connectez-vous pour enregistrer ce scénario privé</a>.</p> : null}
      {!isSignedIn && isLoaded && result && result.declaration.periodStartUtc === null ? <p className="mt-3 text-sm text-slate-700">La période est inconnue; le calcul reste anonyme et cette activité ne peut pas encore être enregistrée.</p> : null}
      {isSignedIn && result && result.declaration.periodStartUtc === null ? <p className="mt-3 text-sm text-slate-700">La période est inconnue; ce scénario reste anonyme et ne peut pas encore être enregistré.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      {message ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
    </CmmCard>

    {result ? <>
      <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-quick-activity-title">
        <h3 id="personal-ai-quick-activity-title" className="text-lg font-black text-slate-950">Votre activité déclarée</h3>
        <p className="mt-2 text-sm text-slate-700">Chatbot : {result.declaration.quickScenario?.chatbot === "OTHER" ? result.declaration.quickScenario.chatbotLabel : CHATBOT_LABELS[result.declaration.quickScenario?.chatbot ?? "UNKNOWN"]} · offre : {result.declaration.quickScenario?.accessMode === "FREE" ? "gratuite" : result.declaration.quickScenario?.accessMode === "SUBSCRIPTION" ? "abonnement" : "inconnue"} · fréquence : {FREQUENCY_LABELS[result.declaration.quickScenario?.frequency ?? "UNKNOWN"]}.</p>
        <p className="mt-1 text-sm text-slate-700">Période UTC : {result.declaration.periodStartUtc?.slice(0, 10) ?? "inconnue"}{result.declaration.periodEndUtc ? ` – ${result.declaration.periodEndUtc.slice(0, 10)} (fin exclue)` : ""} · {result.declaration.quickScenario?.exchanges === null ? "nombre d’échanges inconnu" : `${number(result.declaration.quickScenario?.exchanges ?? null)} échanges déclarés`} · questions : {number(result.declaration.quickScenario?.questionCharacters ?? null)} caractères · réponses : {number(result.declaration.quickScenario?.answerCharacters ?? null)} caractères.</p>
        <p className="mt-3 text-sm font-semibold text-slate-800">Énergie attribuable à cette activité : {number(result.personalEstimate.physicalTotals.facilityEnergyKwh)} kWh. CO₂e et eau : NA. Les longueurs visibles ne révèlent ni les tokens réellement traités, ni le contexte caché, ni le matériel ou sa région.</p>
        <p className="mt-2 text-xs text-slate-600">Les usages d’image ({result.declaration.quickScenario?.imageUse === null ? "inconnu" : result.declaration.quickScenario?.imageUse ? "déclaré" : "aucun déclaré"}) et d’audio ({result.declaration.quickScenario?.audioUse === null ? "inconnu" : result.declaration.quickScenario?.audioUse ? "déclaré" : "aucun déclaré"}) restent séparés et non quantifiés. Source : déclaration utilisateur; statut physique : non calculable.</p>
      </CmmCard>

      <CmmCard as="section" tone="slate" variant="glass" size="lg" aria-labelledby="personal-ai-reference-simulation-title">
        <h3 id="personal-ai-reference-simulation-title" className="text-lg font-black text-slate-950">Simulation indépendante : 1 million de tokens hypothétiques</h3>
        <p className="mt-2 text-sm text-slate-700">Cette simulation n’est pas déduite de vos échanges et ne représente pas votre consommation. Les scénarios bas, central et haut sont des sensibilités, pas des bornes garanties. Région de la simulation : {result.referenceSimulation.region === "UNKNOWN" ? "inconnue — aucune hypothèse géographique" : `${result.referenceSimulation.region} — hypothèse choisie`}.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">{result.referenceSimulation.scenarios.map(({ scenario, factorId, factorVersion, estimate }) => <div key={scenario} className="rounded-xl border border-slate-200 bg-white p-3"><dt className="font-bold capitalize text-slate-950">{scenario}</dt><dd className="mt-2 text-sm text-slate-700">Énergie site : {number(estimate.physicalTotals.facilityEnergyKwh)} kWh<br />CO₂e opérationnel : {number(estimate.physicalTotals.operationalKgCo2e)} kg<br />Eau directe : {number(estimate.physicalTotals.directWaterLiters)} L<br />Eau indirecte : {number(estimate.physicalTotals.indirectWaterLiters)} L</dd><dd className="mt-2 text-xs text-slate-600">Facteur {factorId}@{factorVersion}; méthode {estimate.methodologyTrace.version}.</dd></div>)}</dl>
        <p className="mt-3 text-xs text-slate-600">Les émissions dépendent uniquement de la région hypothétique et des facteurs disponibles; toute région ou tout facteur inconnu conserve le résultat correspondant à NA. Aucune conformité EcoLogits ni compensation n’est revendiquée.</p>
      </CmmCard>
    </> : null}
  </div>;
}
