import { vi } from 'vitest'
import { createAsyncStorageMock, createSecureStoreMock } from './persistence-mocks'

export const storageTestState = {
  client: null as unknown,
  currentUserId: 'user_123' as string | null,
  values: new Map<string, string>(),
}

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}))

vi.mock('@react-native-async-storage/async-storage', () => createAsyncStorageMock(storageTestState))
vi.mock('expo-secure-store', () => createSecureStoreMock(storageTestState))
