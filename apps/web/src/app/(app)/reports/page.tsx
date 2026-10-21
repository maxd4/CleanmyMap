import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveReportsTab } from "@/components/reports/page-sections/reports-page-tabs";
import {
  loadReportsPageContext,
  renderReportsAuthenticatedTab,
  renderReportsAnonymousTab,
  renderReportsLibraryTab,
  type ReportsPageSearchParams,
} from "./page-orchestration";

type ReportsPageProps = { searchParams: Promise<ReportsPageSearchParams> };

export const metadata: Metadata = buildPageMetadata("/reports", {
  title: "Rapports d'impact",
  description: "Analysez les données de nettoyage participatif, les indicateurs d'impact calculés par proxy et la qualité des données.",
  robots: { index: true, follow: true },
});

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [context, resolvedSearchParams] = await Promise.all([loadReportsPageContext(), searchParams]);
  const activeTab = resolveReportsTab(resolvedSearchParams.tab);
  if (activeTab === "library") return renderReportsLibraryTab();
  if (!context.userId) return renderReportsAnonymousTab(activeTab, context.clerkReachable);
  return renderReportsAuthenticatedTab({
    tab: activeTab,
    detail: resolvedSearchParams.detail === "1",
    actionId: resolvedSearchParams.actionId,
    resumeId: resolvedSearchParams.resumeId,
    userId: context.userId,
    accountCompletion: context.accountCompletion,
    clerkReachable: context.clerkReachable,
    locale: context.locale,
    role: context.role,
    identity: context.identity,
  });
}
