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
      <div className="cmm-page-width px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <LeaderboardPanel />
      </div>
    </SectionShell>
  );
}
