import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, ClipboardList, Gauge, LayoutGrid, ShieldCheck } from "lucide-react";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

export const metadata: Metadata = {
  title: "Déclaration simple - CleanMyMap",
  description:
    "Outil système autonome pour vérifier la version simplifiée du parcours de déclaration.",
  robots: {
    index: false,
    follow: false,
  },
};

const checklistItems = [
  "Limiter les champs au strict nécessaire.",
  "Garder le parcours lisible en 1 écran principal.",
  "Réduire la charge cognitive sur le terrain.",
  "Préserver les contrôles utiles pour le support interne.",
] as const;

const comparisonRows = [
  { label: "Temps cible", value: "3 à 5 min", tone: "emerald" },
  { label: "Champs visibles", value: "10", tone: "emerald" },
  { label: "Sections", value: "1", tone: "emerald" },
  { label: "But", value: "support et contrôle", tone: "slate" },
] as const;

export default function DeclarationSimplePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(220,252,231,0.68)_0%,_rgba(248,250,252,0.98)_46%,_rgba(241,245,249,1)_100%)] py-8 text-stone-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <PageHeader
          tone="emerald"
          align="center"
          badge={<PageHeaderBadge tone="emerald">Outil système</PageHeaderBadge>}
          title="Déclaration simple"
          subtitle="Point d’entrée autonome pour vérifier un parcours de déclaration allégé, sans mélanger cette vue avec le formulaire complet."
          className="mx-auto max-w-4xl"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <CmmCard tone="emerald" variant="elevated" size="lg" className="space-y-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <ClipboardList size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">
                  Contrôle interne
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">
                  Vérifier la version simplifiée
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Cette surface sert à confirmer qu’une version courte reste exploitable pour le
                  support, le contrôle qualité et la prévisualisation interne.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-[1.25rem] border border-stone-200 bg-white/85 p-4 shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">
                    {row.label}
                  </p>
                  <p className="mt-2 text-lg font-black tracking-tight text-stone-950">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-950">
                    Ce que cette page doit garder
                  </p>
                  <ul className="mt-3 space-y-2">
                    {checklistItems.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CmmCard>

          <div className="space-y-6">
            <CmmCard tone="slate" variant="elevated" size="lg" className="space-y-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                  <Gauge size={20} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                    Parcours conseillé
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-stone-950">
                    Actions rapides
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Comparer avec le formulaire complet",
                    href: "/form-comparison",
                  },
                  {
                    label: "Tester le parcours officiel",
                    href: "/actions/new",
                  },
                  {
                    label: "Prévisualiser le formulaire public",
                    href: "/preview/actions/new",
                  },
                ].map((action) => (
                  <CmmButton
                    key={action.href}
                    href={action.href}
                    tone="secondary"
                    variant="pill"
                    className="w-full justify-between px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em]"
                  >
                    <span>{action.label}</span>
                    <ArrowRight size={14} />
                  </CmmButton>
                ))}
              </div>
            </CmmCard>

            <CmmCard tone="emerald" variant="outlined" size="lg" className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-700">
                  <LayoutGrid size={18} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">
                    Structure
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-stone-950">
                    Surface de support, pas de surcharge
                  </h2>
                </div>
              </div>

              <p className="text-sm leading-6 text-stone-600">
                La route reste autonome: elle sert à documenter un flux de déclaration simplifié
                sans recopier la complexité du formulaire complet ni ajouter des contrôles
                inutiles.
              </p>
            </CmmCard>
          </div>
        </div>
      </div>
    </main>
  );
}
