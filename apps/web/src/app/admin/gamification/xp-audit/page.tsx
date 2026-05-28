import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/admin/access';

export default async function Page({ searchParams }: { searchParams: any }) {
  await checkAdminAccess();

  const supabase = getSupabaseServerClient(true);
  const userId = searchParams?.userId ?? null;
  const from = searchParams?.from ?? null;
  const to = searchParams?.to ?? null;
  const limit = Number(searchParams?.limit ?? 50);
  const offset = Number(searchParams?.offset ?? 0);

  let q: any = supabase.from('xp_audit').select('id, created_at, user_id, actor_id, reason, xp_change, source_table, source_id, metadata').order('created_at', { ascending: false }).range(offset, offset + limit -1);
  if (userId) q = q.eq('user_id', userId);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  const { data } = await q;

  // total per day helper
  const { data: totals } = await supabase.from('xp_audit_daily').select('user_id, day, xp_total').order('day', { ascending: false }).limit(200);

  return (
    <div style={{padding:20}}>
      <h1>Admin — XP Audit</h1>
      <section>
        <h2>Totals per day</h2>
        <table>
          <thead><tr><th>user_id</th><th>day</th><th>xp_total</th></tr></thead>
          <tbody>
            {totals?.map((t:any)=>(<tr key={`${t.user_id}-${t.day}`}><td>{t.user_id}</td><td>{t.day}</td><td>{t.xp_total}</td></tr>))}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Audit entries</h2>
        <table>
          <thead><tr><th>when</th><th>user</th><th>actor</th><th>xp</th><th>reason</th></tr></thead>
          <tbody>
            {data?.map((r:any)=>(<tr key={r.id}><td>{r.created_at}</td><td>{r.user_id}</td><td>{r.actor_id}</td><td>{r.xp_change}</td><td>{r.reason}</td></tr>))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
