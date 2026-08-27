import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { resolvePublicContactEmail } from "@/lib/email-config";

export const metadata: Metadata = {
  title: "Conditions d'utilisation - CleanMyMap",
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

const legalLinkClass = "font-medium text-emerald-700 hover:underline";

export default function ConditionsGeneralesUtilisationPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <PageHeader
          tone="slate"
          badge={<PageHeaderBadge tone="slate">Conditions d&apos;utilisation</PageHeaderBadge>}
          title="Conditions Générales d&apos;Utilisation"
          subtitle="Règles d'accès, de contribution et de modération du service CleanMyMap."
          action={<p className="text-sm font-medium text-slate-500">Dernière mise à jour : 27 août 2026</p>}
        />

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">1. Objet et acceptation</h2>
          <p className="text-sm leading-6 text-slate-600">
            Ces CGU décrivent l&apos;accès à CleanMyMap, les contributions des
            utilisateurs, les règles d&apos;usage et le traitement des contenus
            signalés. Le service peut évoluer, être temporairement indisponible
            ou nécessiter une maintenance.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">2. Accès et compte</h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Le service est accessible gratuitement, sous réserve de disponibilité.</li>
            <li>Certaines fonctions nécessitent un compte authentifié géré par Clerk.</li>
            <li>L&apos;utilisateur fournit des informations exactes lorsqu&apos;un parcours les demande.</li>
            <li>Les moyens d&apos;accès placés sous son contrôle doivent rester confidentiels.</li>
            <li>Ces CGU ne fixent pas de seuil d&apos;âge général non imposé par un contrôle effectivement déployé.</li>
          </ul>
          <p className="text-sm leading-6 text-slate-600">
            CleanMyMap ne promet ni compte unique par personne ni fusion automatique
            de comptes. En cas de difficulté, utilisez le{" "}
            <Link href="/contact" className={legalLinkClass}>contact</Link>.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">3. Fonctionnalités proposées</h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Carte, signalements de pollution ou de lieux propres et déclarations d&apos;actions.</li>
            <li>Rapports, statistiques et estimations d&apos;impact selon les données disponibles.</li>
            <li>Événements communautaires, messagerie et coordination entre utilisateurs.</li>
            <li>Liens d&apos;invitation, parrainage, newsletter et formulaires lorsqu&apos;ils sont proposés.</li>
            <li>Exports ou justificatifs générés par les parcours qui les proposent.</li>
          </ul>
          <p className="text-sm leading-6 text-slate-600">
            Les statistiques et exports dépendent des données déclarées et ne
            constituent ni une certification scientifique ni une garantie de
            résultat environnemental.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">4. Règles d&apos;usage</h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Respecter les lois, les présentes CGU, les personnes et les droits des tiers.</li>
            <li>Ne pas publier de contenu faux, trompeur, illicite, haineux, diffamatoire ou abusif.</li>
            <li>Ne pas publier les données personnelles d&apos;autrui sans base légitime.</li>
            <li>Ne pas usurper une identité, manipuler une action ou détourner un mécanisme d&apos;invitation.</li>
            <li>Ne pas envoyer de spam, fichier malveillant, ni tenter de contourner les protections.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">5. Contributions et propriété</h2>
          <p className="text-sm leading-6 text-slate-600">
            Les contributions restent la propriété de leurs auteurs. Leur auteur
            accorde à CleanMyMap une licence non exclusive, limitée aux besoins
            du service, pour les héberger, les reproduire techniquement, les
            afficher, les adapter au format technique, les modérer et maintenir
            leur historique ou publication selon les paramètres et règles
            applicables, notamment sous une forme anonymisée ou agrégée.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Cette licence ne transfère pas la propriété à CleanMyMap. Le code
            source est publiquement visible, mais aucune licence de réutilisation
            définitive n&apos;est publiée à ce jour.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">6. Notification et modération</h2>
          <p className="text-sm leading-6 text-slate-600">
            Une notification électronique circonstanciée peut être adressée via
            le{" "}
            <Link href="/signaler-contenu-illicite" className={legalLinkClass}>
              formulaire de signalement de contenu illicite
            </Link>
            . Elle demande l&apos;URL exacte, un motif détaillé et une confirmation
            de bonne foi, sans exiger de compte ni de qualification juridique
            parfaite.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Le cycle réel est : notification reçue, décision sur la légalité ou
            les CGU, éventuelle mutation si une capacité canonique le permet,
            audit administratif, puis notifications lorsque les coordonnées sont
            disponibles. Les décisions disponibles sont reviewing, no_action,
            content_restricted, content_removed et closed. Aucune sanction,
            action sur compte, voie de recours, médiateur ou organisme externe
            n&apos;est promis sans capacité effectivement déployée.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">7. Terrain et sécurité</h2>
          <p className="text-sm leading-6 text-slate-600">
            Une action créée par un utilisateur, un groupe ou un organisateur
            tiers n&apos;est pas, du seul fait de sa présence sur CleanMyMap,
            organisée, encadrée ou couverte par CleanMyMap. Les consignes, le
            matériel, l&apos;assurance éventuelle et les personnes responsables
            doivent être vérifiés auprès de l&apos;organisateur concerné.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            CleanMyMap n&apos;organise pas actuellement de dispositif terrain
            présenté comme officiel par ces CGU. Toute participation doit se
            faire avec prudence, dans des lieux accessibles et conformément aux
            règles locales.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">8. Responsabilité et disponibilité</h2>
          <p className="text-sm leading-6 text-slate-600">
            Les informations et contenus sont fournis dans l&apos;état où ils sont
            disponibles. CleanMyMap ne garantit ni leur exhaustivité, ni leur
            exactitude permanente, ni l&apos;absence d&apos;interruption.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Chaque utilisateur reste responsable de ses déclarations, contenus,
            messages, identifiants et décisions de terrain. Ces règles
            s&apos;appliquent dans les limites permises par la loi et ne privent
            personne de ses droits impératifs.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">9. Données et cookies</h2>
          <p className="text-sm leading-6 text-slate-600">
            Consultez la{" "}
            <Link href="/politique-confidentialite" className={legalLinkClass}>Politique de confidentialité</Link>
            {" "}pour les traitements de données et la{" "}
            <Link href="/politique-cookies" className={legalLinkClass}>Politique cookies</Link>
            {" "}pour les préférences et le consentement analytics. Pour une
            demande, utilisez le{" "}
            <Link href="/contact" className={legalLinkClass}>contact</Link>.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">10. Modification et droit applicable</h2>
          <p className="text-sm leading-6 text-slate-600">
            CleanMyMap peut modifier ces CGU pour suivre l&apos;évolution du
            produit, du droit ou de la sécurité. La version publiée indique sa
            date de mise à jour. Le droit français s&apos;applique, sous réserve
            des règles impératives de compétence.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">Contact</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Questions juridiques :{" "}
            <a href={"mailto:" + contactEmail} className={legalLinkClass}>{contactEmail}</a>
            {" "}ou le <Link href="/contact" className={legalLinkClass}>formulaire de contact</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
