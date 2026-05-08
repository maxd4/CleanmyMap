import { RouteConstraints } from "../route-types";

function buildInputClass() {
  return "min-h-[44px] rounded-2xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/45";
}

interface RouteConstraintsFormProps {
  constraints: RouteConstraints;
  setConstraints: React.Dispatch<React.SetStateAction<RouteConstraints>>;
  fr: boolean;
}

export function RouteConstraintsForm({ constraints, setConstraints, fr }: RouteConstraintsFormProps) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(13,46,34,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
            {fr ? "Paramètres du circuit" : "Route settings"}
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-white">
            {fr ? "Ajuster la sortie" : "Tune the sortie"}
          </h3>
        </div>
        <p className="rounded-full border border-emerald-200/14 bg-[rgba(17,56,41,0.76)] px-3 py-1.5 text-xs font-semibold text-emerald-50/92">
          {fr ? "Mobile-first" : "Mobile-first"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Temps dispo (min)" : "Time available (min)"}
          <input
            type="number"
            min={30}
            max={600}
            value={constraints.availableMinutes}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                availableMinutes: Number(event.target.value || 180),
              }))
            }
            className={buildInputClass()}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Bénévoles" : "Volunteers"}
          <input
            type="number"
            min={1}
            max={200}
            value={constraints.volunteers}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                volunteers: Number(event.target.value || 4),
              }))
            }
            className={buildInputClass()}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Accessibilité" : "Accessibility"}
          <select
            value={constraints.accessibility}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                accessibility: event.target.value as RouteConstraints["accessibility"],
              }))
            }
            className={buildInputClass()}
          >
            <option value="standard">{fr ? "Standard" : "Standard"}</option>
            <option value="accessible">{fr ? "Accessible" : "Accessible"}</option>
            <option value="strict">{fr ? "Strict" : "Strict"}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Sécurité" : "Safety"}
          <select
            value={constraints.security}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                security: event.target.value as RouteConstraints["security"],
              }))
            }
            className={buildInputClass()}
          >
            <option value="standard">{fr ? "Standard" : "Standard"}</option>
            <option value="renforced">{fr ? "Renforcée" : "Reinforced"}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Météo" : "Weather"}
          <select
            value={constraints.weather}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                weather: event.target.value as RouteConstraints["weather"],
              }))
            }
            className={buildInputClass()}
          >
            <option value="ok">{fr ? "Temps stable" : "Stable weather"}</option>
            <option value="rain">{fr ? "Pluie modérée" : "Moderate rain"}</option>
            <option value="wind">{fr ? "Vent fort" : "Strong wind"}</option>
            <option value="heat">{fr ? "Forte chaleur" : "High heat"}</option>
            <option value="cold">{fr ? "Froid marqué" : "Cold snap"}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Arbitrage impact / distance" : "Impact / distance trade-off"}
          <input
            type="range"
            min={0}
            max={100}
            value={constraints.impactVsDistance}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                impactVsDistance: Number(event.target.value || 65),
              }))
            }
            className="mt-1 accent-emerald-300"
          />
          <span className="text-xs font-medium text-emerald-100/64">
            {fr
              ? `${constraints.impactVsDistance}% impact privilégié / ${100 - constraints.impactVsDistance}% distance privilégiée`
              : `${constraints.impactVsDistance}% impact weighted / ${100 - constraints.impactVsDistance}% distance weighted`}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Arrêts maximum" : "Max stops"}
          <input
            type="number"
            min={2}
            max={12}
            value={constraints.maxStops}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                maxStops: Number(event.target.value || 6),
              }))
            }
            className={buildInputClass()}
          />
        </label>
      </div>
    </section>
  );
}
