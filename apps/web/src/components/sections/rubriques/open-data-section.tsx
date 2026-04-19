export function OpenDataSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
        Donnees ouvertes pour accelerer la cooperation locale: open data, API,
        export JSON et cadre reutilisable pour chercheurs, collectivites et
        replication multi-villes.
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Open data et formats d&apos;echange
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Exports JSON/CSV pour analyses externes et auditabilite.</li>
          <li>
            Jeu de donnees standardise: actions, qualite, geolocalisation,
            temporalite.
          </li>
          <li>
            Metadonnees de version (modele proxy, regles qualite) pour une
            interpretation rigoureuse.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">API et acces chercheurs</h3>
        <p className="mt-1 text-sm text-slate-700">
          Acces programmatique aux donnees operationnelles et indicateurs
          d&apos;impact pour travaux academiques, evaluation de politiques
          publiques et comparaisons inter-quartiers.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>API cartographie: suivi des actions geolocalisees.</li>
          <li>API progression/impact: historique utilisateur et tendances.</li>
          <li>Cadre de citation methodologique pour publications et dossiers publics.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Integration avec les villes
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          Base d&apos;interoperabilite pour connecter CleanMyMap aux tableaux de
          bord municipaux et faciliter le deploiement du modele dans
          d&apos;autres territoires.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Export periodique pour observatoires territoriaux.</li>
          <li>Compatibilite avec schemas de suivi environnemental locaux.</li>
          <li>Gouvernance de donnees: transparence des hypothese et limites.</li>
        </ul>
      </section>
    </div>
  );
}

