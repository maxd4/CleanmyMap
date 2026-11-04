import {
  normalizeGroupCountForOrganization,
  type RoutePickupPreference,
  type RouteOptions,
} from "../route-types";
import { CmmCard } from "@/components/ui/cmm-card";

function buildInputClass() {
    return "min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
}

interface RouteOptionsFormProps {
  options: RouteOptions;
  setOptions: React.Dispatch<React.SetStateAction<RouteOptions>>;
  fr: boolean;
  guided?: boolean;
}

export function RouteOptionsForm({
  options,
  setOptions,
  fr,
  guided = false,
}: RouteOptionsFormProps) {
  return (
    <CmmCard as="section" tone="emerald" variant="outlined" size="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-800">
            {fr ? "Paramètres du circuit" : "Route settings"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <fieldset
          className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 sm:col-span-2"
          aria-label={fr ? "Type d'itinéraire" : "Route type"}
        >
          <legend className="px-1 text-sm font-bold text-emerald-950">
            {fr ? "Type d’itinéraire" : "Route type"}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
            {([
              ["loop", fr ? "Boucle" : "Loop", fr ? "Départ et arrivée identiques." : "Start and finish at the same point."],
              ["open", fr ? "Départ / arrivée" : "Start / finish", fr ? "Départ fixé par la localisation ; arrivée fournie ou déterminée par le planner." : "Location fixes the start; finish is provided or determined by the planner."],
            ] as const).map(([value, label, help]) => (
              <label key={value} className="flex min-h-14 cursor-pointer flex-col gap-1 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-100">
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="route-topology"
                    value={value}
                    checked={(options.routeTopology ?? "loop") === value}
                    onChange={() => setOptions((prev) => ({ ...prev, routeTopology: value }))}
                    className="accent-emerald-300"
                  />
                  {label}
                </span>
                <span className="pl-7 text-xs font-medium text-emerald-900/70">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
          {fr ? "Nombre de bénévoles" : "Volunteers"}
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={options.volunteers}
            readOnly={guided}
            aria-readonly={guided}
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
          {guided ? <span className="text-xs font-medium text-emerald-900/70">{fr ? "Effectif piloté par les groupes guidés." : "Staffing is controlled by the guided groups."}</span> : null}
        </label>

        {!guided ? <fieldset
          className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 sm:col-span-2"
          aria-label={fr ? "Organisation du groupe" : "Group organization"}
        >
          <legend className="px-1 text-sm font-bold text-emerald-950">
            {fr ? "Organisation du groupe" : "Group organization"}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-100">
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
            <label className={`flex min-h-12 items-center gap-3 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-100 ${options.volunteers < 2 ? "cursor-not-allowed opacity-50" : ""}`}>
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
          <p className="mt-2 text-xs font-medium text-emerald-900/70">
            {options.groupCount > 1
              ? fr
                ? `${options.volunteers} bénévoles → ${options.groupCount} groupes → environ ${Math.ceil(options.volunteers / options.groupCount)} personne(s) par groupe`
                : `${options.volunteers} volunteers → ${options.groupCount} groups → about ${Math.ceil(options.volunteers / options.groupCount)} per group`
              : fr
                ? "Une seule boucle pour le groupe entier."
                : "One loop for the whole group."}
          </p>
          {options.groupCount > 1 ? (
            <label className="mt-3 flex max-w-sm flex-col gap-1.5 text-sm font-semibold text-emerald-950">
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
              <span className="text-xs font-medium text-emerald-900/70">
                {fr
                  ? `Maximum : ${Math.min(12, options.volunteers)} groupes`
                  : `Maximum: ${Math.min(12, options.volunteers)} groups`}
              </span>
            </label>
          ) : null}
        </fieldset> : null}

        <fieldset
          className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 sm:col-span-2"
          aria-label={fr ? "Préférence de collecte" : "Pickup preference"}
        >
          <legend className="px-1 text-sm font-bold text-emerald-950">
            {fr
              ? "Que souhaitez-vous principalement ramasser ?"
              : "What would you mainly like to collect?"}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup">
            {(
              [
                [
                  "balanced",
                  "Mixte",
                  "Le circuit équilibre les risques déchets et mégots à l’échelle des segments retenus.",
                  "Mixed",
                  "The circuit balances waste and cigarette-butt risks across selected segments.",
                ],
                [
                  "waste",
                  "Majorité déchets",
                  "Le calcul privilégie le risque déchets des zones prédites.",
                  "Waste",
                  "The calculation prioritizes waste risk in predicted zones.",
                ],
                [
                  "cigarette_butts",
                  "Majorité mégots",
                  "Le calcul privilégie le risque mégots des zones prédites.",
                  "Cigarette butts",
                  "The calculation prioritizes cigarette-butt risk in predicted zones.",
                ],
              ] as const
            ).map(([value, label, help, englishLabel, englishHelp]) => {
              const preference = value as RoutePickupPreference;
              return (
                <label
                  key={value}
                  className="flex min-h-20 cursor-pointer flex-col gap-1.5 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-100"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="route-pickup-preference"
                      value={value}
                      checked={options.pickupPreference === preference}
                      onChange={() =>
                        setOptions((prev) => ({
                          ...prev,
                          pickupPreference: preference,
                        }))
                      }
                      className="accent-emerald-300"
                    />
                    {fr ? label : englishLabel}
                  </span>
                  <span className="pl-7 cmm-text-small font-medium leading-relaxed text-emerald-900/70">
                    {fr ? help : englishHelp}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
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
          <span className="text-xs font-medium text-emerald-900/70">
            {fr
              ? `${options.priorityVsTravel}% priorité / ${100 - options.priorityVsTravel}% déplacement`
              : `${options.priorityVsTravel}% priority / ${100 - options.priorityVsTravel}% travel`}
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
          {fr ? "Créneau total de l’événement (minutes)" : "Total event slot (minutes)"}
          <input
            type="number"
            min={1}
            max={600}
            step={1}
            value={options.travelBudgetMinutes}
            readOnly={guided}
            aria-readonly={guided}
            onChange={(event) =>
              setOptions((prev) => ({
                ...prev,
                travelBudgetMinutes: Number(event.target.value || 60),
              }))
            }
            className={buildInputClass()}
          />
          <span className="text-xs font-medium text-emerald-900/70">
            {guided
              ? (fr ? "Créneau piloté par le budget guidé ci-dessus." : "Slot is controlled by the guided budget above.")
              : (fr ? "Durée d’action + 15 min de marge organisationnelle" : "Action duration + 15 min organization margin")}
          </span>
        </label>

        <fieldset className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-bold text-emerald-950">
            {fr ? "Créneau météo prévu (facultatif)" : "Planned weather window (optional)"}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
              {fr ? "Début" : "Start"}
              <input
                type="datetime-local"
                value={options.scheduledStartAt ?? ""}
                onChange={(event) =>
                  setOptions((prev) => ({ ...prev, scheduledStartAt: event.target.value }))
                }
                className={buildInputClass()}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
              {fr ? "Fin" : "End"}
              <input
                type="datetime-local"
                value={options.scheduledEndAt ?? ""}
                onChange={(event) =>
                  setOptions((prev) => ({ ...prev, scheduledEndAt: event.target.value }))
                }
                className={buildInputClass()}
              />
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-emerald-950">
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
    </CmmCard>
  );
}
