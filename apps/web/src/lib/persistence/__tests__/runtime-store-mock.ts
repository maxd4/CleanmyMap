type SupabaseResult = {
  data: unknown;
  error: { message: string } | null;
};

type SupabaseListResult = {
  data: readonly unknown[] | null;
  error: { message: string } | null;
};

type RowParser<T> = (row: Record<string, unknown>) => T | null;

async function deleteRecord(query: PromiseLike<SupabaseListResult>): Promise<boolean> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).length > 0;
}

async function readRecord<T>(
  query: PromiseLike<SupabaseResult>,
  parse: RowParser<T>,
): Promise<T | null> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.data ? parse(result.data as Record<string, unknown>) : null;
}

export function createRuntimeStoreModule() {
  return {
    mapSupabaseRecords: <T>(data: readonly unknown[] | null | undefined, parse: RowParser<T>) =>
      (data ?? [])
        .map((row) => parse(row as Record<string, unknown>))
        .filter((record): record is T => Boolean(record)),
    prependBoundedRecord: <T>(record: T, records: readonly T[], limit = 2000) =>
      [record, ...records].slice(0, limit),
    readSupabaseRecord: readRecord,
    readSupabaseRecords: async <T>(
      query: PromiseLike<SupabaseListResult>,
      parse: RowParser<T>,
    ) => {
      const result = await query;
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? [])
        .map((row) => parse(row as Record<string, unknown>))
        .filter((record): record is T => Boolean(record));
    },
    deleteSupabaseRecord: deleteRecord,
    deleteSupabaseRecordById: (client: {
      from: (tableName: string) => {
        delete: () => {
          eq: (column: string, value: string) => {
            select: (columns: string) => PromiseLike<SupabaseListResult>;
          };
        };
      };
    }, tableName: string, id: string) => deleteRecord(
      client.from(tableName).delete().eq("id", id).select("id"),
    ),
    deleteAndPersistRecord: async <T>(
      records: readonly T[],
      matches: (record: T) => boolean,
      persist: (records: T[]) => Promise<void>,
    ) => {
      const nextRecords = records.filter((record) => !matches(record));
      if (nextRecords.length === records.length) return false;
      await persist(nextRecords);
      return true;
    },
    requirePersistedRecord: <T>(record: T | null, message: string) => {
      if (!record) throw new Error(message);
      return record;
    },
    persistSupabaseRecord: async <T>(
      query: PromiseLike<SupabaseResult>,
      parse: RowParser<T>,
      message: string,
    ) => {
      const record = await readRecord(query, parse);
      if (!record) throw new Error(message);
      return record;
    },
  };
}
