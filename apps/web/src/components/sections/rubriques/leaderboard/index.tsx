"use client";

import { SectionShell } from "@/components/sections/rubriques/shared";
import { LeaderboardPanel } from "@/components/gamification/leaderboard-panel";

export function LeaderboardSection() {
  return (
    <SectionShell
      id="leaderboard"
      title={{ fr: "Classement public", en: "Public leaderboard" }}
      subtitle={{
        fr: "Consultez les niveaux, XP validée et badges rendus publics.",
        en: "Browse publicly shared levels, validated XP, and badges.",
      }}
      gradient="from-rose-50 via-white to-transparent"
    >
      <div>
        <LeaderboardPanel />
      </div>
    </SectionShell>
  );
}
