import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";

type RouteWeatherSummaryProps = {
  context: PlannerWeatherContext;
  fr: boolean;
};

function value(value: number | null, suffix: string, digits = 0): string {
  return value === null ? "—" : `${value.toFixed(digits)} ${suffix}`;
}

export function RouteWeatherSummary({ context, fr }: RouteWeatherSummaryProps) {
  const window = context.coveredWindow;
  const summary = context.summary;
  const unavailableReason = context.unavailableReason === "outside_forecast_horizon"
    ? fr ? "créneau hors horizon de prévision" : "window outside forecast horizon"
    : context.unavailableReason === "missing_window"
      ? fr ? "créneau non renseigné" : "window not provided"
      : fr ? "prévision indisponible" : "forecast unavailable";

  return (
    <section
      className="rounded-2xl border border-sky-300/20 bg-sky-500/10 px-5 py-4 text-sm text-sky-50"
      data-weather-status={context.weatherStatus}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-black">{fr ? "Météo du créneau prévu" : "Planned-window weather"}</h3>
        <span className="text-xs font-semibold text-sky-100/70">Open-Meteo · prévision</span>
      </div>
      {context.weatherStatus === "available" && summary && window ? (
        <>
          <p className="mt-2 text-xs font-semibold text-sky-100/80">
            {window.startAt.replace("T", " ")} → {window.endAt.replace("T", " ")} · heure de Paris
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <span>🌡 {value(summary.temperatureC, "°C")}</span>
            <span>🤍 {value(summary.apparentTemperatureC, "°C")}</span>
            <span>🌧 {value(summary.precipitationMm, "mm", 1)}</span>
            <span>☔ {value(summary.precipitationProbabilityPct, "%")}</span>
            <span>💨 {value(summary.windKmh, "km/h")}</span>
            <span>🌬 {value(summary.gustKmh, "km/h")}</span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs font-semibold text-sky-100/80">
          {fr ? `Contexte non utilisé : ${unavailableReason}. La recommandation reste disponible.` : `Context not used: ${unavailableReason}. The recommendation remains available.`}
        </p>
      )}
    </section>
  );
}
