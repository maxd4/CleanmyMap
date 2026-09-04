import { checkAdminAccess } from "@/lib/admin/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

type XpAuditEntry = {
  id: string;
  created_at: string;
  user_id: string;
  actor_id: string | null;
  reason: string | null;
  xp_change: number | null;
};

type XpAuditDailyRow = {
  user_id: string;
  day: string;
  xp_total: number | null;
};

type XpAuditSearchParams = {
  userId?: string;
  from?: string;
  to?: string;
  limit?: string;
  offset?: string;
};

function clampInteger(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export default async function Page({
  searchParams,
}: {
  searchParams?: XpAuditSearchParams;
}) {
  await checkAdminAccess();

  const supabase = getSupabaseServerClient(true);
  const userId = searchParams?.userId ?? null;
  const from = searchParams?.from ?? null;
  const to = searchParams?.to ?? null;
  const limit = clampInteger(Number(searchParams?.limit ?? 50), 1, 200, 50);
  const offset = clampInteger(Number(searchParams?.offset ?? 0), 0, 10000, 0);

  let query = supabase
    .from("xp_audit")
    .select("id, created_at, user_id, actor_id, reason, xp_change, source_table, source_id, metadata")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }

  const { data } = (await query) as { data: XpAuditEntry[] | null };

  const { data: totals } = (await supabase
    .from("xp_audit_daily")
    .select("user_id, day, xp_total")
    .order("day", { ascending: false })
    .limit(200)) as { data: XpAuditDailyRow[] | null };

  return (
    <div style={{ padding: 20 }}>
      <PageHeader
        tone="slate"
        title="XP Audit"
        subtitle="Journal technique des variations d'expérience."
      />
      <section>
        <h2>Totals per day</h2>
        <div className="cmm-data-table-wrap">
        <table className="cmm-data-table" data-density="compact">
          <thead>
            <tr>
              <th scope="col">user_id</th>
              <th scope="col">day</th>
              <th scope="col">xp_total</th>
            </tr>
          </thead>
          <tbody>
            {totals?.map((row) => (
              <tr key={`${row.user_id}-${row.day}`}>
                <td>{row.user_id}</td>
                <td>{row.day}</td>
                <td>{row.xp_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
      <section>
        <h2>Audit entries</h2>
        <div className="cmm-data-table-wrap">
        <table className="cmm-data-table" data-density="compact">
          <thead>
            <tr>
              <th scope="col">when</th>
              <th scope="col">user</th>
              <th scope="col">actor</th>
              <th scope="col">xp</th>
              <th scope="col">reason</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.id}>
                <td>{row.created_at}</td>
                <td>{row.user_id}</td>
                <td>{row.actor_id}</td>
                <td>{row.xp_change}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
