import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Shield } from "lucide-react";
import { RgpdRequestForm } from "@/components/sections/rubriques/rgpd-request-form";
import { CmmButton } from "@/components/ui/cmm-button";
import { resolvePublicContactEmail } from "@/lib/email-config";

export const metadata: Metadata = {
  title: "Contact - CleanMyMap",
  description:
    "Contactez CleanMyMap pour les demandes générales, juridiques ou RGPD. Adresse officielle et formulaire public de contact.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-slate-300/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-sky-300/12 blur-3xl" />
      </div>
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>

      <div className="space-y-10 rounded-[2.5rem] border border-slate-200/70 bg-white/82 p-6 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:p-10">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Contact
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Contactez CleanMyMap
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Pour les demandes générales, juridiques ou liées aux données,
            utilisez l'adresse officielle ou le formulaire ci-dessous.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/70 bg-white/82 p-5 shadow-[0_14px_40px_-40px_rgba(15,23,42,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Adresse officielle
                </p>
                <h2 className="text-xl font-bold text-slate-950">
                  {contactEmail}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Cette adresse sert pour les réponses et le support. Les retours
              produit plus détaillés restent accessibles dans la rubrique
              feedback après connexion.
            </p>
            <div className="mt-4">
              <CmmButton
                href={`mailto:${contactEmail}`}
                tone="primary"
                variant="pill"
                className="px-4 py-2"
              >
                <Mail className="h-4 w-4" />
                Écrire un mail
              </CmmButton>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/82 p-5 shadow-[0_14px_40px_-40px_rgba(15,23,42,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Formulaire public
                </p>
                <h2 className="text-xl font-bold text-slate-950">
                  Demandes RGPD et support
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Remplissez le formulaire pour générer un email pré-rempli vers
              l'adresse officielle.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <Shield className="h-4 w-4 text-sky-600" />
              Réponse via votre client mail
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/82 p-5 shadow-[0_14px_40px_-40px_rgba(15,23,42,0.28)]">
          <h2 className="text-2xl font-bold text-slate-950">
            Formulaire de contact
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Utilisez ce formulaire pour une demande RGPD, un support ou une
            question générale. Le bouton ouvre votre client de messagerie avec
            les informations préremplies.
          </p>
          <RgpdRequestForm />
        </section>
      </div>
    </main>
  );
}
