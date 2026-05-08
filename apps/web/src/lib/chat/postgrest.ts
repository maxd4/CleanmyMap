export function escapePostgrestLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

export function mergeRowGroupsById<T extends { id: string }>(groups: T[][]): T[] {
  return dedupeById(groups.flat());
}

export function sortByCreatedAtAsc<T extends { id: string; created_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.id.localeCompare(right.id);
  });
}
