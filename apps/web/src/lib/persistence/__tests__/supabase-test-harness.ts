import { vi } from "vitest";

export type SupabaseTestResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

function makeQuery(result: SupabaseTestResult) {
  const query: Record<string, unknown> & {
    then: (
      resolve: (value: SupabaseTestResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

export function configureSupabaseTestClient(
  clientMock: { mockReturnValue: (value: unknown) => unknown },
  responses: Record<string, SupabaseTestResult[]>,
) {
  clientMock.mockReturnValue({
    from: vi.fn((table: string) => {
      const result = responses[table]?.shift();
      if (!result) {
        throw new Error(`Unexpected Supabase table access: ${table}`);
      }
      return makeQuery(result);
    }),
  });
}
