import { vi } from 'vitest'

export type PersistenceState = {
  values: Map<string, string>
}

export function createAsyncStorageMock(state: PersistenceState) {
  return {
    default: {
      getItem: vi.fn(async (key: string) => state.values.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        state.values.set(key, value)
      }),
      removeItem: vi.fn(async (key: string) => {
        state.values.delete(key)
      }),
    },
  }
}

export function createSecureStoreMock(state: PersistenceState, readValues = true) {
  return {
    getItemAsync: vi.fn(async (key: string) => (readValues ? state.values.get(key) ?? null : null)),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      if (readValues) state.values.set(key, value)
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      if (readValues) state.values.delete(key)
    }),
  }
}
