import type { AnnuaireEntry } from "./annuaire-map-canvas";
import Link from "next/link";

type AnnuaireGovernancePanelProps = {
  pendingEntries: AnnuaireEntry[];
  verificationLabels: Record<AnnuaireEntry["verificationStatus"], string>;
};

export function AnnuaireGovernancePanel({
  pendingEntries,
  verificationLabels,
}: AnnuaireGovernancePanelProps) {
  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Actions partenaires</h3>
        <div className="mt-3 space-y-2">
          <Link
            href="/partners/onboarding"
            className="block rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Onboarding commercant engage (5 min)
          </Link>
          <a
            href="mailto:partenaires@cleanmymap.fr?subject=Devenir commercant engage"
            className="block rounded-lg bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-amber-600"
          >
            Devenir commercant engage
          </a>
          <a
            href="mailto:partenaires@cleanmymap.fr?subject=Signaler une mise a jour sur la fiche partenaire"
            className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Signaler une mise a jour sur la fiche partenaire
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Transparence</h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-700">
          <li>
            Champs publics vs internes: toutes les fiches sont publiques par
            defaut (logique open source benevole). En interne admin/elus, on
            affiche aussi referent (nom/prenom) + email + telephone.
          </li>
          <li>
            Comment devenir &quot;engage&quot;: fournir identite legale/associative,
            contribution concrete et canal de contact joignable.
          </li>
          <li>
            Criteres de verification: preuve d&apos;activite recente (&lt;120j),
            perimetre geographique explicite, validation equipe partenariats.
          </li>
          <li>
            Fraicheur des donnees: chaque fiche affiche une date de mise a jour
            et un indicateur de recence.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Gouvernance</h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-700">
          <li>
            Validation des fiches: equipe partenariats CleanMyMap + relecture
            operationnelle locale.
          </li>
          <li>
            Modification autorisee: administrateurs plateforme et responsables
            partenaires identifies.
          </li>
          <li>Delai de traitement cible des demandes: 72h ouvrées.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-900">
          Contacts non qualifies (hors annuaire actif)
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-amber-900">
          {pendingEntries.map((entry) => (
            <li key={`pending-${entry.id}`} className="rounded bg-white/70 p-2">
              <p className="font-medium">{entry.name}</p>
              <p>
                {verificationLabels[entry.verificationStatus]} - MAJ{" "}
                {entry.lastUpdatedAt}
              </p>
            </li>
          ))}
          {pendingEntries.length === 0 ? (
            <li className="rounded bg-white/70 p-2">
              Aucun contact non qualifie.
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
