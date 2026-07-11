"use client";
import React from "react";
import { connectGamificationWS } from "@/lib/gamification/realtime";
import {
  announceGamificationGain,
  resolveGamificationAnnouncement,
} from "@/lib/gamification/announcements";

export default function UseGamificationRealtime({
  wsUrl = process.env["NEXT_PUBLIC_GAMIFICATION_WS"],
}: {
  wsUrl?: string;
}) {
  React.useEffect(() => {
    if (!wsUrl) return;
    const ws = connectGamificationWS(wsUrl, (data) => {
      const celebration = resolveGamificationAnnouncement(data);

      if (celebration) {
        announceGamificationGain(celebration);
      }
    });
    return () => ws.close();
  }, [wsUrl]);

  return null;
}
