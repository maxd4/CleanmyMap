"use client";

import { useEffect } from "react";
import type { LearnPageId } from "@/lib/learning/learn-progress";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

type LearnPageVisitTrackerProps = {
  pageId: LearnPageId;
};

export function LearnPageVisitTracker({ pageId }: LearnPageVisitTrackerProps) {
  useEffect(() => {
    recordLearnPageVisit(pageId);
  }, [pageId]);

  return null;
}
