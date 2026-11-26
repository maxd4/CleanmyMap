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
      <div className="border-t border-current/10 pt-3">
        <p className="text-sm font-semibold cmm-text-secondary">
          Badge
        </p>
        <p className="mt-1 text-sm font-bold cmm-text-primary">{badgeStatus}</p>
      </div>

      <div className="border-t border-current/10 pt-3">
        <p className="text-sm font-semibold cmm-text-secondary">
          {locale === "fr" ? "Lien" : "Link"}
        </p>
        <p className="mt-1 text-sm font-bold cmm-text-primary">{linkStatus}</p>
      </div>
    </div>
  );
}
