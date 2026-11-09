"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { readinessStatusLabel, type SpogomiRegistrationPolicy, type SpogomiRegistrationReadiness, type SpogomiRegistrationReadinessItem } from "@/lib/spogomi/registration-readiness";

type Props = {
  eventId: string;
  state: string;
  publicVisibility: "private" | "published";
  readiness: SpogomiRegistrationReadiness;
  busy: boolean;
  action: (url: string, init?: RequestInit) => Promise<Record<string, unknown> | null>;
};

function itemTone(item: SpogomiRegistrationReadinessItem): string {
  return item.status === "complete" ? "bg-emerald-50 text-emerald-900" : item.status === "not_verified" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900";
}

function itemLabel(item: SpogomiRegistrationReadinessItem): string {
  return item.status === "complete" ? "Complet" : readinessStatusLabel(item.status);
}

export function SpogomiRegistrationReadinessCard({ eventId, state, publicVisibility, readiness, busy, action }: Props) {
  const [policy, setPolicy] = useState<SpogomiRegistrationPolicy>(readiness.policy);
  const setText = (key: keyof SpogomiRegistrationPolicy, value: string) => setPolicy((current) => ({ ...current, [key]: value }));
  const save = () => {
    void action("/api/spogomi/events/" + eventId, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registrationPolicy: {
        capacity: policy.capacity === "" ? null : policy.capacity,
        safetyInstructions: policy.safetyInstructions ?? "",
        safetyInstructionsVerified: policy.safetyInstructionsVerified === true,
        organizationContact: policy.organizationContact ?? "",
        organizationContactVerified: policy.organizationContactVerified === true,
        assistanceProcedure: policy.assistanceProcedure ?? "",
        assistanceProcedureVerified: policy.assistanceProcedureVerified === true,
        minorsApplicable: policy.minorsApplicable === true,
        minorInformation: policy.minorInformation ?? "",
        minorInformationVerified: policy.minorInformationVerified === true,
      } }),
    }).catch(() => undefined);
  };
  const readinessItems = [
    ...readiness.editionItems,
    ...readiness.divisions.flatMap((division) => division.items.map((item) => ({
      ...item,
      label: (division.divisionType === "world_cup" ? "World Cup" : "Casual") + " · " + item.label,
    }))),
  ];
  return <div id="spogomi-registration-readiness"><CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-black text-slate-900">Préparation à l’ouverture des inscriptions</h2>
        <p className="text-sm text-slate-600">La fiche peut rester publiée incomplète. Les nouvelles inscriptions libre-service restent bloquées jusqu’à la vérification serveur de chaque condition obligatoire.</p>
      </div>
      <CmmButton type="button" tone="primary" disabled={busy || state !== "draft" || publicVisibility !== "published" || !readiness.ready} onClick={() => { void action("/api/spogomi/events/" + eventId + "/registration/open", { method: "POST" }).catch(() => undefined); }}>
        {state === "registration_open" ? "Inscriptions ouvertes" : "Ouvrir les inscriptions"}
      </CmmButton>
    </div>
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Checklist de préparation des inscriptions">
      {readinessItems.map((item, index) => <a key={item.id + "-" + item.href + "-" + index} href={item.href} className={"rounded-lg p-3 text-sm font-bold " + itemTone(item)}><span className="block">{item.label}</span><span className="text-xs font-normal">{itemLabel(item)}{item.required ? " · obligatoire" : " · non applicable"}</span></a>)}
    </div>
    {readiness.divisions.map((division) => <div key={division.divisionId} className="rounded-xl border border-black/10 bg-white/70 p-3 text-sm"><p className="font-black">{division.divisionType === "world_cup" ? "World Cup" : "Casual"} · {division.ready ? "prête" : "à compléter"}</p><p className="mt-1 text-slate-600">Les éléments réglementaires, catégories, horaires, capacité et éligibilité sont évalués pour cette division uniquement.</p></div>)}
    <div id="spogomi-event-information" className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-bold">Capacité totale par division<input className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2" type="number" min="1" step="1" value={policy.capacity ?? ""} onChange={(event) => setPolicy((current) => ({ ...current, capacity: event.target.value }))} /></label>
      <label className="flex items-center gap-2 self-end text-sm font-bold"><input type="checkbox" checked={policy.minorsApplicable === true} onChange={(event) => setPolicy((current) => ({ ...current, minorsApplicable: event.target.checked }))} />Des mineurs peuvent participer</label>
      <label className="text-sm font-bold">Consignes de sécurité<textarea className="mt-1 min-h-24 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" value={policy.safetyInstructions ?? ""} onChange={(event) => setText("safetyInstructions", event.target.value)} /></label>
      <label className="text-sm font-bold">Contact d’organisation<textarea className="mt-1 min-h-24 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" value={policy.organizationContact ?? ""} onChange={(event) => setText("organizationContact", event.target.value)} /></label>
      <label className="text-sm font-bold">Procédure d’assistance<textarea className="mt-1 min-h-24 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" value={policy.assistanceProcedure ?? ""} onChange={(event) => setText("assistanceProcedure", event.target.value)} /></label>
      {policy.minorsApplicable === true ? <label className="text-sm font-bold">Informations utiles aux mineurs<textarea className="mt-1 min-h-24 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" value={policy.minorInformation ?? ""} onChange={(event) => setText("minorInformation", event.target.value)} /></label> : null}
    </div>
    <div className="flex flex-wrap gap-3 text-sm">
      {(["safetyInstructionsVerified", "organizationContactVerified", "assistanceProcedureVerified", "minorInformationVerified"] as const).map((key) => key === "minorInformationVerified" && policy.minorsApplicable !== true ? null : <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={policy[key] === true} onChange={(event) => setPolicy((current) => ({ ...current, [key]: event.target.checked }))} />{key === "minorInformationVerified" ? "Informations mineurs vérifiées" : key === "safetyInstructionsVerified" ? "Sécurité vérifiée" : key === "organizationContactVerified" ? "Contact vérifié" : "Assistance vérifiée"}</label>)}
    </div>
    <CmmButton type="button" tone="secondary" disabled={busy} onClick={save}>Enregistrer la préparation</CmmButton>
    {!readiness.ready ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Complétez les éléments signalés en rouge ou orange. Le serveur refusera l’ouverture et les nouvelles inscriptions tant qu’ils ne sont pas complets.</p> : null}
  </CmmCard></div>;
}
