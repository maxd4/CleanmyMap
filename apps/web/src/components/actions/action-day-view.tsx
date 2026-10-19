"use client";

import { CalendarDays, Clock3, Copy, MapPin, Navigation, Package, Printer, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { fetchActionDayBriefing, type ActionDayBriefing } from "@/lib/actions/day-briefing-http";
import { buildActionDayBriefingText } from "./action-day-briefing";
import { buildActionIcsHref } from "@/components/sections/rubriques/community/ics";
import { CmmButton } from "@/components/ui/cmm-button";
import { actionChecklistProvenanceLabel } from "@/lib/actions/action-preparation-checklist";
import { deriveActionVolunteerChecklist } from "@/lib/actions/action-preparation-checklist";
import { useActionPreparationWeather } from "./use-action-preparation-weather";
import { ActionFieldRolesPanel } from "./action-field-roles-panel";

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
  const weather = useActionPreparationWeather({
    contextId: actionId,
    request: actionBriefing?.action.volunteerChecklist?.weatherRequest ?? null,
  });
  const weatherChecklist = deriveActionVolunteerChecklist({
    preparation: null,
    weatherContext: weather.weatherContext,
    weatherRequest: weather.weatherRequest,
    weatherState: weather.weatherState,
  });
  if (actionError) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">{actionError}</div>;
  if (!actionBriefing) return <div role="status" className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-sm font-semibold text-emerald-900">Chargement du briefing…</div>;

  const briefing = actionBriefing;
  const action = briefing.action;
  const href = mapHref(action.map);
  const calendarHref = buildActionIcsHref({ id: briefing.actionId, title: action.title, actionDate: action.actionDate, startTime: action.eventStartTime ?? action.meetingTime, endTime: action.eventEndTime, location: action.meetingPoint, description: action.participantMessage ?? action.safetyInstructions });
  const checklist = action.volunteerChecklist
    ? {
        ...action.volunteerChecklist,
        weatherRecommendations: weatherChecklist.weatherRecommendations,
        weatherState: weatherChecklist.weatherState,
        weatherStatus: weatherChecklist.weatherStatus,
        weatherMessage: weatherChecklist.weatherMessage,
        weatherForecast: weatherChecklist.weatherForecast,
      }
    : null;
  const copyBriefing = async () => {
    try {
      await navigator.clipboard.writeText(buildActionDayBriefingText({
        ...briefing,
        action: { ...briefing.action, volunteerChecklist: checklist ?? undefined },
      }));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  const checklistGroup = (values: NonNullable<typeof checklist>["toBring"], empty: string) => values.length > 0
    ? <ul className="space-y-2 text-sm text-emerald-950">{values.map((item) => <li key={item.key}><span className="font-semibold">{item.label}</span>{item.detail ? <span className="block text-xs text-emerald-800">{item.detail}</span> : null}<span className="block text-xs text-emerald-700">Source : {item.provenance.map(actionChecklistProvenanceLabel).join(", ")}</span></li>)}</ul>
    : <p className="text-sm text-slate-600">{empty}</p>;
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
      <ActionFieldRolesPanel actionId={actionId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CmmCard tone="emerald" variant="outlined" size="md"><div className="space-y-3"><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><ShieldCheck size={18} />Consignes</h3>{action.safetyInstructions ? <p className="whitespace-pre-line cmm-text-body cmm-text-primary">{action.safetyInstructions}</p> : <p className="cmm-text-body cmm-text-primary">Aucune consigne particulière renseignée.</p>}{action.participantMessage ? <p className="rounded-xl bg-emerald-50 px-3 py-2 cmm-text-body cmm-text-primary">{action.participantMessage}</p> : null}{action.accessibilityStatus !== "not_evaluated" || action.accessibility ? <p className="cmm-text-caption text-emerald-700">Accessibilité : {action.accessibility || action.accessibilityStatus}</p> : null}</div></CmmCard>
        <CmmCard tone="emerald" variant="outlined" size="md"><div className="space-y-3"><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><Package size={18} />Matériel et convivialité</h3>{action.recommendedMaterials ? <p className="cmm-text-body cmm-text-primary"><strong>À prévoir :</strong> {action.recommendedMaterials}</p> : null}{action.materialsProvided ? <p className="cmm-text-body cmm-text-primary"><strong>Fourni :</strong> {action.materialsProvided}</p> : null}{action.equipmentProvided.length > 0 ? <p className="cmm-text-body cmm-text-primary"><strong>Équipements déclarés :</strong> {action.equipmentProvided.join(" · ")}</p> : null}{action.equipmentNotProvided?.length ? <p className="cmm-text-body cmm-text-primary"><strong>Équipements non fournis :</strong> {action.equipmentNotProvided.join(" · ")}</p> : null}{action.refreshmentsProvided.length > 0 ? <p className="cmm-text-body cmm-text-primary"><strong>Convivialité :</strong> {action.refreshmentsProvided.join(" · ")}</p> : null}{!action.recommendedMaterials && !action.materialsProvided && action.equipmentProvided.length === 0 && !action.equipmentNotProvided?.length && action.refreshmentsProvided.length === 0 ? <p className="cmm-text-body cmm-text-primary">Aucun matériel complémentaire renseigné.</p> : null}</div></CmmCard>
      </div>
      {checklist ? (
        <CmmCard tone="sky" variant="outlined" size="md" data-testid="action-day-volunteer-checklist">
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-sky-950">Checklist bénévole</h3>
                <p className="mt-1 text-sm text-sky-900">{checklist.staffing.label}. Les recommandations ne constituent pas une garantie de sécurité.</p>
              </div>
              {checklist.weatherMessage ? <p className="text-xs font-semibold text-sky-800">{checklist.weatherMessage}</p> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="mb-2 text-sm font-bold text-sky-950">À apporter</h4>
                {checklistGroup(checklist.toBring, "Aucun complément calculé.")}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-bold text-sky-950">Recommandé selon la météo</h4>
                {checklist.weatherState === "success" ? (
                  <>
                    {checklistGroup(checklist.weatherRecommendations, "Aucune recommandation météo particulière.")}
                    <WeatherForecastMeta checklist={checklist} />
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">{checklist.weatherState === "idle" ? "Les recommandations météo sont calculées uniquement sur demande." : checklist.weatherMessage}</p>
                    <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={() => void weather.requestWeather()} disabled={checklist.weatherState === "loading"} aria-busy={checklist.weatherState === "loading"}>
                      Voir les recommandations selon la météo
                    </CmmButton>
                  </div>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-bold text-sky-950">Fourni par l’organisateur</h4>
                {checklistGroup(checklist.provided, "Aucun équipement déclaré.")}
              </div>
            </div>
          </div>
        </CmmCard>
      ) : null}
    </div>
  );
}

function WeatherForecastMeta({ checklist }: { checklist: NonNullable<ActionDayBriefing["action"]["volunteerChecklist"]> }) {
  if (!checklist.weatherForecast) return null;
  return <p className="mt-2 text-xs text-sky-800">Créneau : {checklist.weatherForecast.coveredWindow.startAt.replace("T", " ")} – {checklist.weatherForecast.coveredWindow.endAt.slice(11)} · Prévision récupérée le {new Date(checklist.weatherForecast.fetchedAt).toLocaleString("fr-FR")}</p>;
}
