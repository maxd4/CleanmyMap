"use client";

import { PackageCheck } from "lucide-react";
import type { PublicActionPracticalInformation } from "@/lib/actions/participation/group-participation";
import {
  actionChecklistProvenanceLabel,
  deriveActionVolunteerChecklist,
} from "@/lib/actions/action-preparation-checklist";
import { useActionPreparationWeather } from "@/components/actions/use-action-preparation-weather";
import {
  CataloguePracticalInformation,
  OrganizerPracticalInformation,
} from "./rejoindre-un-formulaire-section.practical-info-panels";

export function ActionPracticalInformation({
  info,
  fr,
}: {
  info: PublicActionPracticalInformation;
  fr: boolean;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4" aria-label={fr ? "Informations pratiques" : "Practical information"}>
      <div className="mb-3 flex items-center gap-2">
        <PackageCheck size={17} className="text-emerald-700" aria-hidden="true" />
        <h4 className="text-sm font-black text-emerald-950">{fr ? "Informations pratiques" : "Practical information"}</h4>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <OrganizerPracticalInformation info={info} fr={fr} />
        <CataloguePracticalInformation info={info} fr={fr} />
      </div>
      {info.volunteerChecklist ? <VolunteerChecklist info={info} fr={fr} /> : null}
    </section>
  );
}

function VolunteerChecklist({ info, fr }: { info: PublicActionPracticalInformation; fr: boolean }) {
  const baseChecklist = info.volunteerChecklist;
  const weather = useActionPreparationWeather({
    contextId: null,
    request: baseChecklist?.weatherRequest ?? null,
  });
  const weatherChecklist = deriveActionVolunteerChecklist({
    preparation: null,
    weatherContext: weather.weatherContext,
    weatherRequest: weather.weatherRequest,
    weatherState: weather.weatherState,
  });
  const checklist = baseChecklist
    ? {
        ...baseChecklist,
        weatherRecommendations: weatherChecklist.weatherRecommendations,
        weatherState: weatherChecklist.weatherState,
        weatherStatus: weatherChecklist.weatherStatus,
        weatherMessage: weatherChecklist.weatherMessage,
        weatherForecast: weatherChecklist.weatherForecast,
      }
    : null;
  if (!checklist) return null;
  const list = (values: typeof checklist.toBring, empty: string) => values.length > 0
    ? <ul className="space-y-2 text-sm leading-relaxed text-emerald-950">{values.map((value) => <li key={value.key}><span className="font-semibold">{value.label}</span>{value.detail ? <span className="block text-xs text-emerald-800">{value.detail}</span> : null}<span className="block text-xs text-emerald-700">Source : {value.provenance.map(actionChecklistProvenanceLabel).join(", ")}</span></li>)}</ul>
    : <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-4" data-testid="volunteer-checklist">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-sky-700">Checklist bénévole</p><p className="mt-1 text-xs text-sky-900">{checklist.staffing.label}. Ces indications sont des recommandations, pas une certification de sécurité.</p></div>{checklist.weatherMessage ? <span className="text-xs font-semibold text-sky-800">{checklist.weatherMessage}</span> : null}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <div><h5 className="mb-2 text-sm font-bold text-sky-950">{fr ? "À apporter" : "To bring"}</h5>{list(checklist.toBring, "Aucun complément calculé.")}</div>
        <div>
          <h5 className="mb-2 text-sm font-bold text-sky-950">{fr ? "Recommandé selon la météo" : "Recommended for the weather"}</h5>
          {checklist.weatherState === "success"
            ? <>{list(checklist.weatherRecommendations, "Aucune recommandation météo particulière.")}<WeatherForecastMeta checklist={checklist} /></>
            : <div className="space-y-2"><p className="text-sm text-slate-500">{checklist.weatherState === "idle" ? "Les recommandations météo sont calculées uniquement sur demande." : checklist.weatherMessage}</p><button type="button" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void weather.requestWeather()} disabled={checklist.weatherState === "loading"} aria-busy={checklist.weatherState === "loading"}>Voir les recommandations selon la météo</button></div>}
        </div>
        <div><h5 className="mb-2 text-sm font-bold text-sky-950">{fr ? "Fourni par l’organisateur" : "Provided by the organizer"}</h5>{list(checklist.provided, "Aucun équipement déclaré.")}</div>
      </div>
    </div>
  );
}

function WeatherForecastMeta({ checklist }: { checklist: NonNullable<PublicActionPracticalInformation["volunteerChecklist"]> }) {
  if (!checklist.weatherForecast) return null;
  return <p className="mt-2 text-xs text-sky-800">Créneau : {checklist.weatherForecast.coveredWindow.startAt.replace("T", " ")} – {checklist.weatherForecast.coveredWindow.endAt.slice(11)} · Prévision récupérée le {new Date(checklist.weatherForecast.fetchedAt).toLocaleString("fr-FR")}</p>;
}
