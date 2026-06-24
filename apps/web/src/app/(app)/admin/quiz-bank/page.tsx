import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz-question-bank";
import { buildQuizBankAdminSnapshot } from "@/lib/learning/quiz-bank-admin";
import {
  loadQuizPedagogicalMetricsSnapshot,
  summarizeQuizPedagogicalMetrics,
} from "@/lib/learning/quiz-pedagogical-metrics";
import { QuizPedagogicalMetricsPanel } from "@/components/admin/quiz-pedagogical-metrics-panel";
import { QuizBankAdminView } from "@/components/admin/quiz-bank-admin-view";

export const metadata: Metadata = {
  title: "Banque de quiz - Admin - CleanMyMap",
  description: "Vue interne pour filtrer, relire et corriger la banque de questions du quiz CleanMyMap.",
};

export default async function QuizBankAdminPage() {
  const { userId } = await getSafeAuthSession();
  const role = await getCurrentUserRoleLabel();

  if (!userId || role !== "admin") {
    notFound();
  }

  const pageFamily = resolvePageFamily("/admin/quiz-bank");
  const snapshot = buildQuizBankAdminSnapshot(QUIZ_QUESTIONS);
  const pedagogicalMetrics = await loadQuizPedagogicalMetricsSnapshot(QUIZ_QUESTIONS);
  const pedagogicalMetricsSummary = summarizeQuizPedagogicalMetrics(pedagogicalMetrics);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(248,239,228,0.95)_45%,_rgba(239,231,220,0.98)_100%)] text-stone-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(32,28,39,0.94)_0%,rgba(32,28,39,0.8)_62%,rgba(32,28,39,0)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          family={pageFamily}
          eyebrow="Administration du quiz"
          title="Banque de questions"
          subtitle="Filtrez la banque, hiérarchisez les questions à relire et contrôlez les sources avant toute mise à jour."
          badges={
            <>
              <PageHeaderBadge family={pageFamily}>Admin only</PageHeaderBadge>
              <PageHeaderBadge family={pageFamily} muted>
                Vue d&apos;audit
              </PageHeaderBadge>
            </>
          }
        />

        <div className="mt-8 space-y-8">
          <QuizPedagogicalMetricsPanel snapshot={pedagogicalMetrics} />

          <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.18)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
              RGPD & collecte
            </p>
            <p className="mt-2 max-w-4xl leading-6">
              Le tableau de bord s&apos;appuie sur des agrégats anonymes uniquement: mode, question, compétence et type d&apos;erreur. Aucun identifiant utilisateur ni réponse brute n&apos;est conservé dans cette couche.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                {pedagogicalMetricsSummary.tooEasyCount} trop faciles
              </span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                {pedagogicalMetricsSummary.tooHardCount} trop échouées
              </span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                {pedagogicalMetricsSummary.weakSkillCount} compétences fragiles
              </span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                {pedagogicalMetricsSummary.frequentErrorCount} erreurs fréquentes
              </span>
            </div>
          </section>

          <QuizBankAdminView snapshot={snapshot} />
        </div>
      </div>
    </main>
  );
}
