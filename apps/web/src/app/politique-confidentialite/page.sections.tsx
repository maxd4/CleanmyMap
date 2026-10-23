import Link from "next/link";
import { DataList, Pill } from "./page.primitives";

export function PrivacyContactAndSecurity({ contactEmail }: { contactEmail: string }) {
  return <>
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">11. Sécurité</h2><DataList items={["Chiffrement en transit lorsque le fournisseur et le protocole utilisés l'exposent.", "Accès restreint aux données côté administrateur et politiques Supabase appliquées par le schéma.", "Journalisation des opérations sensibles et des erreurs techniques lorsqu'elle est activée.", "Minimisation : les formulaires limitent les données demandées à la fonctionnalité concernée."]} /></section>
    <section className="rounded-3xl border border-slate-200 bg-emerald-50 p-5"><h2 className="text-xl font-bold text-slate-950">12. Contact et réclamation</h2><p className="cmm-text-body mt-2">Questions RGPD, retrait du consentement ou exercice de droits: <a href={`mailto:${contactEmail}`} className="font-medium text-emerald-700 hover:underline">{contactEmail}</a>.</p><p className="cmm-text-body mt-2">Si vous estimez que votre demande n&apos;a pas été correctement traitée, vous pouvez saisir la CNIL via <a href="https://www.cnil.fr/fr/adresser-une-plainte" className="font-medium text-emerald-700 hover:underline">son site officiel</a>.</p><p className="cmm-text-body mt-2">Documents associés: <Link href="/conditions-generales-utilisation" className="font-medium text-emerald-700 hover:underline">CGU</Link>{" · "}<Link href="/politique-cookies" className="font-medium text-emerald-700 hover:underline">politique cookies</Link>{" · "}<Link href="/mentions-legales" className="font-medium text-emerald-700 hover:underline">mentions légales</Link>{" · "}<Link href="/signaler-contenu-illicite" className="font-medium text-emerald-700 hover:underline">notification de contenu</Link></p></section>
  </>;
}

export function PrivacyPurposesSection() {
  const rows = [
    ["Compte et profil", "Créer, authentifier et fournir les fonctionnalités du compte", "Exécution du service / mesures précontractuelles lorsque pertinentes ; intérêt légitime de sécurité"],
    ["Actions, spots, événements et messagerie", "Enregistrer les contributions, coordonner la communauté et afficher les fonctionnalités choisies", "Exécution du service"],
    ["Support et demandes RGPD", "Répondre aux messages, exercer les droits et assurer le suivi de la demande", "Intérêt légitime pour le support ; obligation légale pour les demandes de droits"],
    ["Notifications de contenu", "Recevoir, examiner et suivre les notifications électroniques concernant un contenu potentiellement illicite", "Intérêt légitime ; obligation légale lorsque le traitement concerné l'impose"],
    ["Décisions de modération liées aux notifications", "Examiner la légalité ou la conformité aux CGU, appliquer si possible une mesure canonique, assurer l'audit et informer les personnes concernées", "Intérêt légitime ; obligation légale lorsque la traçabilité ou l'information l'impose"],
    ["Newsletter", "Envoyer les communications auxquelles la personne s'est inscrite", "Consentement"],
    ["Analytics et mesure d'audience", "Mesurer les parcours et la performance après accord", "Consentement"],
    ["Sentry et sécurité", "Détecter, diagnostiquer et prévenir les erreurs, abus et incidents", "Intérêt légitime"],
    ["Parrainage et progression", "Relier les invitations et afficher les éléments de progression du service", "Exécution du service ; intérêt légitime d'animation de la communauté"],
    ["Classement public sur opt-in", "Afficher une projection publique limitée lorsque la personne active cette préférence ; le retrait la rend à nouveau absente", "Consentement ou choix explicite de la personne ; retrait possible depuis `/reglages`"],
    ["Contributions financières via Stripe", "Créer la session Checkout demandée, confirmer le paiement, prévenir la fraude, suivre les remboursements et conserver la traçabilité applicable", "Étapes demandées pour le paiement ; intérêt légitime de sécurité et de prévention de la fraude ; obligation légale lorsqu'elle s'applique"],
  ];
  return <section className="space-y-5"><div className="space-y-2"><Pill>Finalités</Pill><h2 className="text-2xl font-bold text-slate-950">5. Finalités et bases légales</h2></div><div className="cmm-data-table-wrap"><table className="cmm-data-table"><caption className="sr-only">Traitements de données personnelles, finalités et bases légales</caption><thead className="bg-slate-100 text-slate-900"><tr><th scope="col" className="font-semibold">Traitement</th><th scope="col" className="font-semibold">Finalité</th><th scope="col" className="font-semibold">Base légale</th></tr></thead><tbody className="cmm-text-body">{rows.map(([treatment, purpose, basis]) => <tr key={treatment}><td className="font-medium text-slate-900">{treatment}</td><td>{purpose}</td><td>{basis}</td></tr>)}</tbody></table></div></section>;
}
