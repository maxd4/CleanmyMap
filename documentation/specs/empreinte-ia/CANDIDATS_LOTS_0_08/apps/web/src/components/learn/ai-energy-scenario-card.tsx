"use client";

import { useMemo, useState } from "react";
import {
  computeTextEnergyScenario,
  computeEnergyCarbonWater,
  RTE_FRANCE_2025_CONSUMPTION,
  type AiElectricityFactor,
} from "@/lib/environmental-impact-estimator/ai-cleanwalk-science";

/**
 * Lot 0: presentational card for /methodologie. Factor US must be supplied from
 * the existing scientific-registry (electricity-us-egrid-2024), never duplicated.
 * The card deliberately does not show a number of equivalent cleanwalks.
 */
export function AiEnergyScenarioCard({usProxyFactor,terrainWasteProxyKgCo2ePerKg,locale="fr"}: {
  usProxyFactor:AiElectricityFactor;
  terrainWasteProxyKgCo2ePerKg:number|null;
  locale?:"fr"|"en";
}) {
  const [caseId,setCaseId]=useState<"low"|"central"|"high">("central");
  const [location,setLocation]=useState<"FR_2025"|"US_PROXY"|"UNKNOWN">("FR_2025");
  const outcome=useMemo(()=>{
    const energy=computeTextEnergyScenario(1_000_000,caseId);
    const factor=location==="FR_2025"?RTE_FRANCE_2025_CONSUMPTION:location==="US_PROXY"?usProxyFactor:null;
    const region=location==="FR_2025"?"FR":location==="US_PROXY"?"US":null;
    const impact=computeEnergyCarbonWater({energy,region,factor,locationMode:region===null?"UNKNOWN":"HYPOTHETICAL",wueGridLitersPerSiteKwh:location==="US_PROXY"?4.52:null});
    return {energy,impact};
  },[caseId,location,usProxyFactor]);
  const fr=locale==="fr";
  const fmt=(v:number|null,dec=6)=>v===null?"NA":new Intl.NumberFormat(fr?"fr-FR":"en-US",{maximumFractionDigits:dec}).format(v);
  const mass=outcome.impact.co2eKg!==null && terrainWasteProxyKgCo2ePerKg!==null && terrainWasteProxyKgCo2ePerKg>0?outcome.impact.co2eKg/terrainWasteProxyKgCo2ePerKg:null;
  return <section aria-labelledby="ai-energy-method-heading" className="rounded-2xl border border-amber-300/40 p-4 sm:p-6">
    <h2 id="ai-energy-method-heading" className="text-lg font-bold">{fr?"Comprendre l'empreinte d'un million de tokens":"Explore the impact of one million tokens"}</h2>
    <p className="mt-2 text-sm opacity-75">{fr?"Scénarios non calibrés, non mesurés chez un fournisseur ; une région choisie ici ne décrit pas la région réelle de votre IA.":"Uncalibrated scenarios, not measured for any provider. The selected region is hypothetical."}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm" htmlFor="ai-method-energy">{fr?"Hypothèse énergétique":"Energy hypothesis"}
        <select id="ai-method-energy" value={caseId} onChange={(e:{target:{value:string}})=>setCaseId(e.target.value as "low"|"central"|"high")} className="rounded-lg border p-2 text-black">
          <option value="low">{fr?"Basse (0,06 kWh IT/M)":"Low (0.06 kWh IT/M)"}</option>
          <option value="central">{fr?"Centrale (0,30 kWh IT/M)":"Central (0.30 kWh IT/M)"}</option>
          <option value="high">{fr?"Haute (0,60 kWh IT/M)":"High (0.60 kWh IT/M)"}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm" htmlFor="ai-method-region">{fr?"Scénario géographique":"Geographic scenario"}
        <select id="ai-method-region" value={location} onChange={(e:{target:{value:string}})=>setLocation(e.target.value as "FR_2025"|"US_PROXY"|"UNKNOWN")} className="rounded-lg border p-2 text-black">
          <option value="FR_2025">{fr?"France, consommation 2025 (RTE)":"France 2025 consumption (RTE)"}</option>
          <option value="US_PROXY">{fr?"États-Unis, proxy 2024 (EPA/EIA)":"United States, 2024 proxy (EPA/EIA)"}</option>
          <option value="UNKNOWN">{fr?"Région inconnue":"Unknown region"}</option>
        </select>
      </label>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div><dt className="text-xs opacity-75">kWh IT</dt><dd className="text-lg font-bold">{fmt(outcome.energy.itKwh)}</dd></div>
      <div><dt className="text-xs opacity-75">kWh site (PUE 1,15)</dt><dd className="text-lg font-bold">{fmt(outcome.energy.facilityKwh)}</dd></div>
      <div><dt className="text-xs opacity-75">kgCO₂e scénario</dt><dd className="text-lg font-bold">{fmt(outcome.impact.co2eKg)}</dd></div>
      <div><dt className="text-xs opacity-75">L indirects seulement</dt><dd className="text-lg font-bold">{fmt(outcome.impact.indirectWaterLiters)}</dd></div>
    </dl>
    <p className="mt-4 text-xs opacity-75">{fr?"Correspondance facultative avec le proxy des déchets hors mégots":"Optional conventional waste proxy"}: {fmt(mass)} kg. {fr?"Ce n'est ni une économie mesurée, ni une compensation, ni un nombre de cleanwalks.":"This is neither measured savings, nor an offset, nor a number of cleanwalks."}</p>
    <p className="mt-2 text-xs opacity-75">{fr?"Eau totale = NA sans eau directe du site. ACV et matériel incorporé non évalués ici.":"Total water is unknown without direct on-site water data. Embodied impacts are not assessed here."}</p>
    <a href="https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline underline-offset-4">RTE 2025</a>
  </section>;
}
