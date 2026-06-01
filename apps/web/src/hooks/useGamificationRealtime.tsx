"use client";
import React from 'react';
import { connectGamificationWS } from '@/lib/gamification/realtime';
import { dispatchGamificationCelebration } from '@/lib/gamification/celebration';

export default function UseGamificationRealtime({ wsUrl = process.env.NEXT_PUBLIC_GAMIFICATION_WS }: { wsUrl?: string }) {
  React.useEffect(() => {
    if (!wsUrl) return;
    const ws = connectGamificationWS(wsUrl, (data) => {
      if (data.type === 'tier_unlocked' || data.type === 'participant_tier_unlocked') {
        dispatchGamificationCelebration({
          title: "Palier débloqué",
          message: `${data.title || data.tierId || data.tierId} débloqué !`,
          tone: "generic",
          icon: "✨",
          source: "realtime",
        });
      }
    });
    return () => ws.close();
  }, [wsUrl]);

  return null;
}
