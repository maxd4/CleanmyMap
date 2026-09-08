import {
  normalizeGroupCountForOrganization,
  type RouteOptions,
} from "../route-types";

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
          {fr ? "Nombre de bénévoles" : "Volunteers"}
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={options.volunteers}
            onChange={(event) =>
              setOptions((prev) => {
                const volunteers = Math.min(100, Math.max(1, Number(event.target.value || 1)));
                return {
                  ...prev,
                  volunteers,
                  groupCount: Math.min(prev.groupCount, volunteers),
                };
              })
            }
            className={buildInputClass()}
          />
        </label>

        <fieldset
          className="rounded-2xl border border-emerald-200/12 bg-[rgba(11,34,25,0.52)] p-4 md:col-span-2"
          aria-label={fr ? "Organisation du groupe" : "Group organization"}
        >
          <legend className="px-1 text-sm font-bold text-emerald-50/90">
            {fr ? "Organisation du groupe" : "Group organization"}
          </legend>
          <div className="mt-2 grid gap-3 md:grid-cols-2" role="radiogroup">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-400/10">
              <input
                type="radio"
                name="route-organization-mode"
                value="whole"
                checked={options.groupCount === 1}
                onChange={() =>
                  setOptions((prev) => ({ ...prev, groupCount: normalizeGroupCountForOrganization("whole", prev.volunteers, prev.groupCount) }))
                }
                className="accent-emerald-300"
              />
              {fr ? "Garder le groupe entier" : "Keep the whole group"}
            </label>
            <label className={`flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-400/10 ${options.volunteers < 2 ? "cursor-not-allowed opacity-50" : ""}`}>
              <input
                type="radio"
                name="route-organization-mode"
                value="split"
                checked={options.groupCount > 1}
                disabled={options.volunteers < 2}
                onChange={() =>
                  setOptions((prev) => ({ ...prev, groupCount: normalizeGroupCountForOrganization("split", prev.volunteers, prev.groupCount) }))
                }
                className="accent-emerald-300"
              />
              {fr ? "Diviser le groupe" : "Split the group"}
            </label>
          </div>
          <p className="mt-3 text-xs font-medium text-emerald-100/64">
            {options.groupCount > 1
              ? fr
                ? `${options.volunteers} bénévoles → ${options.groupCount} groupes → environ ${Math.ceil(options.volunteers / options.groupCount)} personne(s) par groupe`
                : `${options.volunteers} volunteers → ${options.groupCount} groups → about ${Math.ceil(options.volunteers / options.groupCount)} per group`
              : fr
                ? "Une seule boucle pour le groupe entier."
                : "One loop for the whole group."}
          </p>
          {options.groupCount > 1 ? (
            <label className="mt-4 flex max-w-sm flex-col gap-2 text-sm font-semibold text-emerald-50/86">
              {fr ? "Nombre de sous-groupes" : "Number of sub-groups"}
              <input
                type="number"
                min={2}
                max={Math.min(12, options.volunteers)}
                step={1}
                value={options.groupCount}
                onChange={(event) =>
                  setOptions((prev) => ({
                    ...prev,
                    groupCount: normalizeGroupCountForOrganization(
                      "split",
                      prev.volunteers,
                      Number(event.target.value || 2),
                    ),
                  }))
                }
                className={buildInputClass()}
              />
              <span className="text-xs font-medium text-emerald-100/64">
                {fr
                  ? `Maximum : ${Math.min(12, options.volunteers)} groupes`
                  : `Maximum: ${Math.min(12, options.volunteers)} groups`}
              </span>
            </label>
          ) : null}
        </fieldset>

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
