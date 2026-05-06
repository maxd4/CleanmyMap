"use client";

import Link from "next/link";
import { AlertTriangle, Building2, Cookie, FileText, Scale, Shield, Users, ArrowRight } from "lucide-react";
import type { ElementType } from "react";

type LegalCard = {
  id: string;
  icon: ElementType;
  title: string;
  summary: string;
  href?: string;
  cta?: string;
};

const LEGAL_CARDS: LegalCard[] = [
  {
    id: "mentions",
    icon: FileText,
    title: "Mentions légales",
    summary:
      "Éditeur, hébergement, propriété intellectuelle et point de contact officiel.",
    href: "/mentions-legales",
    cta: "Ouvrir",
  },
  {
    id: "cgu",
    icon: Scale,
    title: "Conditions d'utilisation",
    summary:
      "Accès au service, création de compte, règles d'usage, modération et responsabilité.",
    href: "/conditions-generales-utilisation",
    cta: "Lire les CGU",
  },
  {
    id: "confidentialite",
    icon: Shield,
    title: "Confidentialité (RGPD)",
    summary:
      "Détail des données collectées, bases légales, conservation, transferts et droits.",
    href: "/politique-confidentialite",
    cta: "Voir la politique",
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Politique cookies",
    summary:
      "Consentement, cookie de session, préférences locales et analytics conditionnés.",
    href: "/politique-cookies",
    cta: "Gérer les cookies",
  },
  {
    id: "benevoles",
    icon: Users,
    title: "Charte du bénévole",
    summary:
      "Engagements terrain, sécurité, bonne conduite et cadre de participation aux actions.",
  },
  {
    id: "responsabilite",
    icon: AlertTriangle,
    title: "Clause de responsabilité",
    summary:
      "Les informations sont fournies en l'état et les statistiques restent des estimations.",
  },
  {
    id: "propriete",
    icon: Building2,
    title: "Propriété intellectuelle",
    summary:
      "Le code, les visuels et les textes du service restent protégés par le droit d'auteur.",
  },
];

export function LegalSection() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/10">
          <Building2 size={24} className="text-slate-700" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight cmm-text-primary">
            Informations juridiques
          </h3>
          <p className="text-sm text-slate-500">
            Pages légales détaillées, conformité RGPD et accès rapide aux règles du service
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEGAL_CARDS.map((card) => {
          const Icon = card.icon;
          const content = (
            <article className="flex h-full flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/60">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Icon size={18} className="text-slate-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold cmm-text-primary">{card.title}</h4>
                  <p className="mt-2 text-sm leading-6 cmm-text-secondary">
                    {card.summary}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {card.href ? (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    {card.cta ?? "Ouvrir"}
                    <ArrowRight size={14} />
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">
                    Information de contexte
                  </span>
                )}
              </div>
            </article>
          );

          return card.href ? (
            <Link key={card.id} href={card.href} className="block h-full">
              {content}
            </Link>
          ) : (
            <div key={card.id} className="h-full">
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">
          Exercer vos droits RGPD ou poser une question sur vos données :
          {" "}
          <Link href="/politique-confidentialite" className="font-semibold underline-offset-2 hover:underline">
            consulter la politique de confidentialité
          </Link>
          {" "}
          ou écrire à{" "}
          <a href="mailto:maxence.drm@gmail.com" className="font-semibold underline-offset-2 hover:underline">
            maxence.drm@gmail.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
