"use client";
import React from 'react';
import { connectGamificationWS } from '@/lib/gamification/realtime';
import GamificationToast from '@/components/gamification/GamificationToast';

export default function UseGamificationRealtime({ wsUrl = process.env.NEXT_PUBLIC_GAMIFICATION_WS }: { wsUrl?: string }) {
  const [message, setMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!wsUrl) return;
    const ws = connectGamificationWS(wsUrl, (data) => {
      if (data.type === 'tier_unlocked' || data.type === 'participant_tier_unlocked') {
        setMessage(`${data.title || data.tierId || data.tierId} débloqué !`);
        setTimeout(() => setMessage(null), 5000);
      }
    });
    return () => ws.close();
  }, [wsUrl]);

  if (!message) return null;
  return <GamificationToast message={message} />;
}
