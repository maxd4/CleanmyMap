 "use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function FundingSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        {fr
          ? "Rubrique dédiée au modèle économique local: sponsoring de zones, mécénat écologique et appel au don pour renforcer les actions concrètes sur le terrain."
          : "Section dedicated to the local funding model: zone sponsorship, ecological patronage and donations to strengthen field actions."}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {fr ? "Sponsoring de zones par les entreprises" : "Business-backed zone sponsorship"}
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{fr ? "Une entreprise peut soutenir une zone cible avec un budget annuel transparent." : "A company can support a target area with a transparent annual budget."}</li>
          <li>{fr ? "Suivi attendu: actions réalisées, volume traité, qualité des données et évidence cartographique." : "Expected follow-up: completed actions, processed volume, data quality and map evidence."}</li>
          <li>{fr ? "Gouvernance: aucun droit de modération lié au financement." : "Governance: no moderation rights are tied to funding."}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">{fr ? "Mécénat écologique" : "Ecological patronage"}</h3>
        <p className="mt-2 text-sm text-slate-700">
          {fr
            ? "Les structures peuvent financer du matériel, de la logistique, de la formation ou de la capacité d'intervention sans logique de sur-competition entre acteurs."
            : "Organizations can fund equipment, logistics, training or intervention capacity without encouraging unhealthy competition."}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">{fr ? "Appel au don" : "Donation appeal"}</h3>
        <p className="mt-2 text-sm text-slate-700">
          {fr
            ? "Collecte citoyenne orientée impact local: chaque don est rattaché à un périmètre d'action et à des indicateurs de suivi publics."
            : "Civic fundraising focused on local impact: each donation is tied to a scope of action and public follow-up indicators."}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{fr ? "Trajectoire d'usage des fonds documentée dans Rapports d'impact." : "Fund usage trajectory documented in Impact reports."}</li>
          <li>{fr ? "Priorisation des besoins terrain urgents et récurrents." : "Prioritization of urgent and recurring field needs."}</li>
        </ul>
      </section>
    </div>
  );
}
