import { RouteResponse } from "../route-types";
import { CmmCard } from "@/components/ui/cmm-card";

interface RouteAssistantProps {
  data: RouteResponse | undefined;
  hasData: boolean;
  fr: boolean;
}

export function RouteAssistant({ data, hasData, fr }: RouteAssistantProps) {
  if (!hasData || !data) return null;

  return (
    <>
      <CmmCard as="section" tone="emerald" variant="muted" size="sm">
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-800">
          {fr ? "À retenir" : "Key takeaways"}
        </p>
        <div className="mt-2 space-y-2">
          <p className="text-sm font-semibold text-emerald-950">{data.proactiveAssistant.actNow}</p>
          <p className="text-sm leading-relaxed text-emerald-950">
            {data.proactiveAssistant.criticalNearby}
          </p>
          <p className="text-sm leading-relaxed text-emerald-950">
            {data.proactiveAssistant.mostUsefulAction}
          </p>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {data.proactiveAssistant.operationalSignalZones.length > 0 ? (
            <div className="rounded-xl border border-emerald-200/70 bg-white/70 p-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-800">
                {fr ? "Signaux opérationnels" : "Operational signals"}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-emerald-950">
                {data.proactiveAssistant.operationalSignalZones.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.proactiveAssistant.upcomingEvents.length > 0 ? (
            <div className="rounded-xl border border-emerald-200/70 bg-white/70 p-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-800">
                {fr ? "Événements à venir" : "Upcoming events"}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed text-emerald-950">
                {data.proactiveAssistant.upcomingEvents.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CmmCard>

      {data.proactiveAssistant.hotspots.length > 0 ? (
        <CmmCard as="section" tone="emerald" variant="muted" size="sm">
          <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-800">
            {fr ? "Hotspots détectés" : "Detected hotspots"}
          </p>
          <ul className="mt-4 space-y-2">
            {data.proactiveAssistant.hotspots.slice(0, 3).map((hotspot) => (
              <li
                key={`${hotspot.zoneLabel}-${hotspot.operationalSignalScore}`}
                className="rounded-xl border border-emerald-200/70 bg-white/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-emerald-950">
                    {hotspot.zoneLabel} - signal{" "}
                    {hotspot.operationalSignalScore.toFixed(1)}/10
                  </p>
                  {hotspot.distanceKm !== null ? (
                    <p className="text-xs font-semibold text-emerald-800">
                      {hotspot.distanceKm} km
                    </p>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-950">
                  {fr
                    ? `Actions récentes: ${hotspot.recentActions} | Spots: ${hotspot.recentSpots} | Pression événement: ${hotspot.eventPressure.toFixed(1)}`
                    : `Recent actions: ${hotspot.recentActions} | Spots: ${hotspot.recentSpots} | Event pressure: ${hotspot.eventPressure.toFixed(1)}`}
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-900/80">
                  {hotspot.reason}
                </p>
              </li>
            ))}
          </ul>
        </CmmCard>
      ) : null}
    </>
  );
}
