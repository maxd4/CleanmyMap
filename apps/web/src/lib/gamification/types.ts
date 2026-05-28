export type BadgeFamily = 'explorer' | 'participant' | 'forms';

export type GemGrade = {
  id: string;
  label: string;
  threshold: number;
  iconVariant?: string;
  visualVariant?: string;
  tooltip?: string;
  xp?: number;
};

export type FormsProgress = {
  eligibleFormCount: number;
  currentGrade?: GemGrade;
  nextGrade?: GemGrade | null;
  xpReward?: number;
};
