import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Politique cookies - CleanMyMap",
  description:
    "Politique cookies de CleanMyMap : cookies essentiels, préférences locales, consentement, analytics et gestion du choix utilisateur.",
  keywords: [
    "politique cookies",
    "cookies",
    "cleanmymap",
    "consentement",
    "analytics",
  ],
  alternates: {
    canonical: "/politique-cookies",
  },
};

function CookieTypeCard({
  title,
  label,
  items,
}: {
  title: string;
  label: string;
  items: string[];
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
        {label}
      </p>
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <ul className="space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PolitiqueCookiesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <PageHeader
          tone="slate"
          badge={<PageHeaderBadge tone="slate">Cookies et traceurs</PageHeaderBadge>}
          title="Politique cookies"
          subtitle="CleanMyMap utilise des cookies et du stockage local pour faire fonctionner l'application, mémoriser vos préférences et, si vous y consentez, mesurer l'usage du site."
          action={<p className="text-sm font-medium text-slate-500">Dernière mise à jour : 5 mai 2026</p>}
        />

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            1. Choix de consentement
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            La bannière de consentement propose trois choix : accepter tout,
            n&apos;autoriser que les éléments essentiels, ou refuser les
            traceurs non essentiels. Le choix est mémorisé pendant 1 an.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            La préférence est enregistrée dans <strong>localStorage</strong>{" "}
            et synchronisée avec un cookie technique{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">
              cleanmymap_analytics_consent
            </code>{" "}
            pour appliquer le choix côté navigateur et côté serveur.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <CookieTypeCard
            label="Essentiels"
            title="Cookies et stockages nécessaires"
            items={[
              "Authentification Clerk : cookies de session requis pour l'accès au compte et la sécurité.",
              "Préférences techniques du site : langue (`cleanmymap.locale`) et mode d'affichage (`cleanmymap.display_mode`).",
              "Mode d'affichage en attente de synchronisation (`cleanmymap.display_mode_pending_sync`).",
              "Consentement utilisateur enregistré pour éviter d'afficher la bannière à chaque visite.",
              "Cookie Cloudflare `_cfuvid` lorsque l'infrastructure du fournisseur le nécessite.",
            ]}
          />

          <CookieTypeCard
            label="Analytiques"
            title="Mesure d'audience et performance"
            items={[
              "PostHog, uniquement si le consentement analytique est donné et avec `respect_dnt` activé.",
              "Vercel Analytics et Vercel Speed Insights, chargés uniquement après consentement.",
              "Les mesures servent à comprendre les usages, les performances et les erreurs de navigation.",
              "Aucun cookie analytique n'est déposé avant le consentement explicite.",
            ]}
          />
        </div>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            2. Données collectées par les analytics
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Pages consultées, durée de visite et événements de navigation.</li>
            <li>Informations techniques agrégées : navigateur, appareil, taille d&apos;écran et performance.</li>
            <li>
              URL, horodatage et identifiant anonyme de session selon le fournisseur.
            </li>
            <li>
              Les événements sont destinés à l&apos;amélioration produit et à la
              correction des problèmes.
            </li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            3. Comment modifier ou retirer votre choix
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>Cliquer sur la bannière cookies si elle est à nouveau proposée.</li>
            <li>Supprimer les données locales du navigateur pour réinitialiser le consentement.</li>
            <li>
              Supprimer les clés locales mentionnées ci-dessus si vous voulez
              effacer vos préférences de site.
            </li>
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            4. Durées de conservation
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Élément</th>
                  <th className="px-4 py-3 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Consentement</td>
                  <td className="px-4 py-3">1 an</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Cookies analytiques</td>
                  <td className="px-4 py-3">13 mois maximum</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Sessions d&apos;authentification</td>
                  <td className="px-4 py-3">Durée de session ou limite du fournisseur</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">Préférences de site</td>
                  <td className="px-4 py-3">Jusqu&apos;à suppression locale par l&apos;utilisateur</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            5. Pages associées
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Pour les données personnelles et les droits RGPD, consultez la{" "}
            <Link
              href="/politique-confidentialite"
              className="font-medium text-emerald-700 hover:underline"
            >
              Politique de confidentialité
            </Link>
            . Pour le cadre général d&apos;utilisation, consultez les{" "}
            <Link
              href="/conditions-generales-utilisation"
              className="font-medium text-emerald-700 hover:underline"
            >
              CGU
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
