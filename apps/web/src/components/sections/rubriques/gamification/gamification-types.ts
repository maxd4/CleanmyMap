import type { UserProgressionResponse } from "@/lib/gamification/progression-types";

export type MeResponse = {
  status: "ok";
  progression: UserProgressionResponse;
};
