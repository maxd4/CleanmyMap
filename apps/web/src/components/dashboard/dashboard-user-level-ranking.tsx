import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import type { DashboardPageData } from "@/lib/dashboard/page-data";

type DashboardUserLevelRankingProps = {
  locale: "fr" | "en";
  userId: string;
  userLevelRanking: DashboardPageData["userLevelRanking"];
};

export function DashboardUserLevelRanking({
  locale,
  userId,
  userLevelRanking,
}: DashboardUserLevelRankingProps) {
  return (
    <FamilyRubriqueCard
      withTopBar={true}
      topBarContent={
        locale === "fr"
          ? "Classement global - niveau utilisateur"
          : "Global ranking - user level"
      }
      className="p-8 sm:p-10"
    >
      {userLevelRanking.topRows.length === 0 ? (
        <p className="text-sm text-amber-100/85">
          {locale === "fr"
            ? "Le classement n'est pas encore disponible."
            : "Ranking data is not available yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {userLevelRanking.topRows.map((row) => {
            const isCurrentUser = row.userId === userId;
            return (
              <div
                key={row.userId}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  isCurrentUser
                    ? "border-amber-300/40 bg-amber-200/15"
                    : "border-amber-200/18 bg-[rgba(69,26,3,0.38)]"
                }`}
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-white">
                    #{row.rank} - {row.actorName}
                  </p>
                  <p className="text-xs text-amber-100/80">
                    {locale === "fr" ? "XP valides" : "Validated XP"}: {row.xpValidated}
                  </p>
                </div>
                <span className="rounded-lg border border-amber-200/25 bg-[rgba(69,26,3,0.65)] px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-amber-50">
                  {locale === "fr" ? "Niveau" : "Level"} {row.currentLevel}
                </span>
              </div>
            );
          })}

          {userLevelRanking.currentUserRow &&
          !userLevelRanking.topRows.some(
            (row) => row.userId === userId,
          ) ? (
            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3">
              <p className="text-sm font-bold text-white">
                {locale === "fr" ? "Votre position" : "Your position"}:
                #{userLevelRanking.currentUserRow.rank}
              </p>
              <p className="text-xs text-amber-100/80">
                {locale === "fr" ? "Niveau" : "Level"} {userLevelRanking.currentUserRow.currentLevel} · {locale === "fr" ? "XP valides" : "Validated XP"} {userLevelRanking.currentUserRow.xpValidated}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </FamilyRubriqueCard>
  );
}
