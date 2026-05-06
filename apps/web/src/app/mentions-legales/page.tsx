import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales - CleanMyMap",
  description:
    "Mentions légales de CleanMyMap, avec accès direct aux Conditions d'utilisation, à la Politique de confidentialité et à la Politique cookies.",
  keywords: [
    "mentions légales",
    "politique confidentialité",
    "conditions utilisation",
    "protection données",
    "RGPD",
    "CleanMyMap",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/mentions-legales",
  },
};

export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            Cadre juridique
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Mentions légales
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Point d&apos;entrée unique vers les documents juridiques de CleanMyMap.
            Les pages détaillées sont séparées pour éviter les doublons et garder
            la conformité lisible.
          </p>
          <p className="text-sm font-medium text-slate-500">
            Dernière mise à jour : 5 mai 2026
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/conditions-generales-utilisation"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/70"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              CGU
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Conditions d&apos;utilisation
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Règles d&apos;accès, usage autorisé, contenu utilisateur, modération,
              responsabilité et droit applicable.
            </p>
          </Link>

          <Link
            href="/politique-confidentialite"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/70"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              RGPD
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Politique de confidentialité
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Détail des données collectées, bases légales, transferts, durées de
              conservation et exercice des droits.
            </p>
          </Link>

          <Link
            href="/politique-cookies"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/70"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Cookies
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Politique cookies
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Consentement, cookie de session, préférences locales et services
              analytiques conditionnés au choix de l&apos;utilisateur.
            </p>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Contact
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Demandes juridiques
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pour toute demande RGPD ou question juridique, contactez{" "}
              <a
                href="mailto:maxence.drm@gmail.com"
                className="font-medium text-emerald-700 hover:underline"
              >
                maxence.drm@gmail.com
              </a>
              .
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Éditeur du site</h2>
          <div className="space-y-2 text-sm leading-6 text-slate-600">
            <p>
              <strong>CleanMyMap</strong> est une plateforme citoyenne de
              dépollution urbaine et d&apos;action écologique.
            </p>
            <p>
              Directeur de publication : Maxence Deroome
            </p>
            <p>
              Hébergement et services techniques : Vercel, Supabase, Clerk,
              Resend, PostHog et, si activé, Sentry.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Propriété intellectuelle
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Le code, les textes, les visuels, les logos et les interfaces de
            CleanMyMap sont protégés par le droit d&apos;auteur et le droit de la
            propriété intellectuelle. Toute réutilisation au-delà de l&apos;usage
            normal du service doit être autorisée.
          </p>
        </section>
      </div>
    </main>
  );
}
