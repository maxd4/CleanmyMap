export function normalizeSentryRelease(value: string | undefined): string | null;
export function resolveSentryRelease(source: Record<string, string | undefined>): string | null;
export function normalizeSentryEnvironment(value: string | undefined): string;
export function resolveSentryEnvironment(source: Record<string, string | undefined>): string;
