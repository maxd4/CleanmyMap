"use client";

import type { AnnuaireEntry } from"./annuaire-map-canvas";
import Link from"next/link";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";

type AnnuaireGovernancePanelProps = {
 pendingEntries: AnnuaireEntry[];
 verificationLabels: Record<AnnuaireEntry["verificationStatus"], string>;
};

export function AnnuaireGovernancePanel({
 pendingEntries,
 verificationLabels,
}: AnnuaireGovernancePanelProps) {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 return (
 <>
 <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Actions partenaires" :"Partner actions"}</h3>
 <div className="mt-3 space-y-2">
 <Link
 href="/partners/onboarding"
 className="block rounded-lg bg-emerald-600 px-3 py-2 text-center cmm-text-caption font-semibold text-white hover:bg-emerald-700"
 >
 {fr ?"Parcours partenaire (5 min)" :"Partner flow (5 min)"}
 </Link>
 <a
 href="mailto:partenaires@cleanmymap.fr?subject=Rejoindre le réseau partenaire"
 className="block rounded-lg bg-amber-500 px-3 py-2 text-center cmm-text-caption font-semibold text-white hover:bg-amber-600"
 >
 {fr ?"Rejoindre le réseau partenaire" :"Join the partner network"}
 </a>
 <a
 href="mailto:partenaires@cleanmymap.fr?subject=Signaler une mise à jour sur la fiche partenaire"
 className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-center cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
 >
 {fr ?"Signaler une mise à jour sur la fiche partenaire" :"Report an update to a partner profile"}
 </a>
 </div>
 </section>

 <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Transparence" :"Transparency"}</h3>
 <ul className="mt-3 space-y-2 cmm-text-caption cmm-text-secondary">
 <li>
 {fr
 ?"Champs publics vs internes : toutes les fiches sont publiques par défaut (logique open source bénévole). En interne administration / autorités locales, on affiche aussi référent (nom/prénom) + email + téléphone."
 :"Public vs internal fields: all profiles are public by default (open-source volunteer logic). In administration / local authority views, the contact owner name, email and phone are also shown."}
 </li>
 <li>
 {fr
 ?"Comment rejoindre le réseau : fournir identité légale/associative, contribution concrète et canal de contact joignable."
 :"How to join the network: provide legal/association identity, concrete contribution and a reachable contact channel."}
 </li>
 <li>
 {fr
 ?"Critères de vérification: preuve d'activité récente (<120j), périmètre géographique explicite, validation équipe partenariats."
 :"Verification criteria: recent activity evidence (<120 days), explicit geographic scope and partner-team validation."}
 </li>
 <li>
 {fr
 ?"Fraîcheur des données: chaque fiche affiche une date de mise à jour et un indicateur de récence."
 :"Data freshness: each profile shows an update date and recency indicator."}
 </li>
 </ul>
 </section>

 <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Gouvernance" :"Governance"}</h3>
 <ul className="mt-3 space-y-2 cmm-text-caption cmm-text-secondary">
 <li>
 {fr
 ?"Validation des fiches : équipe partenariats CleanMyMap + relecture opérationnelle locale."
 :"Profile validation: CleanMyMap partner team + local operational review."}
 </li>
 <li>
 {fr
 ?"Modification autorisée : administration de la plateforme et responsables partenaires identifiés."
 :"Authorized edits: platform administration and identified partner leads."}
 </li>
 <li>{fr ?"Délai de traitement cible des demandes : 72h ouvrées." :"Target request handling time: 72 business hours."}</li>
 </ul>
 </section>

 <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold text-amber-900">{fr ?"Contacts à qualifier (hors annuaire actif)" :"Contacts to qualify (outside active directory)"}</h3>
 <ul className="mt-3 space-y-2 cmm-text-caption text-amber-900">
 {pendingEntries.map((entry) => (
 <li key={`pending-${entry.id}`} className="rounded bg-white/70 p-2">
 <p className="font-medium">{entry.name}</p>
 <p>
 {verificationLabels[entry.verificationStatus]} - MAJ{""}
 {entry.lastUpdatedAt}
 </p>
 </li>
 ))}
 {pendingEntries.length === 0 ? (
 <li className="rounded bg-white/70 p-2">
 {fr ?"Aucun contact à qualifier." :"No contacts to qualify."}
 </li>
 ) : null}
 </ul>
 </section>
 </>
 );
}
