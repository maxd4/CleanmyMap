"use client";

import { useMemo, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { estimatePersonalAiFootprint } from "@/lib/environmental-impact-estimator/personal-ai-estimator";
import { solveAiCleanwalkGoals, type AiMaterialScenario, type AiWaterGoalMode } from "@/lib/environmental-impact-estimator/ai-cleanwalk-goal-solver";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";

type Props = { isFrench: boolean };
type RegionChoice = "FR_2025" | "US_PROXY" | "UNKNOWN";

export function AiFootprintMethodologySection({ isFrench }: Props) {
  const [energyScenario, setEnergyScenario] = useState<"low" | "central" | "high">("central");
  const [regionChoice, setRegionChoice] = useState<RegionChoice>("FR_2025");
  const [waterMode, setWaterMode] = useState<AiWaterGoalMode>("RISQUE_CONVENTIONNEL");
  const [recyclingAssumption, setRecyclingAssumption] = useState(false);
  const [buttRecyclingAssumption, setButtRecyclingAssumption] = useState(false);
  const [preferredPercent, setPreferredPercent] = useState(50);
  const [capText, setCapText] = useState("");
  const fr = isFrench;
  const waterRiskFactor = IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt;
  const estimated = useMemo(() => estimatePersonalAiFootprint({
    textUsage: { totalTokens: 1_000_000 },
    energyScenario,
    region: regionChoice === "FR_2025" ? "FR" : regionChoice === "US_PROXY" ? "US" : "UNKNOWN",
    ...(regionChoice === "FR_2025" ? { electricityFactorId: "electricity-fr-rte-consumption-2025" } : {}),
  }, "2026-11-21T00:00:00.000Z"), [energyScenario, regionChoice]);
  const capValid = capText === "" || /^\d+(?:[.,]\d+)?$/.test(capText) && Number.isFinite(Number(capText.replace(",", ".")));
  const cap = capText === "" ? null : capValid ? Number(capText.replace(",", ".")) : null;
  const projection = useMemo(() => {
    if (!capValid) return null;
    const materials: AiMaterialScenario[] = recyclingAssumption
      ? [
          { material: "PLASTIC", share: 0.5, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
          { material: "ALUMINIUM", share: 0.1, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
          { material: "GLASS", share: 0.4, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
        ]
      : [{ material: "OTHER", share: 1, destination: "UNKNOWN", recyclingFraction: null, incorporationYield: null }];
    return solveAiCleanwalkGoals({
      targetCarbonKgCo2e: estimated.physicalTotals.operationalKgCo2e,
      targetWaterConsumedLiters: estimated.physicalTotals.indirectWaterLiters,
      materials,
      butts: buttRecyclingAssumption
        ? { mode: "TCHAO_PROVIDER_SCENARIO", acceptsCarbonComparabilityHypothesis: true }
        : { mode: "NOT_RECYCLED" },
      waterMode,
      maxPersonHours: cap,
      preferredPercent,
    });
  }, [capValid, cap, preferredPercent, waterMode, recyclingAssumption, buttRecyclingAssumption, estimated]);
  const selected = projection?.selected;
  const number = (value: number | null | undefined, digits = 6) => value == null
    ? "NA"
    : new Intl.NumberFormat(fr ? "fr-FR" : "en-US", { maximumFractionDigits: digits }).format(value);
  const labels = fr
    ? { title: "Mon empreinte IA : scénarios pédagogiques", intro: "Une simulation distincte des impacts terrain. Les hypothèses ci-dessous ne décrivent pas un fournisseur ni une collecte réelle.", energy: "Scénario énergétique", place: "Scénario géographique hypothétique", low: "Bas", central: "Central", high: "Haut", fr2025: "France 2025 (RTE, consommation)", us: "États-Unis (proxy 2024)", unknown: "Région inconnue", it: "Énergie IT", site: "Énergie site", carbon: "Carbone opérationnel du scénario", water: "Eau indirecte du scénario", risk: "Analogie de risque hydrique", acv: "Eau consommée nette (ACV)", waterMode: "Voie hydrique utilisée pour l'objectif", share: "Part d'effort pour les mégots", cap: "Plafond volontaire (heures-personne)", sample: "Simuler un mix BNR illustratif (50 % plastique, 10 % aluminium, 40 % verre; réincorporation 100 %)", butt: "Inclure l'allégation carbone fournisseur mégots (hypothèse CO₂/CO₂e acceptée)", status: "Statut", hours: "Effort théorique", waste: "Déchets hors mégots", butts: "Mégots entiers", recycling: "Bénéfice scénario de recyclage", noData: "Les choix restent dans cette page et ne sont pas enregistrés.", disclaimer: "Aucune collecte ne compense physiquement l'énergie, le carbone ou l'eau consommés par l'IA. Le proxy de 500 L/mégot est un risque potentiel de pollution, pas une économie d'eau consommée." }
    : { title: "My AI footprint: educational scenarios", intro: "A simulation separate from on-the-ground impacts. These assumptions do not describe an actual provider or cleanup.", energy: "Energy scenario", place: "Hypothetical geographic scenario", low: "Low", central: "Central", high: "High", fr2025: "France 2025 (RTE, consumption)", us: "United States (2024 proxy)", unknown: "Unknown region", it: "IT energy", site: "Facility energy", carbon: "Scenario operational carbon", water: "Scenario indirect water", risk: "Water risk analogy", acv: "Net consumed water (LCA)", waterMode: "Water path used for the goal", share: "Effort share for cigarette butts", cap: "Optional cap (person-hours)", sample: "Simulate an illustrative BNR mix (50% plastic, 10% aluminum, 40% glass; 100% incorporation)", butt: "Include provider butt-carbon claim (accept CO₂/CO₂e comparability assumption)", status: "Status", hours: "Theoretical effort", waste: "Waste excluding butts", butts: "Whole cigarette butts", recycling: "Recycling scenario benefit", noData: "Selections stay on this page and are not saved.", disclaimer: "Collection does not physically offset AI energy, carbon, or water consumption. The 500 L/butt proxy describes potential pollution risk, not water-consumption savings." };

  return <section aria-labelledby="ai-footprint-methodology-title" className="scroll-mt-28">
    <CmmCard as="article" tone="slate" variant="glass" size="lg" className="border-rose-200/20">
      <h2 id="ai-footprint-methodology-title" className="text-xl font-black text-slate-900">{labels.title}</h2>
      <p className="mt-2 max-w-4xl cmm-text-body cmm-text-primary">{labels.intro}</p>
      <p className="mt-3 text-sm"><a href="/learn/empreinte-ia" className="font-bold text-rose-800 underline underline-offset-4">{fr ? "Déclarer et estimer mon usage IA" : "Declare and estimate my AI usage"}</a></p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-800">{labels.energy}
          <select value={energyScenario} onChange={(event) => setEnergyScenario(event.target.value as typeof energyScenario)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="low">{labels.low} ({fr ? "0,06" : "0.06"} kWh IT/M)</option><option value="central">{labels.central} ({fr ? "0,30" : "0.30"} kWh IT/M)</option><option value="high">{labels.high} ({fr ? "0,60" : "0.60"} kWh IT/M)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-800">{labels.place}
          <select value={regionChoice} onChange={(event) => setRegionChoice(event.target.value as RegionChoice)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950">
            <option value="FR_2025">{labels.fr2025}</option><option value="US_PROXY">{labels.us}</option><option value="UNKNOWN">{labels.unknown}</option>
          </select>
        </label>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[[labels.it, estimated.physicalTotals.itEnergyKwh, "kWh"], [labels.site, estimated.physicalTotals.facilityEnergyKwh, "kWh"], [labels.carbon, estimated.physicalTotals.operationalKgCo2e, "kgCO₂e"], [labels.water, estimated.physicalTotals.indirectWaterLiters, "L"]].map(([label, value, unit]) => <div key={String(label)} className="rounded-xl border border-rose-200 bg-white p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-bold tabular-nums text-slate-950">{number(value as number | null)} {unit}</dd></div>)}
      </dl>
      <p className="mt-3 text-xs text-slate-600">{estimated.methodologyNotes.join(" ")}</p>
      <div className="mt-6 grid gap-3">
        <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" checked={recyclingAssumption} onChange={(event) => setRecyclingAssumption(event.target.checked)} className="mt-1" />{labels.sample}</label>
        <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" checked={buttRecyclingAssumption} onChange={(event) => setButtRecyclingAssumption(event.target.checked)} className="mt-1" />{labels.butt}</label>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-800">{labels.waterMode}<select value={waterMode} onChange={(event) => setWaterMode(event.target.value as AiWaterGoalMode)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"><option value="RISQUE_CONVENTIONNEL">{labels.risk} ({number(waterRiskFactor, 0)} L/{fr ? "mégot" : "butt"})</option><option value="EAU_CONSOMMEE_ACV">{labels.acv}</option></select></label>
        <label className="grid gap-1 text-sm text-slate-800">{labels.cap}<input inputMode="decimal" value={capText} onChange={(event) => setCapText(event.target.value)} aria-invalid={!capValid} aria-describedby="ai-cap-error" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950" /></label>
        <label className="grid gap-1 text-sm text-slate-800" htmlFor="ai-collection-share">{labels.share}: {preferredPercent} %<input id="ai-collection-share" type="range" min="0" max="100" step="1" value={preferredPercent} onChange={(event) => setPreferredPercent(Number(event.target.value))} aria-describedby="ai-collection-status ai-footprint-disclaimer" className="w-full accent-rose-400" /></label>
      </div>
      {!capValid ? <p id="ai-cap-error" role="alert" className="mt-2 text-sm text-rose-700">{fr ? "Saisissez un nombre décimal positif ou nul." : "Enter a non-negative decimal number."}</p> : null}
      <p id="ai-collection-status" role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-slate-900">{labels.status}: {selected?.status ?? "UNKNOWN"}{selected?.reasons.length ? ` — ${selected.reasons.join(" ")}` : ""}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[[labels.hours, number(selected?.requiredPersonHours, 5), "h"], [labels.waste, number(selected?.wasteKg, 5), "kg"], [labels.butts, number(selected?.buttsCount, 0), ""], [labels.recycling, number(selected?.carbonRecyclingScenarioKgCo2e), "kgCO₂e"], [labels.risk, number(selected?.waterConventionalRiskLiters, 0), "L"], [labels.acv, number(selected?.netAcvWaterConsumedSavedLiters), "L"]].map(([label, value, unit]) => <div key={String(label)} className="rounded-xl border border-rose-200 bg-white p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-bold tabular-nums text-slate-950">{value} {unit}</dd></div>)}
      </dl>
      <p id="ai-footprint-disclaimer" className="mt-4 cmm-text-small cmm-text-secondary">{labels.disclaimer} {labels.noData}</p>
      <ul aria-label={fr ? "Sources du scénario" : "Scenario sources"} className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-rose-700">
        <li><a href="https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions" target="_blank" rel="noreferrer" className="underline underline-offset-4">RTE 2025</a></li>
        <li><a href="https://www.epa.gov/egrid" target="_blank" rel="noreferrer" className="underline underline-offset-4">EPA eGRID</a></li>
        <li><a href="https://economie-circulaire.ademe.fr/bnr" target="_blank" rel="noreferrer" className="underline underline-offset-4">ADEME BNR</a></li>
        <li><a href="https://www.smet71.fr/media/Documents/RA_2023.pdf" target="_blank" rel="noreferrer" className="underline underline-offset-4">SMET 71, allégation fournisseur</a></li>
      </ul>
    </CmmCard>
  </section>;
}
