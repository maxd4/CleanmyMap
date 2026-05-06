export type LocalStorageJsonGuard<T> = (value: unknown) => value is T;

export type LocalStorageCodec<T> = {
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
};

export type LocalStorageStore<T> = {
  key: string;
  read: () => T | null;
  write: (value: T) => boolean;
  remove: () => boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function canUseLocalStorage(): boolean {
  return isBrowser();
}

export function readLocalStorageRaw(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageRaw(key: string, value: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorageEntry(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readLocalStorageJson<T>(
  key: string,
  guard: LocalStorageJsonGuard<T>,
): T | null {
  const raw = readLocalStorageRaw(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalStorageJson<T>(key: string, value: T): boolean {
  try {
    return writeLocalStorageRaw(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function createLocalStorageStore<T>(
  key: string,
  codec: LocalStorageCodec<T>,
): LocalStorageStore<T> {
  return {
    key,
    read: () => {
      const raw = readLocalStorageRaw(key);
      if (raw === null) {
        return null;
      }

      try {
        return codec.parse(raw);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        return writeLocalStorageRaw(key, codec.serialize(value));
      } catch {
        return false;
      }
    },
    remove: () => removeLocalStorageEntry(key),
  };
}

export function createLocalStorageJsonStore<T>(
  key: string,
  guard: LocalStorageJsonGuard<T>,
): LocalStorageStore<T> {
  return createLocalStorageStore<T>(key, {
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        return guard(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
  });
}

export function createLocalStorageStringStore<T extends string>(
  key: string,
  allowedValues: readonly T[],
): LocalStorageStore<T> {
  const allowed = new Set<string>(allowedValues);
  return createLocalStorageStore<T>(key, {
    parse: (raw) => (allowed.has(raw) ? (raw as T) : null),
    serialize: (value) => value,
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "boolean");
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}
