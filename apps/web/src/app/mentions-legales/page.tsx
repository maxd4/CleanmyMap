import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";

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
    <main>
      <CmmPageLayout>
      {/* Navigation de retour */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <CmmSectionGroup>
        <PageHeader
          tone="slate"
          title="Mentions légales"
          subtitle="Point d'entrée unique vers les documents juridiques de CleanMyMap. Les pages détaillées restent séparées pour garder la conformité lisible."
          action={<p className="text-sm font-medium text-slate-500">Dernière mise à jour : 27 août 2026</p>}
        />

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

          <Link
            href="/contact"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/70"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Contact
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Demandes juridiques
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Accéder à la page de contact pour une demande RGPD, une question juridique ou un besoin de support.
            </p>
          </Link>

          <Link
            href="/signaler-contenu-illicite"
            className="rounded-3xl border border-amber-200 bg-amber-50 p-5 transition hover:border-amber-300 hover:bg-amber-100"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
              Notification électronique
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Signaler un contenu potentiellement illicite
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Accéder au formulaire de notification circonstanciée et retrouver les informations utiles.
            </p>
          </Link>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Édition et publication</h2>
          <div className="space-y-2 text-sm leading-6 text-slate-600">
            <p>
              <strong>CleanMyMap</strong> est actuellement édité par{" "}
              <strong>Maxence Deroome</strong>, personne physique éditant à titre
              non professionnel dans le cadre d&apos;un projet étudiant. Aucune
              société, entreprise, association ou autre personne morale
              n&apos;exploite actuellement le service.
            </p>
            <p>
              Directeur de la publication : <strong>Maxence Deroome</strong>,
              conformément à l&apos;article 93-2 de la loi du 29 juillet 1982.
            </p>
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              Les éléments personnels de l&apos;éditeur ne sont pas publiés ici.
              Le régime d&apos;anonymat prévu à l&apos;article 1-1 II de la LCEN est
              appliqué : les éléments d&apos;identification personnelle nécessaires
              ont été communiqués à Vercel et restent à sa disposition.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Hébergement</h2>
          <div className="space-y-2 text-sm leading-6 text-slate-600">
            <p><strong>Vercel Inc.</strong></p>
            <p>
              440 N Barranca Avenue #4133<br />
              Covina, CA 91723<br />
              United States
            </p>
            <p>
              Aucun numéro de téléphone général de Vercel n&apos;est publié ici. Le
              numéro figurant dans la politique DMCA de Vercel n&apos;est pas repris,
              car il concerne les notifications de copyright et ne constitue pas
              un contact général vérifié.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Services techniques</h2>
          <p className="text-sm leading-6 text-slate-600">
            Supabase (base de données et stockage), Clerk (identité et
            authentification), Resend (emails), PostHog (analytics avec
            consentement) et Sentry (observabilité et sécurité lorsqu&apos;activé)
            sont des prestataires techniques distincts. Ils ne sont pas présentés
            comme l&apos;hébergeur du site.
          </p>
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
        </CmmSectionGroup>
      </div>
      </CmmPageLayout>
    </main>
  );
}
