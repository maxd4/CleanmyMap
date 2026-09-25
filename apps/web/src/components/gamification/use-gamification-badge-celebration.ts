import { useEffect, useRef, useState } from "react";
import {
  announceGamificationGain,
  type GamificationAnnouncementPayload,
} from "@/lib/gamification/announcements";

export function useGamificationBadgeCelebration({
  progressValue,
  gradeId,
  payload,
}: {
  progressValue: number;
  gradeId: string;
  payload: GamificationAnnouncementPayload;
}): boolean {
  const { title, message, tone, icon, source, dedupeKey } = payload;
  const [isCelebrating, setIsCelebrating] = useState(false);
  const didMountRef = useRef(false);
  const previousGradeIdRef = useRef<string | null>(null);
  const previousProgressValueRef = useRef<number | null>(null);

  useEffect(() => {
    const previousGradeId = previousGradeIdRef.current;
    const previousProgressValue = previousProgressValueRef.current;
    previousGradeIdRef.current = gradeId;
    previousProgressValueRef.current = progressValue;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (
      progressValue > (previousProgressValue ?? -1) &&
      previousGradeId !== gradeId
    ) {
      let resetTimeout: number | undefined;
      const celebrationTimeout = window.setTimeout(() => {
        setIsCelebrating(true);
        announceGamificationGain({
          title,
          message,
          tone,
          icon,
          source,
          dedupeKey,
        });
        resetTimeout = window.setTimeout(() => setIsCelebrating(false), 900);
      }, 0);

      return () => {
        window.clearTimeout(celebrationTimeout);
        if (resetTimeout !== undefined) {
          window.clearTimeout(resetTimeout);
        }
      };
    }

    return undefined;
  }, [
    dedupeKey,
    gradeId,
    icon,
    message,
    source,
    progressValue,
    title,
    tone,
  ]);

  return isCelebrating;
}

export function useStandardGamificationBadgeCelebration({
  progressValue,
  gradeId,
  title,
  message,
  icon,
  source,
  dedupeKey,
}: Omit<GamificationAnnouncementPayload, "tone"> & {
  progressValue: number;
  gradeId: string;
}): boolean {
  return useGamificationBadgeCelebration({
    progressValue,
    gradeId,
    payload: { title, message, tone: "actions", icon, source, dedupeKey },
  });
}
