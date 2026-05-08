import { RouteResponse } from "../route-types";

interface RouteAssistantProps {
  data: RouteResponse | undefined;
  hasData: boolean;
  fr: boolean;
}

export function RouteAssistant({ data, hasData, fr }: RouteAssistantProps) {
  if (!hasData || !data) return null;

  return (
    <>
      <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(14,56,40,0.9)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
          {fr ? "Assistant proactif" : "Proactive assistant"}
        </p>
        <div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-white">{data.proactiveAssistant.actNow}</p>
          <p className="text-sm leading-relaxed text-white/76">
            {data.proactiveAssistant.criticalNearby}
          </p>
          <p className="text-sm leading-relaxed text-white/76">
            {data.proactiveAssistant.mostUsefulAction}
          </p>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {data.proactiveAssistant.predictedDirtyZones.length > 0 ? (
            <div className="rounded-2xl border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100/64">
                {fr ? "Zones à surveiller" : "Zones to watch"}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-white/74">
                {data.proactiveAssistant.predictedDirtyZones.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.proactiveAssistant.eventAnticipation.length > 0 ? (
            <div className="rounded-2xl border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100/64">
                {fr ? "Événements à anticiper" : "Events to anticipate"}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-white/74">
                {data.proactiveAssistant.eventAnticipation.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {data.proactiveAssistant.hotspots.length > 0 ? (
        <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(13,46,34,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
            {fr ? "Hotspots détectés" : "Detected hotspots"}
          </p>
          <ul className="mt-4 space-y-2">
            {data.proactiveAssistant.hotspots.slice(0, 3).map((hotspot) => (
              <li
                key={`${hotspot.zoneLabel}-${hotspot.predictedDirtScore}`}
                className="rounded-2xl border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-white">
                    {hotspot.zoneLabel} - {fr ? "urgence" : "priority"}{" "}
                    {hotspot.predictedDirtScore.toFixed(1)}/10
                  </p>
                  {hotspot.distanceKm !== null ? (
                    <p className="text-xs font-semibold text-emerald-100/66">
                      {hotspot.distanceKm} km
                    </p>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/72">
                  {fr
                    ? `Actions récentes: ${hotspot.recentActions} | Spots: ${hotspot.recentSpots} | Pression événement: ${hotspot.eventPressure.toFixed(1)}`
                    : `Recent actions: ${hotspot.recentActions} | Spots: ${hotspot.recentSpots} | Event pressure: ${hotspot.eventPressure.toFixed(1)}`}
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-50/78">
                  {hotspot.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
