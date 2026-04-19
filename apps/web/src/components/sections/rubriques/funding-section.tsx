export function FundingSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Rubrique dediee au modele economique local: sponsoring de zones,
        mecenat ecologique et appel au don pour renforcer les actions
        concretes sur le terrain.
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Sponsoring de zones par les entreprises
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Une entreprise peut soutenir une zone cible avec un budget annuel
            transparent.
          </li>
          <li>
            Suivi attendu: actions realisees, volume traite, qualite des
            donnees et evidence cartographique.
          </li>
          <li>
            Gouvernance: aucun droit de moderation lie au financement.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Mecenat ecologique
        </h3>
        <p className="mt-2 text-sm text-slate-700">
          Les structures peuvent financer du materiel, de la logistique, de la
          formation ou de la capacite d&apos;intervention sans logique de
          sur-competition entre acteurs.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Appel au don</h3>
        <p className="mt-2 text-sm text-slate-700">
          Collecte citoyenne orientee impact local: chaque don est rattache a
          un perimetre d&apos;action et a des indicateurs de suivi publics.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Trajectoire d&apos;usage des fonds documentee dans Rapports d&apos;impact.</li>
          <li>Priorisation des besoins terrain urgents et recurrents.</li>
        </ul>
      </section>
    </div>
  );
}

