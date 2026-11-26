import { CmmCard } from "@/components/ui/cmm-card";
import type { DashboardPageData } from "@/lib/dashboard/page-data";

type DashboardUserLevelRankingProps = {
  locale: "fr" | "en";
  userId: string;
  userLevelRanking: DashboardPageData["userLevelRanking"];
};

export function DashboardUserLevelRanking({ locale, userId, userLevelRanking }: DashboardUserLevelRankingProps) {
  const fr = locale === "fr";
  const current = userLevelRanking.currentUserRow;
  const showCurrent = current && !userLevelRanking.topRows.some((row) => row.userId === userId);
  return (
    <CmmCard className="space-y-3">
      <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Classement global des niveaux" : "Global level ranking"}</h3>
      {userLevelRanking.topRows.length === 0 ? (
        <p className="text-sm cmm-text-secondary">{fr ? "Le classement n'est pas encore disponible." : "Ranking data is not available yet."}</p>
      ) : (
        <ol className="divide-y divide-current/10">
          {userLevelRanking.topRows.map((row) => (
            <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-words font-semibold cmm-text-primary">#{row.rank} · {row.actorName}{row.userId === userId ? (fr ? " (vous)" : " (you)") : ""}</p>
                <p className="text-sm cmm-text-secondary">{fr ? "XP valides" : "Validated XP"} : {row.xpValidated}</p>
              </div>
              <span className="text-sm font-semibold cmm-text-secondary">{fr ? "Niveau" : "Level"} {row.currentLevel}</span>
            </li>
          ))}
        </ol>
      )}
      {showCurrent && (
        <div className="space-y-1 border-t border-current/10 pt-3">
          <p className="font-semibold cmm-text-primary">{fr ? "Votre position" : "Your position"} : #{current.rank}</p>
          <p className="text-sm cmm-text-secondary">{fr ? "Niveau" : "Level"} {current.currentLevel} · {fr ? "XP valides" : "Validated XP"} {current.xpValidated}</p>
        </div>
      )}
    </CmmCard>
  );
}
