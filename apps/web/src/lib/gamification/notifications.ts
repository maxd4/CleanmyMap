export function notifyTierReached(userId: string, tierId: string, title: string) {
  console.info(`[gamification] user=${userId} reached tier=${tierId} (${title})`);
}

export async function auditXpAttribution(supabase: any, userId: string, actorId: string | null, reason: string, xpChange: number, source_table: string | null = null, source_id: string | null = null, metadata: any = {}) {
  try {
    await supabase.from('xp_audit').insert({ user_id: userId, actor_id: actorId, reason, xp_change: xpChange, source_table, source_id, metadata });
  } catch (e) {
    // ignore failures
    console.error('Failed to write xp_audit', e);
  }
}
