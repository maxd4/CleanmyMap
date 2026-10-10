import type { DashboardPageData } from "@/lib/dashboard/page-data";

type ReferralDashboardSummary = DashboardPageData["referralSummary"];

type DashboardReferralStatusGridProps = {
  locale: "fr" | "en";
  summary: ReferralDashboardSummary | null;
};

export function DashboardReferralStatusGrid({
  locale,
  summary,
}: DashboardReferralStatusGridProps) {
  const unavailable = locale === "fr" ? "Indisponible" : "Unavailable";
  const badgeStatus =
    summary === null
      ? unavailable
      : summary.badgeUnlocked
        ? locale === "fr"
          ? "Débloqué"
          : "Unlocked"
        : locale === "fr"
          ? "À générer"
          : "To generate";
  const linkStatus =
    summary === null
      ? unavailable
      : summary.inviteUrl
        ? locale === "fr"
          ? "Prêt à partager"
          : "Ready to share"
        : locale === "fr"
          ? "Non créé"
          : "Not created";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.34)] px-4 py-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-100/75">
          {locale === "fr" ? "Badge" : "Badge"}
        </p>
        <p className="mt-1 text-sm font-bold text-white">{badgeStatus}</p>
      </div>

      <div className="rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.34)] px-4 py-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-100/75">
          {locale === "fr" ? "Lien" : "Link"}
        </p>
        <p className="mt-1 text-sm font-bold text-white">{linkStatus}</p>
      </div>
    </div>
  );
}
