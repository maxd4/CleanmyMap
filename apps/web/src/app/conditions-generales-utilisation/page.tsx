import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { resolvePublicContactEmail } from "@/lib/email-config";

export const metadata: Metadata = {
  title: "Conditions d'utilisation - CleanMyMap",
  description:
    "Conditions d'utilisation de CleanMyMap : accès au service, création de compte, règles d'usage, modération, propriété intellectuelle et responsabilité.",
  keywords: [
    "conditions d'utilisation",
    "CGU",
    "CleanMyMap",
    "modération",
    "responsabilité",
    "propriété intellectuelle",
  ],
  alternates: {
    canonical: "/conditions-generales-utilisation",
  },
};

export default function ConditionsGeneralesUtilisationPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <PageHeader
          tone="slate"
          badge={<PageHeaderBadge tone="slate">Conditions d'utilisation</PageHeaderBadge>}
          title="Conditions Générales d'Utilisation"
          subtitle="Règles d'accès et d'utilisation du service CleanMyMap. Ce texte complète la Politique de confidentialité et la Politique cookies."
          action={<p className="text-sm font-medium text-slate-500">Dernière mise à jour : 5 mai 2026</p>}
        />

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">1. Objet</h2>
          <p className="text-sm leading-6 text-slate-600">
            Les présentes CGU définissent les conditions d&apos;accès, de
            navigation, de contribution et de modération de la plateforme
            CleanMyMap.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            2. Accès au service et création de compte
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Le service est accessible gratuitement, sous réserve de disponibilité.</li>
            <li>Certaines actions nécessitent un compte Clerk connecté.</li>
            <li>
              L&apos;utilisateur doit fournir des informations exactes et à jour
              lors de l&apos;inscription et de la synchronisation du profil.
            </li>
            <li>Chaque personne doit conserver ses identifiants de façon confidentielle.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            3. Services proposés
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Signalement d&apos;un point de pollution ou d&apos;un lieu propre.</li>
            <li>Déclaration d&apos;une action de nettoyage.</li>
            <li>Carte, observatoire, rapports et tableaux de bord d&apos;impact.</li>
            <li>Événements communautaires, messagerie et coordination locale.</li>
            <li>Newsletter et formulaires d&apos;échange avec l&apos;équipe.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            4. Règles d&apos;usage
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Respecter les lois applicables et les autres utilisateurs.</li>
            <li>Ne pas publier de contenu illicite, haineux, trompeur ou abusif.</li>
            <li>Ne pas tenter d&apos;extraire massivement les données ou de contourner les protections.</li>
            <li>Ne pas détourner le service à des fins commerciales non autorisées.</li>
            <li>Ne pas diffuser de fichiers malveillants, de spam ou de contenu non sollicité.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            5. Contenus publiés et modération
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Les contenus déposés par les utilisateurs peuvent être modérés,
            masqués, corrigés, anonymisés ou supprimés en cas de non-respect des
            règles, de besoin légal, de signalement pertinent ou de risque pour la
            sécurité du service.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Lorsque l&apos;historique public doit être conservé pour l&apos;intérêt
            collectif, les contenus peuvent être anonymisés ou agrégés.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            6. Responsabilité
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Les informations affichées sont fournies “en l&apos;état”.</li>
            <li>Les statistiques et estimations peuvent contenir une marge d&apos;incertitude.</li>
            <li>
              L&apos;utilisateur reste responsable de ses déclarations, de ses
              messages et de ses contributions.
            </li>
            <li>
              CleanMyMap ne contrôle pas le contenu des sites ou services tiers
              liés depuis la plateforme.
            </li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            7. Propriété intellectuelle
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Les éléments du site, le code, les interfaces, les logos et les textes
            sont protégés. Les contenus soumis par les utilisateurs restent la
            propriété de leurs auteurs, sous réserve de la licence nécessaire au
            fonctionnement du service.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            8. Données personnelles et cookies
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Les données personnelles sont décrites dans la{" "}
            <Link
              href="/politique-confidentialite"
              className="font-medium text-emerald-700 hover:underline"
            >
              Politique de confidentialité
            </Link>
            . Les traceurs et préférences sont décrits dans la{" "}
            <Link
              href="/politique-cookies"
              className="font-medium text-emerald-700 hover:underline"
            >
              Politique cookies
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            9. Modification des CGU et droit applicable
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            CleanMyMap peut faire évoluer les présentes conditions pour tenir
            compte du produit, du droit applicable ou des besoins de sécurité.
            Le droit français s&apos;applique et les juridictions françaises sont
            compétentes.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">Contact</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Questions juridiques :{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-emerald-700 hover:underline"
            >
              {contactEmail}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
