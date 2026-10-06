const STORAGE_OBJECT_PAGE_SIZE = 1000;

export async function fetchAllStorageObjects<T>(
  queryBuilder: {
    select: (columns: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => {
        range: (from: number, to: number) => unknown;
      };
    };
  },
  columns = "bucket_id,name,created_at,updated_at,metadata",
): Promise<T[]> {
  const items: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + STORAGE_OBJECT_PAGE_SIZE - 1;
    const result = (await queryBuilder
      .select(columns)
      .order("created_at", { ascending: true })
      .range(from, to)) as {
      data: T[] | null;
      error: { message: string } | null;
    };
    const { data, error } = result;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    items.push(...data);
    if (data.length < STORAGE_OBJECT_PAGE_SIZE) break;
    from += STORAGE_OBJECT_PAGE_SIZE;
  }
  return items;
}
