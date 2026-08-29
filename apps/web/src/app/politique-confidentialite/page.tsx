import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RgpdRequestForm } from "@/components/sections/rubriques/rgpd-request-form";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { resolvePublicContactEmail } from "@/lib/email-config";

export const metadata: Metadata = {
  title: "Politique de confidentialité - CleanMyMap",
  description:
    "Politique de confidentialité CleanMyMap : données traitées, finalités, bases légales, droits RGPD, sous-traitants, rétention et sécurité.",
  keywords: [
    "politique de confidentialité",
    "RGPD",
    "CleanMyMap",
    "données personnelles",
    "droits RGPD",
    "cookies",
  ],
  alternates: {
    canonical: "/politique-confidentialite",
  },
};

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
      {children}
    </span>
  );
}

function DataList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PolitiqueConfidentialitePage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <main>
      <CmmPageLayout>
      <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <CmmSectionGroup>
        <PageHeader
          tone="slate"
          title="Politique de confidentialité"
          subtitle="Cette page décrit les données réellement traitées par CleanMyMap, les finalités, les destinataires, les critères de conservation et les droits des personnes."
          action={<p className="text-sm font-medium text-slate-500">Dernière mise à jour : 27 août 2026</p>}
        />

        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-950">Responsable du traitement</h2>
            <p className="text-sm leading-6 text-slate-600">
              Le responsable du traitement est <strong>Maxence Deroome</strong>,
              personne physique éditant CleanMyMap à titre non professionnel dans
              le cadre d&apos;un projet étudiant. Aucune société, entreprise,
              association ou autre personne morale n&apos;exploite actuellement le
              service. Le point de contact actuellement
              configuré pour les questions RGPD est :{" "}
              <a href={`mailto:${contactEmail}`} className="font-medium text-emerald-700 hover:underline">
                {contactEmail}
              </a>
              .
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-950">Principe appliqué</h2>
            <p className="text-sm leading-6 text-slate-600">
              Les traitements sont limités aux besoins du service. Les analytics et
              la mesure d&apos;audience soumis au consentement ne sont activés
              qu&apos;après un choix positif, conservé six mois.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Données traitées</Pill>
            <h2 className="text-2xl font-bold text-slate-950">1. Compte, authentification et profil</h2>
          </div>
          <DataList
            items={[
              "Identifiant Clerk (`userId`) et données d'identité fournies par le fournisseur d'authentification.",
              "Prénom, nom, pseudo / username, nom d'affichage, adresse email et numéro de téléphone lorsqu'il est fourni.",
              "Image de profil / avatar et URL ou métadonnées associées.",
              "Rôle applicatif, visibilité du profil, badges, progression et arrondissement éventuellement renseigné.",
              "Parrainage : code d'invitation, identifiant du parrain et rattachement du compte invité.",
              "Cookies de session Clerk et données techniques nécessaires à l'authentification et à la sécurité.",
            ]}
          />
          <p className="text-sm leading-6 text-slate-600">
            L&apos;adresse email et les éléments nécessaires à l&apos;authentification sont
            obligatoires pour un compte. Le téléphone et les informations de profil
            complémentaires sont facultatifs lorsqu&apos;ils ne sont pas nécessaires à
            une fonctionnalité choisie.
          </p>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Contributions</Pill>
            <h2 className="text-2xl font-bold text-slate-950">2. Signalements, actions et lieux</h2>
          </div>
          <DataList
            items={[
              "Actions et signalements : type, dates, libellé du lieu, coordonnées GPS saisies, état de modération et notes.",
              "Mesures déclarées : poids collecté, mégots, bénévoles, durée, répartition des déchets et estimation visuelle.",
              "Tracés : points de départ et d'arrivée, polylignes/polygones, source et niveau de confiance de la géométrie.",
              "Identité affichée ou associée à une contribution : nom d'acteur, nom d'organisation fourni, identifiant utilisateur et métadonnées de profil utiles au service.",
              "Médias de signalement : nom original, type MIME, taille, dimensions, état d'import et chemin de stockage ; la table métier ne contient pas le binaire de l'image.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Communauté et support</Pill>
            <h2 className="text-2xl font-bold text-slate-950">3. Événements, messages et demandes</h2>
          </div>
          <DataList
            items={[
              "Événements communautaires et RSVP : titre, date, lieu, description, organisateur, participant et statut de réponse.",
              "Messagerie privée ou territoriale : expéditeur, destinataire, contenu, zone ou arrondissement, pièce jointe facultative et type de pièce jointe.",
              "Demandes de bug, feedback, promotion et onboarding partenaire : coordonnées fournies, contenu de la demande, page concernée, rôle ou organisation et état de traitement.",
              "Demandes RGPD envoyées depuis `/contact` : email, type de demande, message, identifiant de compte lorsqu'il est disponible, date, page d'origine et état de notification dans `contact_requests`.",
              "Notifications de contenu potentiellement illicite : URL exacte, motif circonstancié, type ou identifiant technique facultatif, identité et email lorsqu'ils sont fournis, exception d'identité lorsqu'elle est invoquée, date, état de traitement et identifiant de suivi.",
              "Décisions administratives relatives à ces notifications : acteur admin canonique, date, action, origine, motif, moyens automatisés, fondement légal ou CGU lorsque pertinent, URL/identifiant du contenu et états avant/après bornés. L'audit n'inclut pas l'identité du déclarant ni le contenu tiers.",
              "Notifications, progression, événements de service et journaux d'opérations d'administration nécessaires au fonctionnement et à la sécurité.",
            ]}
          />
          <p className="text-sm leading-6 text-slate-600">
            Certaines données peuvent être reçues indirectement lorsqu&apos;un autre
            utilisateur vous associe à un événement, une participation, une action,
            un message ou un parrainage. Elles sont alors utilisées pour la
            fonctionnalité concernée et soumises aux mêmes droits.
          </p>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Cookies et mesure</Pill>
            <h2 className="text-2xl font-bold text-slate-950">4. Préférences, analytics et observabilité</h2>
          </div>
          <DataList
            items={[
              "Préférences d'interface : langue, thème et mode d'affichage, stockés localement puis synchronisés dans des cookies SameSite=Lax lorsqu'ils sont actifs.",
              "Le choix cookies est mémorisé dans `localStorage` sous `cleanmymap_cookie_consent` et dans `cleanmymap_analytics_consent` pendant six mois. Une décision expirée est nettoyée et le choix est reproposé.",
              "PostHog, Vercel Analytics et Vercel Speed Insights ne sont activés qu'après consentement analytics. Le retrait arrête la capture PostHog et empêche le rendu des intégrations Vercel ; un nouveau consentement peut les réactiver.",
              "Le suivi de tunnel `funnel_events` reste bloqué sans consentement ; lorsqu'il est autorisé, il peut contenir un identifiant de session, une étape, un mode, un identifiant Clerk éventuel et des métadonnées de parcours.",
              "Sentry, lorsqu'il est activé par une DSN, est un outil d'observabilité et de sécurité, pas un outil d'analytics soumis au consentement cookies. Les erreurs peuvent contenir des traces, messages et métadonnées techniques utiles au diagnostic. Aucun masquage ou anonymisation spécifique supplémentaire n'est déclaré ici comme configuré.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Finalités</Pill>
            <h2 className="text-2xl font-bold text-slate-950">5. Finalités et bases légales</h2>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Traitement</th>
                  <th className="px-4 py-3 font-semibold">Finalité</th>
                  <th className="px-4 py-3 font-semibold">Base légale</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ["Compte et profil", "Créer, authentifier et fournir les fonctionnalités du compte", "Exécution du service / mesures précontractuelles lorsque pertinentes ; intérêt légitime de sécurité"],
                  ["Actions, spots, événements et messagerie", "Enregistrer les contributions, coordonner la communauté et afficher les fonctionnalités choisies", "Exécution du service"],
                  ["Support et demandes RGPD", "Répondre aux messages, exercer les droits et assurer le suivi de la demande", "Intérêt légitime pour le support ; obligation légale pour les demandes de droits"],
                  ["Notifications de contenu", "Recevoir, examiner et suivre les notifications électroniques concernant un contenu potentiellement illicite", "Intérêt légitime ; obligation légale lorsque le traitement concerné l'impose"],
                  ["Décisions de modération liées aux notifications", "Examiner la légalité ou la conformité aux CGU, appliquer si possible une mesure canonique, assurer l'audit et informer les personnes concernées", "Intérêt légitime ; obligation légale lorsque la traçabilité ou l'information l'impose"],
                  ["Newsletter", "Envoyer les communications auxquelles la personne s'est inscrite", "Consentement"],
                  ["Analytics et mesure d'audience", "Mesurer les parcours et la performance après accord", "Consentement"],
                  ["Sentry et sécurité", "Détecter, diagnostiquer et prévenir les erreurs, abus et incidents", "Intérêt légitime"],
                  ["Parrainage et progression", "Relier les invitations et afficher les éléments de progression du service", "Exécution du service ; intérêt légitime d'animation de la communauté"],
                ].map(([treatment, purpose, basis]) => (
                  <tr key={treatment} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{treatment}</td>
                    <td className="px-4 py-3">{purpose}</td>
                    <td className="px-4 py-3">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Destinataires</Pill>
            <h2 className="text-2xl font-bold text-slate-950">6. Sous-traitants et destinataires</h2>
          </div>
          <DataList
            items={[
              "Clerk : identité, authentification et métadonnées de compte.",
              "Supabase : base de données, stockage et synchronisation métier.",
              "Vercel : hébergement et exécution du site ; Analytics et Speed Insights seulement avec consentement.",
              "Resend : envoi des emails transactionnels, de support et de notification.",
              "PostHog : mesure d'audience et analytics seulement avec consentement.",
              "Sentry : observabilité et sécurité uniquement si la DSN est configurée.",
              "Autorités compétentes ou autres destinataires : uniquement lorsque la loi ou le traitement concerné le justifie.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Transferts</Pill>
            <h2 className="text-2xl font-bold text-slate-950">7. Transferts hors EEE</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            La configuration du projet privilégie l&apos;hôte UE par défaut de PostHog,
            mais elle permet aussi un hôte configurable et ne suffit pas à établir
            la localisation effective de chaque fournisseur ni la garantie applicable
            à chaque flux. Aucune localisation précise, décision d&apos;adéquation ou
            garantie contractuelle n&apos;est donc affirmée ici sans vérification du
            fournisseur et de la configuration en production. Lorsque le traitement
            l&apos;exige, les transferts sont encadrés par le mécanisme légal applicable
            et les informations du fournisseur en vigueur.
          </p>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Rétention</Pill>
            <h2 className="text-2xl font-bold text-slate-950">8. Durées et critères de conservation</h2>
          </div>
          <DataList
            items={[
              "Consentement cookies : six mois ; une décision expirée est retirée du stockage local et le choix est reproposé.",
              "contact_requests : la demande est persistée dans le store local et dans la table Supabase. Elle est désormais couverte par le script de nettoyage générique, dont le seuil opérationnel par défaut est de 120 jours lorsqu'il est exécuté ; ce script n'est pas une preuve d'exécution planifiée ni une durée garantie pour toutes les demandes.",
              "Stores locaux couverts par le nettoyage : les enregistrements dépassant le seuil fourni au script sont retirés ; le store local est aussi borné en nombre pour certains flux. Les archives de nettoyage ne contiennent plus les lignes personnelles ni les chemins de fichiers, seulement des comptages et métadonnées de run.",
              "Tables et fichiers opérationnels couverts par le script : `app_messages`, `community_events`, `training_examples`, `community_bug_reports`, `promotion_requests`, `partner_onboarding_requests`, `contact_requests`, ainsi que certains objets des buckets configurés. Le seuil par défaut est modifiable par l'opérateur.",
              "legal_content_reports : aucun nettoyage automatique spécifique n'est identifié dans ce dépôt ; les signalements sont conservés selon le suivi nécessaire de la notification, les obligations applicables et l'examen d'une demande de droits. Ils ne sont pas supprimés par le nettoyage générique actuel.",
              "legal_content_report_decisions : l'historique des décisions et de l'audit est conservé avec le signalement pour la traçabilité. Les états d'envoi sont enrichis de manière bornée pour distinguer un envoi réussi d'un échec ; aucune durée fixe supplémentaire n'est configurée. Une demande d'effacement ou de limitation est examinée au regard des obligations de preuve, des droits des tiers et de la nécessité du suivi.",
              "Profils, actions, lieux, médias de signalement, rapports, notifications, progression et audit : aucun mécanisme générique de suppression périodique n'est identifié dans ce dépôt ; conservation selon le fonctionnement du service et examen au cas par cas lors d'une demande de droits.",
              "Newsletter : l'inscription reste active jusqu'à son retrait ou sa mise à jour ; le code actuel ne fournit pas de parcours public de désinscription dédié, le retrait peut être demandé via le contact RGPD.",
              "PostHog, Vercel et Sentry : la durée de conservation des données chez ces fournisseurs n'est pas configurée par ce dépôt ; elle dépend de leurs paramètres et conditions applicables et n'est pas présentée comme une durée CleanMyMap.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Droits</Pill>
            <h2 className="text-2xl font-bold text-slate-950">9. Vos droits RGPD</h2>
          </div>
          <DataList
            items={[
              "Droit d'accès, de rectification, d'effacement et de limitation du traitement.",
              "Droit d'opposition lorsque le traitement est fondé sur l'intérêt légitime, et droit à la portabilité lorsque les conditions sont réunies.",
              "Droit de retirer votre consentement à tout moment pour les traitements fondés sur celui-ci ; ce retrait ne remet pas en cause les traitements antérieurs.",
              "Droit d'introduire une réclamation auprès de la CNIL.",
            ]}
          />
          <p className="text-sm leading-6 text-slate-600">
            Aucune fonctionnalité identifiée ne prend actuellement une décision
            exclusivement automatisée produisant des effets juridiques ou un effet
            significatif similaire à votre égard.
          </p>
        </section>

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-2xl font-bold text-slate-950">10. Exercer vos droits</h2>
          <p className="text-sm leading-6 text-slate-600">
            Utilisez le formulaire de la page{" "}
            <Link href="/contact" className="font-medium text-emerald-700 hover:underline">Contact</Link>{" "}
            ou le formulaire ci-dessous pour une demande d&apos;accès, de rectification,
            d&apos;effacement ou de portabilité. Une vérification raisonnable de votre
            identité peut être demandée lorsque cela est nécessaire pour protéger
            les données d&apos;autrui.
          </p>
          <RgpdRequestForm />
          <p className="text-xs text-slate-500">
            Réponse dans un délai d&apos;un mois à compter de la réception. Ce délai peut
            être prolongé de deux mois lorsque la complexité ou le nombre de demandes
            le justifie ; vous en serez informé dans le premier mois.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">11. Sécurité</h2>
          <DataList
            items={[
              "Chiffrement en transit lorsque le fournisseur et le protocole utilisés l'exposent.",
              "Accès restreint aux données côté administrateur et politiques Supabase appliquées par le schéma.",
              "Journalisation des opérations sensibles et des erreurs techniques lorsqu'elle est activée.",
              "Minimisation : les formulaires limitent les données demandées à la fonctionnalité concernée.",
            ]}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">12. Contact et réclamation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Questions RGPD, retrait du consentement ou exercice de droits :{" "}
            <a href={`mailto:${contactEmail}`} className="font-medium text-emerald-700 hover:underline">{contactEmail}</a>.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Si vous estimez que votre demande n&apos;a pas été correctement traitée,
            vous pouvez saisir la CNIL via{" "}
            <a href="https://www.cnil.fr/fr/adresser-une-plainte" className="font-medium text-emerald-700 hover:underline">son site officiel</a>.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Documents associés :{" "}
            <Link href="/conditions-generales-utilisation" className="font-medium text-emerald-700 hover:underline">CGU</Link>{" · "}
            <Link href="/politique-cookies" className="font-medium text-emerald-700 hover:underline">politique cookies</Link>{" · "}
            <Link href="/mentions-legales" className="font-medium text-emerald-700 hover:underline">mentions légales</Link>
            {" · "}
            <Link href="/signaler-contenu-illicite" className="font-medium text-emerald-700 hover:underline">notification de contenu</Link>
          </p>
        </section>
        </CmmSectionGroup>
      </div>
      </CmmPageLayout>
    </main>
  );
}
