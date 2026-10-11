"use client";

import { CalendarDays, CheckCircle2, Clock3, Copy, MapPin, Navigation, Package, Printer, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { fetchActionDayBriefing, type ActionDayBriefing } from "@/lib/actions/day-briefing-http";
import { buildActionDayBriefingText } from "./action-day-briefing";
import { buildActionIcsHref } from "@/components/sections/rubriques/community/ics";
import { CmmButton } from "@/components/ui/cmm-button";

function formatRoute(briefing: ActionDayBriefing["action"]): string {
  if (briefing.route.topology === "loop") return "Boucle";
  if (briefing.route.topology === "point_to_point") return "Point à point";
  return "Lieu fixe";
}

function mapHref(map: ActionDayBriefing["action"]["map"]): string | null {
  if (map.latitude === null || map.longitude === null) return null;
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(map.latitude)}&mlon=${encodeURIComponent(map.longitude)}#map=17/${encodeURIComponent(map.latitude)}/${encodeURIComponent(map.longitude)}`;
}

export function ActionDayView({ actionId }: { actionId: string }) {
  const [loadedBriefing, setLoadedBriefing] = useState<ActionDayBriefing | null>(null);
  const [error, setError] = useState<{ actionId: string; message: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    let active = true;
    void fetchActionDayBriefing(actionId).then((value) => { if (active) setLoadedBriefing(value); }).catch((reason: unknown) => { if (active) setError({ actionId, message: reason instanceof Error ? reason.message : "Briefing indisponible." }); });
    return () => { active = false; };
  }, [actionId]);

  const actionBriefing = loadedBriefing?.actionId === actionId ? loadedBriefing : null;
  const actionError = error?.actionId === actionId ? error.message : null;
  if (actionError) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">{actionError}</div>;
  if (!actionBriefing) return <div role="status" className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-sm font-semibold text-emerald-900">Chargement du briefing…</div>;

  const briefing = actionBriefing;
  const action = briefing.action;
  const href = mapHref(action.map);
  const calendarHref = buildActionIcsHref({ id: briefing.actionId, title: action.title, actionDate: action.actionDate, startTime: action.eventStartTime ?? action.meetingTime, endTime: action.eventEndTime, location: action.meetingPoint, description: action.participantMessage ?? action.safetyInstructions });
  const copyBriefing = async () => {
    try {
      await navigator.clipboard.writeText(buildActionDayBriefingText(briefing));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  return (
    <div data-testid="action-day-view" className="space-y-4">
      <CmmCard tone="emerald" variant="glass" size="lg">
        <div className="space-y-4">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Jour J</p><h2 className="mt-1 text-2xl font-black text-emerald-950">{action.title}</h2><p className="mt-1 cmm-text-caption text-emerald-700">Briefing opérationnel · {briefing.access === "organizer" ? "organisateur" : "bénévole inscrit"}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700"><CalendarDays size={14} />Date</p><p className="mt-1 text-sm font-semibold text-emerald-950">{action.actionDate}</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700"><Clock3 size={14} />Créneau</p><p className="mt-1 text-sm font-semibold text-emerald-950">{[action.meetingTime ?? action.eventStartTime, action.eventEndTime].filter(Boolean).join(" – ") || "À confirmer"}</p></div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700"><MapPin size={14} />Rendez-vous</p><p className="mt-1 text-sm font-semibold leading-6 text-emerald-950">{action.meetingPoint}</p>{action.locationLabel !== action.meetingPoint ? <p className="mt-1 cmm-text-caption text-emerald-700">Secteur : {action.locationLabel}</p> : null}{href ? <a className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 underline" href={href} target="_blank" rel="noreferrer"><Navigation size={14} />Ouvrir la carte</a> : <p className="mt-2 cmm-text-caption text-emerald-700">Coordonnées non disponibles : l’adresse enregistrée est conservée sans géolocalisation inventée.</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-600"><Navigation size={14} />Parcours retenu</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatRoute(action)}</p>{action.route.departureLabel || action.route.arrivalLabel ? <p className="mt-1 text-sm text-slate-600">{[action.route.departureLabel, action.route.arrivalLabel].filter(Boolean).join(" → ")}</p> : null}{action.route.hasSelectedOperationalRoute ? <p className="mt-2 text-xs font-semibold text-emerald-700">Itinéraire validé par le planificateur</p> : null}</div>
          <div className="flex flex-wrap gap-2 border-t border-emerald-100 pt-4 print:hidden"><CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => void copyBriefing()}><Copy size={14} />{copyState === "copied" ? "Briefing copié" : "Copier le briefing"}</CmmButton><CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={() => window.print()}><Printer size={14} />Imprimer</CmmButton>{calendarHref ? <CmmButton tone="tertiary" variant="pill" size="sm" asChild><a href={calendarHref} download={`cleanmymap-${briefing.actionId}.ics`}><CalendarDays size={14} />Ajouter à mon calendrier</a></CmmButton> : null}{copyState === "error" ? <span role="status" className="self-center text-xs font-semibold text-amber-800">Copie indisponible sur cet appareil.</span> : null}</div>
        </div>
      </CmmCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <CmmCard tone="emerald" variant="outlined" size="md"><div className="space-y-3"><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><ShieldCheck size={18} />Consignes</h3>{action.safetyInstructions ? <p className="whitespace-pre-line cmm-text-body cmm-text-primary">{action.safetyInstructions}</p> : <p className="cmm-text-body cmm-text-primary">Aucune consigne particulière renseignée.</p>}{action.participantMessage ? <p className="rounded-xl bg-emerald-50 px-3 py-2 cmm-text-body cmm-text-primary">{action.participantMessage}</p> : null}{action.accessibilityStatus !== "not_evaluated" || action.accessibility ? <p className="cmm-text-caption text-emerald-700">Accessibilité : {action.accessibility || action.accessibilityStatus}</p> : null}</div></CmmCard>
        <CmmCard tone="emerald" variant="outlined" size="md"><div className="space-y-3"><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><Package size={18} />Matériel</h3>{action.recommendedMaterials ? <p className="cmm-text-body cmm-text-primary"><strong>À prévoir :</strong> {action.recommendedMaterials}</p> : null}{action.materialsProvided ? <p className="cmm-text-body cmm-text-primary"><strong>Fourni :</strong> {action.materialsProvided}</p> : null}{!action.recommendedMaterials && !action.materialsProvided ? <p className="cmm-text-body cmm-text-primary">Aucun matériel complémentaire renseigné.</p> : null}</div></CmmCard>
      </div>
      <CmmCard tone="emerald" variant="muted" size="md"><div className="space-y-3"><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><CheckCircle2 size={18} />Checklist de départ</h3><ul className="grid gap-2 sm:grid-cols-2">{action.checklist.length > 0 ? action.checklist.map((item) => <li key={item.key} className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 cmm-text-body cmm-text-primary"><CheckCircle2 size={15} className={item.checked ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-slate-300"} aria-hidden="true" /><span>{item.label}</span></li>) : <li className="cmm-text-body cmm-text-primary">Checklist non renseignée.</li>}</ul><p className="flex items-center gap-2 cmm-text-caption text-emerald-700"><Users size={14} />La checklist ne vaut pas pointage : aucune présence ni réclamation n’est créée ici.</p></div></CmmCard>
    </div>
  );
}
