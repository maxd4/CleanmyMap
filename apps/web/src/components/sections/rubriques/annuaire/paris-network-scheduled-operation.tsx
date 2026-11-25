"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import type { ScheduledParisOperation } from "@/lib/partners/paris-cleanwalk-network.scheduled";

const ROLE_FR = { porteur: "Porteur déclaré", collaborateur: "Collaborateur déclaré", participant: "Participant déclaré" } as const;
const ROLE_EN = { porteur: "Declared lead", collaborateur: "Declared collaborator", participant: "Declared participant" } as const;

export function ScheduledOperationDetails({ operation, fr }: { operation: ScheduledParisOperation; fr: boolean }) {
  const names = new Map(PARIS_CLEANWALK_ACTORS.map(actor => [actor.id, actor.name]));
  const roles = fr ? ROLE_FR : ROLE_EN;
  const unknown = fr ? "Non renseigné" : "Not provided";
  const fields = [
    [fr ? "Rendez-vous" : "Meeting point", operation.meetingPoint],
    [fr ? "Horaire" : "Time", operation.time],
    [fr ? "Parcours" : "Route", operation.route],
    [fr ? "Classes" : "Classes", operation.classes],
    [fr ? "Effectif" : "Students", operation.studentCount],
    [fr ? "Encadrants" : "Supervisors", operation.supervisors],
    [fr ? "Matériel" : "Equipment", operation.equipment],
  ] as const;
  return <div className="space-y-2 text-xs text-slate-200">
    <p className="font-bold text-amber-300">{fr ? "Programmée · déclaration de l’organisateur" : "Scheduled · organizer declaration"}</p>
    <p><strong>Date :</strong> {fr ? operation.date.split("-").reverse().join("/") : operation.date}</p>
    <p><strong>{fr ? "Lieu de ramassage" : "Collection location"} :</strong> {operation.location ?? unknown}</p>
    <p><strong>{fr ? "Établissement annoncé" : "Announced school"} :</strong> {operation.announcedSchoolName}{operation.schoolIdentification === "probable" ? (fr ? " (identification probable, à confirmer)" : " (probable identification, to confirm)") : ""}</p>
    <ul>{operation.actors.map(actor => <li key={actor.actorId}>{names.get(actor.actorId) ?? actor.actorId} : {actor.role ? roles[actor.role] : fr ? "Rôle opérationnel non renseigné" : "Operational role not provided"}</li>)}</ul>
    <dl className="space-y-1">{fields.map(([label, value]) => <div key={label}><dt className="inline font-semibold">{label} : </dt><dd className="inline">{value ?? unknown}</dd></div>)}</dl>
    <p>{fr ? "Déclaration du" : "Declared on"} {operation.provenance.declaredOn}. {fr ? "Aucune URL publique propre à l’opération. La fiche de l’école ne prouve pas sa réalisation." : "No public event-specific URL. The school listing does not prove completion."}</p>
    <p>{fr ? "Aucun résultat ni partenariat permanent établi." : "No result or permanent partnership established."}</p>
  </div>;
}

export function ScheduledOperationPanel({ operation, onClose, fr }: { operation: ScheduledParisOperation; onClose: () => void; fr: boolean }) {
  const id = useId();
  return <section role="dialog" aria-modal="false" aria-labelledby={id} className="absolute inset-x-3 top-3 z-40 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-amber-400/50 bg-slate-950 p-4 text-white shadow-xl sm:left-auto sm:right-3 sm:w-96">
    <div className="mb-3 flex items-start justify-between gap-2"><h3 id={id} className="font-bold">{operation.label}</h3><button type="button" aria-label={fr ? "Fermer l’opération" : "Close operation"} onClick={onClose} className="rounded p-1 focus-visible:ring-2 focus-visible:ring-amber-400"><X size={16}/></button></div>
    <ScheduledOperationDetails operation={operation} fr={fr}/>
  </section>;
}
