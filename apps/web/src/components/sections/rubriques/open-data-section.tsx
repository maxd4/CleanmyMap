 "use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function OpenDataSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
        {fr
          ? "Données ouvertes pour accélérer la coopération locale: open data, API, export JSON et cadre réutilisable pour chercheurs, collectivités et réplication multi-villes."
          : "Open data to accelerate local cooperation: API access, JSON export and a reusable framework for researchers, cities and multi-city replication."}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {fr ? "Open data et formats d'échange" : "Open data and exchange formats"}
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{fr ? "Exports JSON/CSV pour analyses externes et auditabilité." : "JSON/CSV exports for external analysis and auditability."}</li>
          <li>{fr ? "Jeu de données standardisé: actions, qualité, géolocalisation, temporalité." : "Standardized dataset: actions, quality, geolocation and time context."}</li>
          <li>{fr ? "Métadonnées de version (modèle proxy, règles qualité) pour une interprétation rigoureuse." : "Version metadata (proxy model, quality rules) for rigorous reading."}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">{fr ? "API et accès chercheurs" : "API and researcher access"}</h3>
        <p className="mt-1 text-sm text-slate-700">
          {fr
            ? "Accès programmatique aux données opérationnelles et indicateurs d'impact pour travaux académiques, évaluation de politiques publiques et comparaisons inter-quartiers."
            : "Programmatic access to operational data and impact indicators for academic work, public policy evaluation and cross-neighborhood comparisons."}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{fr ? "API cartographie: suivi des actions géolocalisées." : "Mapping API: geolocated action tracking."}</li>
          <li>{fr ? "API progression/impact: historique utilisateur et tendances." : "Progress/impact API: user history and trends."}</li>
          <li>{fr ? "Cadre de citation méthodologique pour publications et dossiers publics." : "Methodology citation framework for publications and public dossiers."}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {fr ? "Intégration avec les villes" : "City integration"}
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          {fr
            ? "Base d'interopérabilité pour connecter CleanMyMap aux tableaux de bord municipaux et faciliter le déploiement du modèle dans d'autres territoires."
            : "Interoperability base to connect CleanMyMap to municipal dashboards and support deployment in other territories."}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{fr ? "Export périodique pour observatoires territoriaux." : "Periodic export for territorial observatories."}</li>
          <li>{fr ? "Compatibilité avec schémas de suivi environnemental locaux." : "Compatibility with local environmental monitoring schemes."}</li>
          <li>{fr ? "Gouvernance de données: transparence des hypothèses et limites." : "Data governance: transparent assumptions and limits."}</li>
        </ul>
      </section>
    </div>
  );
}
