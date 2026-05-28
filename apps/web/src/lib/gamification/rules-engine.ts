export interface GamificationRulesVersion {
  version: string;
  wasteMilestoneStepKg: number;
  buttsMilestoneStepCount: number;
  minLevelForInfiniteXp: number;
  calculateWasteXp(milestoneKg: number): number;
  calculateButtsXp(milestoneButts: number): number;
}

export const rulesV1: GamificationRulesVersion = {
  version: "v1",
  wasteMilestoneStepKg: 10,
  buttsMilestoneStepCount: 1000,
  minLevelForInfiniteXp: 3,

  calculateWasteXp: (milestoneKg: number): number => {
    // Base 1 XP per 10kg palier + loyalty bonus.
    // 50kg -> +1 bonus, 100kg -> +2 bonus
    const base = 1;
    const bonus = milestoneKg % 100 === 0 ? 2 : (milestoneKg % 50 === 0 ? 1 : 0);
    return base + bonus;
  },

  calculateButtsXp: (milestoneButts: number): number => {
    // Base 1 XP per 1000 butts palier + loyalty bonus.
    // +1 bonus every 5000, +2 bonus every 10000
    const base = 1;
    const bonus = milestoneButts % 10000 === 0 ? 2 : milestoneButts % 5000 === 0 ? 1 : 0;
    return base + bonus;
  },
};

// Configurable active engine
export const gamificationEngine = {
  getActiveRules: (): GamificationRulesVersion => rulesV1,
};
