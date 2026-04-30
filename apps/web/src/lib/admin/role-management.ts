import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeProfileRole, type AppProfile } from "@/lib/profiles";

type RoleAccountRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  role_label: string | null;
  paris_arrondissement: number | null;
  updated_at: string | null;
};

export type RoleAccountRecord = {
  userId: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  roleLabel: AppProfile;
  parisArrondissement: number | null;
  updatedAt: string | null;
};

const PROFILE_SELECT =
  "id, display_name, handle, avatar_url, role_label, paris_arrondissement, updated_at";

function normalizeProfileRow(row: RoleAccountRow): RoleAccountRecord {
  const roleLabel = row.role_label ?? "";
  return {
    userId: row.id,
    displayName: row.display_name?.trim() || "Membre",
    handle: row.handle?.trim() || null,
    avatarUrl: row.avatar_url?.trim() || null,
    roleLabel: normalizeProfileRole(roleLabel) ?? "benevole",
    parisArrondissement:
      typeof row.paris_arrondissement === "number" &&
      Number.isFinite(row.paris_arrondissement)
        ? row.paris_arrondissement
        : null,
    updatedAt: row.updated_at,
  };
}

function dedupeRecords(records: RoleAccountRecord[]): RoleAccountRecord[] {
  const byId = new Map<string, RoleAccountRecord>();
  for (const record of records) {
    if (!byId.has(record.userId)) {
      byId.set(record.userId, record);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const roleRank = (role: AppProfile): number => {
      if (role === "max") return 0;
      if (role === "admin") return 1;
      if (role === "elu") return 2;
      return 3;
    };
    return (
      roleRank(a.roleLabel) - roleRank(b.roleLabel) ||
      a.displayName.localeCompare(b.displayName, "fr") ||
      a.userId.localeCompare(b.userId)
    );
  });
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function queryProfilesByFilter(
  filter: (query: any) => any,
): Promise<RoleAccountRecord[]> {
  const supabase = getSupabaseServerClient();
  const query = filter(supabase.from("profiles").select(PROFILE_SELECT) as any);
  const { data, error } = await query;
  if (error || !data) {
    return [];
  }
  return (data as RoleAccountRow[]).map(normalizeProfileRow);
}

export async function listManagedRoleAccounts(): Promise<RoleAccountRecord[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("role_label", ["admin", "elu"])
    .order("role_label", { ascending: true })
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as RoleAccountRow[]).map(normalizeProfileRow);
}

export async function searchManagedRoleAccounts(
  searchTerm: string,
): Promise<RoleAccountRecord[]> {
  const term = searchTerm.trim();
  if (!term) {
    return [];
  }

  const pattern = `%${escapeLikePattern(term)}%`;
  const [byId, byHandle, byName] = await Promise.all([
    queryProfilesByFilter((query) => query.eq("id", term)),
    queryProfilesByFilter((query) => query.ilike("handle", pattern)),
    queryProfilesByFilter((query) => query.ilike("display_name", pattern)),
  ]);

  return dedupeRecords([...byId, ...byHandle, ...byName]);
}

export async function getManagedRoleAccountById(
  userId: string,
): Promise<RoleAccountRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeProfileRow(data as RoleAccountRow);
}
