import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { LegalAccordion } from "./legal-accordion";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation de CleanMyMap : accès au service, contributions, modération, données personnelles et responsabilité.",
  keywords: [
    "conditions d'utilisation",
    "CGU",
    "CleanMyMap",
    "modération",
    "propriété intellectuelle",
  ],
  alternates: {
    canonical: "/conditions-generales-utilisation",
  },
};

const legalLinkClass =
  "font-medium text-emerald-700 hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

type LegalSection = {
  number: number;
  title: string;
  content: ReactNode;
};

const legalSections: LegalSection[] = [
  {
    number: 1,
    title: "Objet et acceptation",
    content: (
      <p className="cmm-text-body">
        Ces CGU décrivent l&apos;accès à CleanMyMap, les contributions des
        utilisateurs, les règles d&apos;usage et le traitement des contenus
        signalés. Le service peut évoluer, être temporairement indisponible
        ou nécessiter une maintenance.
      </p>
    ),
  },
  {
    number: 2,
    title: "Accès et compte",
    content: (
      <div className="space-y-4">
        <ul className="cmm-text-body space-y-3">
          {[
            "Le service est accessible gratuitement, sous réserve de disponibilité.",
            "Certaines fonctions nécessitent un compte authentifié géré par Clerk.",
            "L'utilisateur fournit des informations exactes lorsqu'un parcours les demande.",
            "Les moyens d'accès placés sous son contrôle doivent rester confidentiels.",
            "Ces CGU ne fixent pas de seuil d'âge général non imposé par un contrôle effectivement déployé.",
            <>
              CleanMyMap ne promet ni compte unique par personne ni fusion automatique
              de comptes. En cas de difficulté, utilisez le{" "}
              <Link href="/contact" className={legalLinkClass}>formulaire de contact</Link>.
            </>,
          ].map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    number: 3,
    title: "Fonctionnalités proposées",
    content: (
      <div className="space-y-4">
        <ul className="cmm-text-body list-disc space-y-2 pl-5">
          <li>Carte, signalements de pollution ou de lieux propres et déclarations d&apos;actions.</li>
          <li>Rapports, statistiques et estimations d&apos;impact selon les données disponibles.</li>
          <li>Événements communautaires, messagerie et coordination entre utilisateurs.</li>
          <li>Liens d&apos;invitation, parrainage, newsletter et formulaires lorsqu&apos;ils sont proposés.</li>
          <li>Exports ou justificatifs générés par les parcours qui les proposent.</li>
        </ul>
        <p className="cmm-text-body">
          Les statistiques et exports dépendent des données déclarées et ne
          constituent ni une certification scientifique ni une garantie de
          résultat environnemental.
        </p>
      </div>
    ),
  },
  {
    number: 4,
    title: "Règles d’usage",
    content: (
      <ul className="cmm-text-body list-disc space-y-2 pl-5">
        <li>Respecter les lois, les présentes CGU, les personnes et les droits des tiers.</li>
        <li>Ne pas publier de contenu faux, trompeur, illicite, haineux, diffamatoire ou abusif.</li>
        <li>Ne pas publier les données personnelles d&apos;autrui sans base légitime.</li>
        <li>Ne pas usurper une identité, manipuler une action ou détourner un mécanisme d&apos;invitation.</li>
        <li>Ne pas envoyer de spam, fichier malveillant, ni tenter de contourner les protections.</li>
      </ul>
    ),
  },
  {
    number: 5,
    title: "Contributions et propriété",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          Les contributions restent la propriété de leurs auteurs. Leur auteur
          accorde à CleanMyMap une licence non exclusive, limitée aux besoins
          du service, pour les héberger, les reproduire techniquement, les
          afficher, les adapter au format technique, les modérer et maintenir
          leur historique ou publication selon les paramètres et règles
          applicables, notamment sous une forme anonymisée ou agrégée.
        </p>
        <p>
          Cette licence limitée ne transfère pas la propriété des contributions
          à CleanMyMap et ne transforme pas les contenus utilisateurs en code
          AGPL. Le code du produit relève de la licence logicielle indiquée
          dans la section « Données, licences et cookies ».
        </p>
      </div>
    ),
  },
  {
    number: 6,
    title: "Contributions financières via Stripe",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          CleanMyMap propose un soutien volontaire au projet. La contribution
          peut être orientée vers la catégorie choisie sur la page de financement :
          matériel et logistique des actions terrain, ou développement et
          fonctionnement du service. Elle ne donne aucun pouvoir sur la modération,
          les décisions éditoriales ou les règles de la plateforme.
        </p>
        <p>
          Le paiement est réalisé sur une page Checkout hébergée par Stripe. Les
          données de carte sont saisies et traitées par Stripe ; elles ne sont pas
          stockées par CleanMyMap. Le reçu ou la confirmation délivré par Stripe,
          lorsqu&apos;il est disponible, atteste le traitement du paiement mais ne
          constitue pas un reçu fiscal. CleanMyMap n&apos;annonce aucune réduction
          fiscale et ne présente pas ces versements comme du mécénat fiscal.
        </p>
        <p>
          Le runtime ne propose pas de bouton de remboursement automatisé. Une
          demande peut être adressée via le{" "}
          <Link href="/contact" className={legalLinkClass}>formulaire de contact</Link>.
          Elle est examinée selon les circonstances et les possibilités applicables.
          Lorsqu&apos;un remboursement est effectivement réalisé dans Stripe, sa
          prise en compte technique met à jour le montant net publié après réception
          du webhook correspondant.
        </p>
      </div>
    ),
  },
  {
    number: 7,
    title: "Notification et modération",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          Une notification électronique circonstanciée peut être adressée via
          le{" "}
          <Link href="/signaler-contenu-illicite" className={legalLinkClass}>
            formulaire de signalement de contenu illicite
          </Link>
          . Elle demande l&apos;URL exacte, un motif détaillé et une confirmation
          de bonne foi, sans exiger de compte ni de qualification juridique
          parfaite.
        </p>
        <p>
          Le cycle réel est : notification reçue, décision sur la légalité ou
          les CGU, éventuelle mutation si une capacité canonique le permet,
          audit administratif, puis notifications lorsque les coordonnées sont
          disponibles. Les décisions disponibles sont reviewing, no_action,
          content_restricted, content_removed et closed. Aucune sanction,
          action sur compte, voie de recours, médiateur ou organisme externe
          n&apos;est promis sans capacité effectivement déployée.
        </p>
      </div>
    ),
  },
  {
    number: 8,
    title: "Terrain et sécurité",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          Une action créée par un utilisateur, un groupe ou un organisateur
          tiers n&apos;est pas, du seul fait de sa présence sur CleanMyMap,
          organisée, encadrée ou couverte par CleanMyMap. Les consignes, le
          matériel, l&apos;assurance éventuelle et les personnes responsables
          doivent être vérifiés auprès de l&apos;organisateur concerné.
        </p>
        <p>
          CleanMyMap n&apos;organise pas actuellement de dispositif terrain
          présenté comme officiel par ces CGU. Toute participation doit se
          faire avec prudence, dans des lieux accessibles et conformément aux
          règles locales.
        </p>
      </div>
    ),
  },
  {
    number: 9,
    title: "Responsabilité et disponibilité",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          Les informations et contenus sont fournis dans l&apos;état où ils sont
          disponibles. CleanMyMap ne garantit ni leur exhaustivité, ni leur
          exactitude permanente, ni l&apos;absence d&apos;interruption.
        </p>
        <p>
          Chaque utilisateur reste responsable de ses déclarations, contenus,
          messages, identifiants et décisions de terrain. Ces règles
          s&apos;appliquent dans les limites permises par la loi et ne privent
          personne de ses droits impératifs.
        </p>
      </div>
    ),
  },
  {
    number: 10,
    title: "Données, licences et cookies",
    content: (
      <div className="cmm-text-body space-y-4">
        <p>
          Consultez la{" "}
          <Link href="/politique-confidentialite" className={legalLinkClass}>Politique de confidentialité</Link>
          {" "}pour les traitements de données et la{" "}
          <Link href="/politique-cookies" className={legalLinkClass}>Politique cookies</Link>
          {" "}pour les préférences et le consentement analytics. Pour une
          demande, utilisez le{" "}
          <Link href="/contact" className={legalLinkClass}>contact</Link>.
        </p>
        <p>
          Le code source propre à CleanMyMap destiné au produit est distribué
          sous GNU Affero General Public License v3.0, SPDX{" "}
          <code>AGPL-3.0-only</code>. Le texte complet est publié dans le{" "}
          <a
            href="https://github.com/maxd4/CleanMyMap/blob/main/LICENSE"
            className={legalLinkClass}
          >
            fichier LICENSE
          </a>
          . Cette licence concerne le code du logiciel et ne s&apos;étend pas
          automatiquement aux données tierces, aux données personnelles, aux
          contenus utilisateurs, aux photos ou aux éléments de marque.
        </p>
        <p>
          Les données CleanMyMap ne sont pas toutes des données ouvertes :
          une licence ouverte est définie uniquement pour un jeu de données
          explicitement publié à cette fin. Le nom CleanMyMap, le logo et
          l&apos;identité visuelle restent réservés ; la licence du logiciel
          n&apos;autorise pas à présenter un fork ou un service tiers comme la
          version officielle de CleanMyMap.
        </p>
      </div>
    ),
  },
  {
    number: 11,
    title: "Modification et droit applicable",
    content: (
      <p className="cmm-text-body">
        CleanMyMap peut modifier ces CGU pour suivre l&apos;évolution du
        produit, du droit ou de la sécurité. La version publiée indique sa
        date de mise à jour. Le droit français s&apos;applique, sous réserve
        des règles impératives de compétence.
      </p>
    ),
  },
];

export default function ConditionsGeneralesUtilisationPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_56%,#eef2f7_100%)]">
      <CmmPageLayout>
      <div className="rounded-[1.75rem] border border-slate-200/90 bg-white/95 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] sm:p-9 lg:p-10">
        <CmmSectionGroup>
        <PageHeader
          tone="slate"
          title="Conditions générales d&apos;utilisation"
          subtitle="Règles d&apos;accès, de contribution et de modération du service CleanMyMap."
          action={
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <CalendarDays className="h-4 w-4 text-slate-600" aria-hidden="true" />
              Dernière mise à jour : 20 septembre 2026
            </span>
          }
        />

        <section className="space-y-2" aria-label="Sections des conditions générales d'utilisation">
          {legalSections.map((section) => (
            <LegalAccordion
              key={section.number}
              title={section.title}
            >
              {section.content}
            </LegalAccordion>
          ))}
        </section>

        <section className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Mail className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Contact</h2>
            <p className="cmm-text-body mt-1">
              Questions juridiques :{" "}
              <a href={"mailto:" + contactEmail} className={legalLinkClass}>{contactEmail}</a>
              {" "}ou le <Link href="/contact" className={legalLinkClass}>formulaire de contact</Link>.
            </p>
          </div>
        </section>
        </CmmSectionGroup>
      </div>
      </CmmPageLayout>
    </div>
  );
}
