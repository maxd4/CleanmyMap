"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiFieldOperationsCapability } from "@/lib/spogomi/field-operations-service";
import { dateTimeInput, dateTimeIso, type ScheduleDateField } from "./spogomi-field-operations-schedule";

type Row = Record<string, unknown>;
type Dashboard = { divisions: Row[]; teams: Row[]; categories: Row[]; operations: Row[]; returns: Row[]; incidents: Row[]; measurements: Row[] };
type ScheduleField = "timezoneName" | "regulationVersion" | "officialStartAt" | "collectionLimitAt" | "sortingLimitAt" | "weighingStartAt" | "weighingEndAt" | "reason" | "provenance";
type ScheduleDraft = Record<ScheduleField, string>;
type PersistedSchedule = { draft: ScheduleDraft; exactInstants: Record<ScheduleDateField, string | null>; updatedAt: string | null };
type ScheduleDraftEntry = { draft: ScheduleDraft; persisted: PersistedSchedule };

function text(row: Row, key: string): string { return String(row[key] ?? ""); }
function dateLabel(value: unknown): string { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "—"; }

function scheduleFromPersisted(operation: Row | null, division: Row | null): PersistedSchedule {
  const timezoneName = text(operation ?? {}, "timezone_name");
  const draft = {
    timezoneName,
    regulationVersion: text(operation ?? {}, "regulation_version") || text(division ?? {}, "regulation_version"),
    officialStartAt: dateTimeInput(operation?.official_start_at, timezoneName),
    collectionLimitAt: dateTimeInput(operation?.collection_limit_at, timezoneName),
    sortingLimitAt: dateTimeInput(operation?.sorting_limit_at, timezoneName),
    weighingStartAt: dateTimeInput(operation?.weighing_start_at, timezoneName),
    weighingEndAt: dateTimeInput(operation?.weighing_end_at, timezoneName),
    reason: "",
    provenance: "",
  };
  return {
    draft,
    exactInstants: {
      officialStartAt: operation?.official_start_at ? String(operation.official_start_at) : null,
      collectionLimitAt: operation?.collection_limit_at ? String(operation.collection_limit_at) : null,
      sortingLimitAt: operation?.sorting_limit_at ? String(operation.sorting_limit_at) : null,
      weighingStartAt: operation?.weighing_start_at ? String(operation.weighing_start_at) : null,
      weighingEndAt: operation?.weighing_end_at ? String(operation.weighing_end_at) : null,
    },
    updatedAt: operation?.updated_at ? String(operation.updated_at) : null,
  };
}

export function SpogomiFieldOperationsPanel({ eventId, capabilities }: { eventId: string; capabilities: readonly SpogomiFieldOperationsCapability[] }) {
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [divisionId, setDivisionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [categoryRuleId, setCategoryRuleId] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("safety");
  const [decisionRule, setDecisionRule] = useState("");
  const [decisionJustification, setDecisionJustification] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraftEntry>>({});

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/spogomi/events/${eventId}/field-operations`, { cache: "no-store" });
    if (!response.ok) throw new Error("Impossible de charger les opérations terrain.");
    const data = await response.json() as Dashboard;
    setDashboard(data);
    if (data.divisions[0]) setDivisionId((previous) => previous || text(data.divisions[0], "id"));
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Erreur de chargement.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function mutate(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/field-operations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "La décision n’a pas été enregistrée.");
      try {
        await refresh();
        setMessage("Décision enregistrée avec sa provenance.");
      } catch {
        setMessage("Décision enregistrée, mais l’actualisation a échoué. Actualisez pour voir l’état courant.");
      }
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur d’enregistrement."); return false; }
    finally { setBusy(false); }
  }

  const selectedDivision = dashboard?.divisions.find((row) => text(row, "id") === divisionId) ?? null;
  const selectedOperation = dashboard?.operations.find((row) => text(row, "division_id") === divisionId) ?? null;
  const canConfigureSchedule = capabilitySet.has("timing");
  const persistedSchedule = scheduleFromPersisted(selectedOperation, selectedDivision);
  const selectedScheduleDraft = scheduleDrafts[divisionId] ?? null;
  const scheduleDirty = Boolean(selectedScheduleDraft);
  const effectiveScheduleDraft = selectedScheduleDraft?.draft ?? persistedSchedule.draft;

  if (!dashboard) return <CmmCard tone="emerald" variant="glass" className="p-5">Chargement des opérations terrain…</CmmCard>;
  const teams = dashboard.teams.filter((row) => !divisionId || text(row, "division_id") === divisionId);
  const categories = dashboard.categories.filter((row) => !divisionId || text(row, "division_id") === divisionId);
  const selectedCategory = categories.find((row) => text(row, "id") === categoryRuleId);
  const canMeasure = capabilitySet.has("measurement_entry") || capabilitySet.has("weighing");
  const canArbitrate = capabilitySet.has("arbitration");

  function updateSchedule(field: ScheduleField, value: string) {
    setScheduleDrafts((previous) => {
      const existing = previous[divisionId];
      const persisted = existing?.persisted ?? persistedSchedule;
      const draft = existing?.draft ?? persisted.draft;
      return { ...previous, [divisionId]: { persisted, draft: { ...draft, [field]: value } } };
    });
  }

  function abandonScheduleDraft() {
    setScheduleDrafts((previous) => {
      const next = { ...previous };
      delete next[divisionId];
      return next;
    });
    setMessage("Brouillon d’horaires abandonné pour cette division.");
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!divisionId || !canConfigureSchedule) return;
    try {
      const preserved = selectedScheduleDraft?.persisted ?? persistedSchedule;
      const toIso = (field: ScheduleDateField) => dateTimeIso(effectiveScheduleDraft[field], effectiveScheduleDraft.timezoneName, {
        localValue: preserved.draft[field],
        instant: preserved.exactInstants[field],
      });
      const saved = await mutate({
        action: "configure",
        divisionId,
        timezoneName: effectiveScheduleDraft.timezoneName,
        regulationVersion: effectiveScheduleDraft.regulationVersion,
        officialStartAt: toIso("officialStartAt"),
        collectionLimitAt: toIso("collectionLimitAt"),
        sortingLimitAt: toIso("sortingLimitAt"),
        weighingStartAt: toIso("weighingStartAt"),
        weighingEndAt: toIso("weighingEndAt"),
        expectedUpdatedAt: preserved.updatedAt,
        reason: effectiveScheduleDraft.reason,
        provenance: effectiveScheduleDraft.provenance,
      });
      if (saved) setScheduleDrafts((previous) => { const next = { ...previous }; delete next[divisionId]; return next; });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "L’horaire local est invalide.");
    }
  }

  return <div className="space-y-4">
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="cmm-text-h3">Terrain · chronométrage, retours et mesures</h2><p className="text-sm text-slate-700">Les observations, mesures et décisions restent séparées et historisées. Cette vue ne certifie pas un classement.</p></div><CmmButton type="button" tone="secondary" onClick={() => { void /* fire-and-forget -- the field cockpit owns refresh state and errors. */ refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Erreur de chargement.")); }}>Actualiser</CmmButton></div>
      <label className="grid gap-1 text-sm font-bold text-slate-800">Division<select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); setTeamId(""); setCategoryRuleId(""); }}><option value="">Toutes</option>{dashboard.divisions.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "division_type")} · règlement {text(row, "regulation_version")}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><strong>Phases</strong><p>{dashboard.operations.length} configuration(s)</p></div><div><strong>Retours</strong><p>{dashboard.returns.length} équipe(s)</p></div><div><strong>Incidents</strong><p>{dashboard.incidents.filter((row) => text(row, "decision_status") === "open").length} à traiter</p></div><div><strong>Mesures</strong><p>{dashboard.measurements.filter((row) => text(row, "status") !== "certified").length} non certifiée(s)</p></div></div>
    </CmmCard>

    <CmmCard tone="slate" variant="glass" className="space-y-4 p-5">
      <div>
        <h3 className="font-black text-slate-900">Horaires officiels de la division</h3>
        <p className="text-sm text-slate-700">Les valeurs sont celles de la division sélectionnée. Aucun créneau n’est inventé ; les champs vides restent vides jusqu’à une saisie validée par le serveur.</p>
      </div>
      {!divisionId ? <p role="note" className="text-sm text-slate-700">Choisissez une division pour consulter ou configurer ses horaires.</p> : <form className="space-y-4" onSubmit={(event) => { void submitSchedule(event); }}>
        <fieldset disabled={!canConfigureSchedule || busy} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-slate-800">Fuseau horaire<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="timezoneName" value={effectiveScheduleDraft.timezoneName} onChange={(event) => updateSchedule("timezoneName", event.target.value)} placeholder="Europe/Paris" maxLength={80} required /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Version réglementaire<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="regulationVersion" value={effectiveScheduleDraft.regulationVersion} onChange={(event) => updateSchedule("regulationVersion", event.target.value)} placeholder="Version persistée ou référence" maxLength={120} required /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Début officiel<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="officialStartAt" type="datetime-local" value={effectiveScheduleDraft.officialStartAt} onChange={(event) => updateSchedule("officialStartAt", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Fin de collecte (limite)<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="collectionLimitAt" type="datetime-local" value={effectiveScheduleDraft.collectionLimitAt} onChange={(event) => updateSchedule("collectionLimitAt", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Fin du tri<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="sortingLimitAt" type="datetime-local" value={effectiveScheduleDraft.sortingLimitAt} onChange={(event) => updateSchedule("sortingLimitAt", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Début de pesée<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="weighingStartAt" type="datetime-local" value={effectiveScheduleDraft.weighingStartAt} onChange={(event) => updateSchedule("weighingStartAt", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">Fin de pesée<input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" name="weighingEndAt" type="datetime-local" value={effectiveScheduleDraft.weighingEndAt} onChange={(event) => updateSchedule("weighingEndAt", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800 sm:col-span-2">Motif de la configuration<textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2" name="reason" value={effectiveScheduleDraft.reason} onChange={(event) => updateSchedule("reason", event.target.value)} placeholder="Motif obligatoire pour l’historique" maxLength={500} required /></label>
            <label className="grid gap-1 text-sm font-bold text-slate-800 sm:col-span-2">Provenance<textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2" name="provenance" value={effectiveScheduleDraft.provenance} onChange={(event) => updateSchedule("provenance", event.target.value)} placeholder="Source de la configuration" maxLength={500} required /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3"><CmmButton type="submit" tone="primary" disabled={busy}>{selectedOperation ? "Enregistrer les horaires" : "Configurer les horaires"}</CmmButton>{scheduleDirty ? <CmmButton type="button" tone="secondary" disabled={busy} onClick={abandonScheduleDraft}>Abandonner le brouillon</CmmButton> : null}<p className="text-xs text-slate-600">Les relations entre horaires, les transitions et l’autorisation timing sont contrôlées par le service et le RPC.</p></div>
        </fieldset>
        {!canConfigureSchedule ? <p role="note" className="text-sm font-semibold text-slate-700">Consultation seule : l’habilitation « timing » est requise pour modifier les horaires.</p> : null}
        <p className="text-xs text-slate-600">Phase persistée : {text(selectedOperation ?? {}, "phase") || "non configurée"} · fin de collecte constatée : {dateLabel(selectedOperation?.collection_end_at)}</p>
      </form>}
    </CmmCard>

    {capabilitySet.has("timing") ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Phase officielle</h3><div className="flex flex-wrap gap-2">{["collection", "sorting", "weighing", "closed"].map((phase) => <CmmButton key={phase} tone="primary" disabled={!divisionId || busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "phase", divisionId, phase, at: new Date().toISOString(), reason: "Constat opérationnel du responsable habilité", provenance: "cockpit_terrain" }); }}>{phase}</CmmButton>)}</div><p className="text-xs text-slate-600">L’heure du serveur et la provenance font foi ; l’horloge du navigateur sert seulement à préparer l’action.</p></CmmCard> : null}

    {capabilitySet.has("arrival") ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Retour d’équipe</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choisir une équipe</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><CmmButton tone="primary" disabled={!divisionId || !teamId || busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "return", divisionId, teamId, actualReturnAt: new Date().toISOString(), reason: "Retour constaté à l’accueil", note: null }); }}>Constater le retour maintenant</CmmButton></div></CmmCard> : null}

    {canMeasure ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Saisie d’une mesure</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choisir une équipe</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={categoryRuleId} onChange={(event) => setCategoryRuleId(event.target.value)}><option value="">Choisir une catégorie</option>{categories.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "label")} · {text(row, "unit")}</option>)}</select><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" inputMode="decimal" placeholder="Valeur canonique" value={measurementValue} onChange={(event) => setMeasurementValue(event.target.value)} /><CmmButton tone="primary" disabled={!teamId || !categoryRuleId || !measurementValue || busy} onClick={() => { const kind = text(selectedCategory ?? {}, "measurement_kind"); const value = Number(measurementValue); void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "measurement", divisionId, teamId, categoryRuleId, measurementKind: kind, unit: text(selectedCategory ?? {}, "unit"), quantity: kind === "volume" ? value : null, massGrams: kind === "mass" ? value : null, objectCount: kind === "count" ? value : null, measurementMethod: "saisie terrain", provenance: "constat opérateur habilité", sourceKind: "field_entry", sourceReference: null, reason: "Mesure saisie depuis le cockpit terrain" }); }}>Enregistrer la mesure</CmmButton></div><p className="text-xs text-slate-600">La masse reste une masse et le comptage reste un comptage : aucune conversion implicite n’est effectuée.</p></CmmCard> : null}

    {canArbitrate ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Journal d’incident</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Incident général</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={incidentCategory} onChange={(event) => setIncidentCategory(event.target.value)}><option value="safety">Sécurité</option><option value="delay">Retard</option><option value="boundary_violation">Zone</option><option value="sorting">Tri</option><option value="contest">Contest</option></select><textarea className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 sm:col-span-2" placeholder="Observation brute, sans décision implicite" value={incidentText} onChange={(event) => setIncidentText(event.target.value)} /><CmmButton tone="important" disabled={!divisionId || !incidentText.trim() || busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "incident", divisionId, teamId: teamId || null, category: incidentCategory, observedAt: new Date().toISOString(), location: null, rawObservation: incidentText, reason: "Observation terrain enregistrée" }); }}>Enregistrer l’observation</CmmButton></div><p className="text-xs text-slate-600">Une observation n’applique aucune pénalité et ne prononce aucune disqualification automatiquement.</p></CmmCard> : null}

    {dashboard.incidents.length || dashboard.measurements.length ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Historique récent et décisions</h3>{canArbitrate && dashboard.incidents.some((row) => text(row, "decision_status") === "open") ? <div className="grid gap-3 sm:grid-cols-2"><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" placeholder="Référence du règlement" value={decisionRule} onChange={(event) => setDecisionRule(event.target.value)} /><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" placeholder="Justification de la décision" value={decisionJustification} onChange={(event) => setDecisionJustification(event.target.value)} /></div> : null}<ul className="space-y-2 text-sm text-slate-800">{dashboard.incidents.slice(0, 5).map((row) => <li key={text(row, "id")} className="rounded-xl border border-slate-200 p-3"><div><strong>{text(row, "category")}</strong> · {dateLabel(row.observed_at)} · {text(row, "decision_status")}</div>{canArbitrate && text(row, "decision_status") === "open" ? <div className="mt-2 flex flex-wrap gap-2"><CmmButton size="sm" tone="important" disabled={!decisionRule.trim() || !decisionJustification.trim() || busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "incident_decision", divisionId: text(row, "division_id"), incidentId: text(row, "id"), decisionKind: "warning", decisionPoints: null, ruleReference: decisionRule, justification: decisionJustification, scoreEffect: {} }); }}>Décider un avertissement</CmmButton><CmmButton size="sm" tone="critical" disabled={!decisionRule.trim() || !decisionJustification.trim() || busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "incident_decision", divisionId: text(row, "division_id"), incidentId: text(row, "id"), decisionKind: "disqualification", decisionPoints: null, ruleReference: decisionRule, justification: decisionJustification, scoreEffect: {} }); }}>Prononcer une disqualification</CmmButton></div> : null}</li>)}{dashboard.measurements.slice(0, 5).map((row) => <li key={text(row, "id")} className="rounded-xl border border-slate-200 p-3"><div><strong>{text(row, "measurement_kind")}</strong> · {text(row, "status")} · révision {text(row, "revision")} · {dateLabel(row.updated_at)}</div>{capabilitySet.has("certification") && text(row, "status") !== "certified" ? <div className="mt-2 flex flex-wrap gap-2"><CmmButton size="sm" tone="primary" disabled={busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "measurement_decision", divisionId: text(row, "division_id"), measurementId: text(row, "id"), decision: "certified", rejectionReason: null }); }}>Certifier la mesure</CmmButton><CmmButton size="sm" tone="secondary" disabled={busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate({ action: "measurement_decision", divisionId: text(row, "division_id"), measurementId: text(row, "id"), decision: "rejected", rejectionReason: "Mesure à reprendre après contrôle" }); }}>Rejeter pour reprise</CmmButton></div> : null}</li>)}</ul></CmmCard> : null}
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}</p> : null}
  </div>;
}
