import { gamificationEngine } from "@/lib/gamification/rules-engine";

export const BADGE_STEP_DECHETS = 10; // kg per level (infinite badge visual step)
export const BADGE_STEP_MEGOTS = 1000; // count per level (infinite badge visual step)
export const BADGE_MAX_COUNTER = Number.MAX_SAFE_INTEGER; // defensive ceiling

export const ACTIVE_RULES = gamificationEngine.getActiveRules();

