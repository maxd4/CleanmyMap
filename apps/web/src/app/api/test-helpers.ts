import { expect } from "vitest";

type MockFunction = {
  mockReturnThis?: () => unknown;
};

export function createClerkAuthModule(auth: unknown) {
  return { auth };
}

export function createSupabaseServerModule(getSupabaseServerClient: unknown) {
  return { getSupabaseServerClient };
}

export function createRateLimitedHandlerModule() {
  return {
    createRateLimitedHandler: (handlers: Record<string, unknown>) => Object.values(handlers)[0],
  };
}

export function createSupabaseAdminModule(
  queryMock: Record<string, MockFunction>,
  chainMethods: readonly string[],
) {
  const client = Object.fromEntries(
    Object.entries(queryMock).map(([name, mock]) => [
      name,
      chainMethods.includes(name) ? mock.mockReturnThis?.() : mock,
    ]),
  );
  return { getSupabaseAdminClient: () => client };
}

export function expectNoSupabaseWrites(sources: readonly string[]) {
  for (const source of sources) {
    expect(source).not.toMatch(/\.insert\s*\(/);
    expect(source).not.toMatch(/\.update\s*\(/);
    expect(source).not.toMatch(/\.delete\s*\(/);
    expect(source).not.toMatch(/\.upsert\s*\(/);
  }
}
