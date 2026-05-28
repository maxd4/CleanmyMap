import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/http/api-errors';

export const runtime = 'nodejs';

// Query params: userId, from, to, limit, offset
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServerClient(true);
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = Number(url.searchParams.get('limit') || 50);
    const offset = Number(url.searchParams.get('offset') || 0);

    let q: any = supabase
      .from('xp_audit')
      .select('id, created_at, user_id, actor_id, reason, xp_change, source_table, source_id, metadata')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) q = q.eq('user_id', userId);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ status: 'ok', items: data });
  } catch (error) {
    return handleApiError(error, 'GET /api/gamification/xp_audit/admin');
  }
}
