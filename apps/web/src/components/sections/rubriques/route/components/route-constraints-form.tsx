import { RouteOptions } from "../route-types";

function buildInputClass() {
  return "min-h-[44px] rounded-2xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/45";
}

interface RouteOptionsFormProps {
  options: RouteOptions;
  setOptions: React.Dispatch<React.SetStateAction<RouteOptions>>;
  fr: boolean;
}

export function RouteOptionsForm({
  options,
  setOptions,
  fr,
}: RouteOptionsFormProps) {
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
          {fr ? "Pondération priorité / déplacement" : "Priority / travel weighting"}
          <input
            type="range"
            min={0}
            max={100}
            value={options.priorityVsTravel}
            onChange={(event) =>
              setOptions((prev) => ({
                ...prev,
                priorityVsTravel: Number(event.target.value || 65),
              }))
            }
            className="mt-1 accent-emerald-300"
          />
          <span className="text-xs font-medium text-emerald-100/64">
            {fr
              ? `${options.priorityVsTravel}% priorité / ${100 - options.priorityVsTravel}% déplacement`
              : `${options.priorityVsTravel}% priority / ${100 - options.priorityVsTravel}% travel`}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Budget de déplacement (minutes)" : "Travel budget (minutes)"}
          <input
            type="number"
            min={1}
            max={600}
            step={1}
            value={options.travelBudgetMinutes}
            onChange={(event) =>
              setOptions((prev) => ({
                ...prev,
                travelBudgetMinutes: Number(event.target.value || 60),
              }))
            }
            className={buildInputClass()}
          />
          <span className="text-xs font-medium text-emerald-100/64">
            {fr ? "Temps maximal de déplacement" : "Maximum travel time"}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50/86">
          {fr ? "Arrêts maximum" : "Max stops"}
          <input
            type="number"
            min={1}
            max={12}
            value={options.maxStops}
            onChange={(event) =>
              setOptions((prev) => ({
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
