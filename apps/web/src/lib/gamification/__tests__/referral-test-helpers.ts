import { vi } from "vitest";

export const referralProgressionMocks = {
  insertProgressionEvent: vi.fn(),
  loadActionRowsForUser: vi.fn(),
  loadValidatedActionIdsForUser: vi.fn(),
  refreshProgressionProfile: vi.fn(),
};

export function resetReferralProgressionMocks() {
  vi.clearAllMocks();
  referralProgressionMocks.insertProgressionEvent.mockResolvedValue(true);
  referralProgressionMocks.loadActionRowsForUser.mockResolvedValue([]);
  referralProgressionMocks.loadValidatedActionIdsForUser.mockResolvedValue(new Set<string>());
  referralProgressionMocks.refreshProgressionProfile.mockResolvedValue(undefined);
}

export function createReferralProgressionDataModule() {
  return {
    insertProgressionEvent: referralProgressionMocks.insertProgressionEvent,
    loadActionRowsForUser: referralProgressionMocks.loadActionRowsForUser,
    loadValidatedActionIdsForUser: referralProgressionMocks.loadValidatedActionIdsForUser,
  };
}

export function createReferralProgressionTrackingModule() {
  return { refreshProgressionProfile: referralProgressionMocks.refreshProgressionProfile };
}


export function createProfileMaybeSingleSelect<T>(data: T | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data, error: null })) })),
    })),
  };
}

export function createProfileLookupSelect<T>(resolve: (id: string) => T | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn((_field: string, id: string) => ({
        maybeSingle: vi.fn(async () => ({ data: resolve(id), error: null })),
      })),
    })),
  };
}

export function createProgressionEventQueries(events: Array<Record<string, unknown>>) {
  return {
    createFilterQuery: () => {
      const query = {} as {
        eq: ReturnType<typeof vi.fn>;
        limit: ReturnType<typeof vi.fn>;
      };
      query.eq = vi.fn(() => query);
      query.limit = vi.fn(async () => ({ data: events, error: null }));
      return query;
    },
    createDeleteQuery: () => {
      const query = {} as {
        eq: ReturnType<typeof vi.fn>;
        then: (resolve: (value: { error: null }) => unknown) => unknown;
      };
      query.eq = vi.fn(() => query);
      query.then = (resolve) => {
        events.length = 0;
        return Promise.resolve(resolve({ error: null }));
      };
      return query;
    },
  };
}
