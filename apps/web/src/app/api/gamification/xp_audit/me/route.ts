import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { unauthorizedJsonResponse } from '@/lib/http/auth-responses';
import { handleApiError } from '@/lib/http/api-errors';

export const runtime = 'nodejs';

// Returns recent xp audit entries for the authenticated user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('xp_audit')
      .select('id, created_at, actor_id, reason, xp_change, source_table, source_id, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    return NextResponse.json({ status: 'ok', items: data });
  } catch (error) {
    return handleApiError(error, 'GET /api/gamification/xp_audit/me');
  }
}
