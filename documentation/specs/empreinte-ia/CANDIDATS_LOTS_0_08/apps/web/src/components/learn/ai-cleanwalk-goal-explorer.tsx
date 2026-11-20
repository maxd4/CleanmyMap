"use client";

import { useMemo, useState } from "react";
import { solveAiCleanwalkGoals, type AiCollectionGoalInput, type AiWaterGoalMode } from "@/lib/environmental-impact-estimator/ai-cleanwalk-goal-solver";

type Props = {
  /** Targets, inputs and material provenance are owned by the estimator and its scenario UI. */
  scenario: Omit<AiCollectionGoalInput,"preferredPercent" | "waterMode" | "maxPersonHours">;
  initialWaterMode?: AiWaterGoalMode;
  locale?: "fr" | "en";
};
const LABELS = {
  fr: {
    title:"Explorer des objectifs de collecte (simulation)", subtitle:"Deux seuils pédagogiques indépendants, aucune compensation carbone ou hydrique réelle.",
    p:"Part d'effort consacrée aux mégots",budget:"Plafond volontaire (heures-personne)",water:"Comparaison hydrique",
    risk:"Analogie de risque : 500 L potentiellement pollués / mégot",acv:"Eau consommée nette : ACV comparable uniquement",
    hours:"Effort théorique",waste:"Déchets hors mégots",butts:"Mégots entiers",status:"Statut du scénario",
    carbon:"Comparaison carbone de recyclage",riskLiters:"Volume conventionnel de pollution potentielle",acvWater:"Eau consommée nette selon ACV",
    none:"Pas de plafond",unknown:"Non quantifiable",notSaved:"Les objectifs et choix ne sont pas enregistrés.",
    bad:"Cette position ne peut pas être adoptée avec ces hypothèses. Modifiez les facteurs, le recyclage ou le budget.",
  },
  en: {
    title:"Explore cleanup goals (scenario)", subtitle:"Two independent educational thresholds. No physical carbon or water offset.",
    p:"Effort allocated to cigarette butts",budget:"Optional effort cap (person-hours)",water:"Water comparison",
    risk:"Risk analogy: 500 L potentially contaminated per butt",acv:"Net water consumption: comparable LCA only",
    hours:"Theoretical effort",waste:"Waste excluding butts",butts:"Whole cigarette butts",status:"Scenario status",
    carbon:"Recycling carbon comparison",riskLiters:"Conventional potentially contaminated water",acvWater:"Net LCA water consumption avoided",
    none:"No cap",unknown:"Not quantifiable",notSaved:"Choices are not saved.",
    bad:"This position is unavailable under the stated assumptions. Change factors, recycling or effort cap.",
  },
} as const;
export function AiCleanwalkGoalExplorer({scenario,initialWaterMode="RISQUE_CONVENTIONNEL",locale="fr"}:Props) {
  const [percent,setPercent]=useState(50);
  const [waterMode,setWaterMode]=useState<AiWaterGoalMode>(initialWaterMode);
  const [capText,setCapText]=useState("");
  const capValid=capText==="" || (/^\d+(?:[.,]\d+)?$/.test(capText)&&Number.isFinite(Number(capText.replace(",","."))));
  const cap=capText===""?null:capValid?Number(capText.replace(",",".")):null;
  const outcome=useMemo(()=>capValid?solveAiCleanwalkGoals({...scenario,preferredPercent:percent,waterMode,maxPersonHours:cap}):null,[scenario,percent,waterMode,capValid,cap]);
  const selected=outcome?.selected;
  const label=LABELS[locale];
  const fmt=(n:number|null,dec=3)=>n===null?label.unknown:new Intl.NumberFormat(locale==="fr"?"fr-FR":"en-US",{maximumFractionDigits:dec}).format(n);
  return <section aria-labelledby="ai-cleanwalk-goal-heading" className="rounded-2xl border border-amber-400/30 bg-amber-50/5 p-4 sm:p-6">
    <h2 id="ai-cleanwalk-goal-heading" className="text-lg font-bold">{label.title}</h2>
    <p className="mt-1 text-sm opacity-80">{label.subtitle}</p>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <label className="grid gap-2 text-sm font-semibold" htmlFor="ai-goal-water-mode">{label.water}
        <select id="ai-goal-water-mode" value={waterMode} onChange={(e:{target:{value:string}})=>setWaterMode(e.target.value as AiWaterGoalMode)} className="w-full rounded-lg border p-2 text-black">
          <option value="RISQUE_CONVENTIONNEL">{label.risk}</option>
          <option value="EAU_CONSOMMEE_ACV">{label.acv}</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold" htmlFor="ai-goal-effort-cap">{label.budget}
        <input id="ai-goal-effort-cap" value={capText} onChange={(e:{target:{value:string}})=>setCapText(e.target.value)} inputMode="decimal" placeholder={label.none} aria-invalid={!capValid} className="w-full rounded-lg border p-2 text-black" />
      </label>
      <label className="grid gap-2 text-sm font-semibold" htmlFor="ai-goal-effort-range">{label.p}: {percent} %
        <input id="ai-goal-effort-range" type="range" min={0} max={100} step={1} value={percent} onChange={(e:{target:{value:string}})=>setPercent(Number(e.target.value))} aria-describedby="ai-goal-status ai-goal-disclaimer" className="w-full accent-amber-600" />
      </label>
    </div>
    <p id="ai-goal-status" role="status" aria-live="polite" className="mt-4 text-sm font-semibold">
      {label.status}: {selected?.status ?? "UNKNOWN"}. {selected?.reasons.join(". ") || ""}
    </p>
    {selected && selected.status!=="FEASIBLE_SCENARIO" ? <p className="mt-2 text-sm">{label.bad}</p> : null}
    <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
      {([
        [label.hours,fmt(selected?.requiredPersonHours??null,5)],
        [label.waste,`${fmt(selected?.wasteKg??null,5)} kg`],
        [label.butts,fmt(selected?.buttsCount??null,0)],
        [label.carbon,`${fmt(selected?.carbonRecyclingScenarioKgCo2e??null,6)} kgCO₂e`],
        [label.riskLiters,`${fmt(selected?.waterConventionalRiskLiters??null,0)} L conventionnels`],
        [label.acvWater,`${fmt(selected?.netAcvWaterConsumedSavedLiters??null,6)} L ACV`],
      ] as const).map(([name,value])=><div key={name} className="rounded-lg border border-amber-500/20 p-3"><dt className="text-xs opacity-70">{name}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
    </dl>
    <p id="ai-goal-disclaimer" className="mt-4 text-xs opacity-75">{label.notSaved} {outcome?.caveats.join(" ")}</p>
  </section>;
}
