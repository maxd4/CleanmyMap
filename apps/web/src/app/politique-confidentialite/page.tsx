import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RgpdRequestForm } from "@/components/sections/rubriques/rgpd-request-form";

export const metadata: Metadata = {
  title: "Politique de confidentialité - CleanMyMap",
  description:
    "Politique de confidentialité CleanMyMap : données collectées, finalités, bases légales, droits RGPD, sous-traitants, rétention et sécurité.",
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
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <header className="space-y-4">
          <Pill>RGPD</Pill>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Politique de confidentialité
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Cette page décrit précisément les données collectées par le produit
            CleanMyMap, les finalités, les sous-traitants, les durées de
            conservation et les droits des utilisateurs européens.
          </p>
          <p className="text-sm font-medium text-slate-500">
            Dernière mise à jour : 5 mai 2026
          </p>
        </header>

        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-950">
              Responsable du traitement
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              <strong>CleanMyMap</strong> - contact :{" "}
              <a
                href="mailto:maxence.drm@gmail.com"
                className="font-medium text-emerald-700 hover:underline"
              >
                maxence.drm@gmail.com
              </a>
              . Le point de contact RGPD est la même adresse email.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-950">
              Principe appliqué
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Nous limitons les traitements aux données utiles au service,
              documentons les finalités et activons les services analytiques
              uniquement après consentement.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Données collectées</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              1. Compte, authentification et profil
            </h2>
          </div>
          <DataList
            items={[
              "Identifiant Clerk (`userId`).",
              "Prénom, nom, pseudo / username, nom d'affichage.",
              "Adresse email principale et, si fournie par l'utilisateur, numéro de téléphone.",
              "Image de profil / avatar.",
              "Métadonnées de compte : rôle / profil public ou privé, badges, niveau de progression, arrondissement Paris éventuellement renseigné.",
              "Cookies de session Clerk nécessaires à l'authentification et à la sécurité.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Actions</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              2. Signalements, actions de nettoyage et lieux propres
            </h2>
          </div>
          <DataList
            items={[
              "Nom de l'acteur (`actorName`) et, le cas échéant, nom d'association (`associationName`).",
              "Type d'enregistrement (`action`, `clean_place`, `spot`) et type de lieu (`placeType`).",
              "Date de l'action / date d'observation.",
              "Libellé du lieu (`locationLabel`) et coordonnées GPS (`latitude`, `longitude`) lorsqu'elles sont saisies.",
              "Point de départ / d'arrivée, style d'itinéraire et message d'ajustement éventuel.",
              "Poids collecté (`wasteKg`), mégots (`cigaretteButts`), nombre de bénévoles, durée, notes, mode de soumission, répartition des déchets, estimation visuelle, dessin manuel (polyligne/polygone) et coordonnées associées.",
              "Photos déposées : nom du fichier, type MIME, taille, dimensions et contenu image encodé.",
              "Métadonnées utilisateur techniques utilisées pour consolider l'enregistrement (`userId`, `username`, `displayName`, `email`).",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Communauté</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              3. Événements, RSVP, messagerie et coordination
            </h2>
          </div>
          <DataList
            items={[
              "Événements communautaires : titre, date, lieu, description, capacité cible et identité de l'organisateur.",
              "RSVP / participation : statut de réponse et identifiant du participant.",
              "Messages privés et territoriaux : contenu du message, destinataire, arrondissement, zone, pièce jointe facultative et type de pièce jointe.",
              "Messages de bug / feedback : type de retour, titre, description, page concernée, source d'envoi, nom d'affichage, email et rôle.",
              "Demandes de promotion : rôle demandé et motivation, plus les coordonnées de profil visibles par l'utilisateur.",
              "Demandes d'onboarding partenaires : nom de l'organisation, type, identité légale, zones couvertes, quartiers, types de contribution, disponibilités, personne de contact et motivation.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Préférences</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              4. Préférences, cookies et analytics
            </h2>
          </div>
          <DataList
            items={[
              "Préférences d'interface : langue, thème et mode d'affichage.",
              "Le choix de consentement est mémorisé dans `localStorage` et reflété par un cookie technique côté navigateur pour permettre l'application de la préférence aux requêtes serveur.",
              "Les préférences `cleanmymap.locale` et `cleanmymap.display_mode` sont écrites dans `localStorage` et reflétées dans des cookies SameSite=Lax lorsqu'elles sont actives.",
              "Analytics PostHog, Vercel Analytics et Vercel Speed Insights sont déclenchés uniquement si l'utilisateur accepte les cookies analytiques.",
              "PostHog est configuré sur l'hôte UE par défaut via `eu.i.posthog.com`.",
              "Si Sentry est activé, les erreurs techniques peuvent inclure des traces, messages console et métadonnées de requêtes, avec un masquage par défaut des informations sensibles selon la configuration du SDK.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Sécurité</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              5. Finalités et bases légales
            </h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Finalité</th>
                  <th className="px-4 py-3 font-semibold">Base légale</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Création / gestion de compte</td>
                  <td className="px-4 py-3">Exécution du service + intérêt légitime de sécurité</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Signalement, actions, événements, messagerie</td>
                  <td className="px-4 py-3">Exécution du service</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Newsletter et communications non essentielles</td>
                  <td className="px-4 py-3">Consentement</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Cookies analytiques et mesure d&apos;audience</td>
                  <td className="px-4 py-3">Consentement</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Journalisation, anti-fraude, prévention des abus</td>
                  <td className="px-4 py-3">Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Destinataires</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              6. Sous-traitants et destinataires
            </h2>
          </div>
          <DataList
            items={[
              "Clerk : identité, authentification, cookies de session et métadonnées de compte.",
              "Supabase : base de données, stockage et synchronisation métier.",
              "Resend : envoi d'emails transactionnels et de notification.",
              "PostHog : analytics si et seulement si le consentement est donné.",
              "Vercel Analytics et Speed Insights : mesure d'audience et performance avec consentement.",
              "Sentry : erreurs techniques uniquement si la variable d'environnement d'activation est présente et si une DSN est configurée.",
              "Autorités compétentes : uniquement lorsque la loi l'exige.",
            ]}
          />
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Transferts</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              7. Transferts hors de l&apos;Union européenne
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Certains prestataires peuvent traiter des données hors de l&apos;UE selon
            leur architecture et la configuration du projet. Nous privilégions les
            paramètres européens lorsque c&apos;est possible et nous nous appuyons
            sur les garanties contractuelles des fournisseurs.
          </p>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Rétention</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              8. Durée de conservation
            </h2>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Compte utilisateur / profil</td>
                  <td className="px-4 py-3">Pendant la vie du compte puis jusqu&apos;à 30 jours après suppression, sauf obligation légale</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Contributions publiques / historiques</td>
                  <td className="px-4 py-3">Tant que le service les exploite, avec anonymisation ou suppression sur demande lorsque possible</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Newsletter</td>
                  <td className="px-4 py-3">Jusqu&apos;au désabonnement</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Consentement cookies / préférences</td>
                  <td className="px-4 py-3">1 an pour le consentement, 13 mois max pour les cookies analytiques, selon le service</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Journaux techniques / sécurité</td>
                  <td className="px-4 py-3">Période strictement nécessaire à la sécurité et au diagnostic</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Pill>Droits</Pill>
            <h2 className="text-2xl font-bold text-slate-950">
              9. Vos droits RGPD
            </h2>
          </div>
          <DataList
            items={[
              "Droit d'accès, de rectification, d'effacement et de limitation.",
              "Droit d'opposition et droit à la portabilité.",
              "Droit de retirer votre consentement à tout moment pour les traitements fondés sur le consentement.",
              "Droit d'introduire une réclamation auprès de la CNIL.",
            ]}
          />
        </section>

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-2xl font-bold text-slate-950">
            10. Exercer vos droits
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Utilisez le formulaire ci-dessous pour nous envoyer une demande
            d&apos;accès, de rectification, d&apos;effacement ou de portabilité. Vous
            pouvez aussi écrire directement à{" "}
            <a
              href="mailto:maxence.drm@gmail.com"
              className="font-medium text-emerald-700 hover:underline"
            >
              maxence.drm@gmail.com
            </a>
            .
          </p>
          <RgpdRequestForm />
          <p className="text-xs text-slate-500">
            Délai de réponse : 1 mois, prolongeable de 2 mois en cas de demande
            complexe.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">11. Sécurité</h2>
          <DataList
            items={[
              "Chiffrement en transit quand le fournisseur l'expose.",
              "Accès restreint aux données côté administrateur.",
              "Journalisation des opérations sensibles et des erreurs.",
              "Pratique de minimisation : seules les données utiles au service sont demandées.",
            ]}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">Contact et support</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Questions RGPD, support ou exercice de droits :{" "}
            <a
              href="mailto:maxence.drm@gmail.com"
              className="font-medium text-emerald-700 hover:underline"
            >
              maxence.drm@gmail.com
            </a>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Documents associés :{" "}
            <Link
              href="/conditions-generales-utilisation"
              className="font-medium text-emerald-700 hover:underline"
            >
              CGU
            </Link>
            {" · "}
            <Link
              href="/politique-cookies"
              className="font-medium text-emerald-700 hover:underline"
            >
              politique cookies
            </Link>
            {" · "}
            <Link
              href="/mentions-legales"
              className="font-medium text-emerald-700 hover:underline"
            >
              mentions légales
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
