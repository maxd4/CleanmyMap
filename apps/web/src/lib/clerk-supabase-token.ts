import { env } from "@/lib/env";

// Supabase est auth via JWT Clerk transmis en accessToken, pas via sessionId.
export type ClerkSupabaseTokenOptions = {
  template?: string;
};

export type ClerkSupabaseTokenGetter = (
  options?: ClerkSupabaseTokenOptions,
) => Promise<string | null>;

export function getClerkSupabaseJwtTemplate(): string | undefined {
  const template = env.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE?.trim();
  return template && template.length > 0 ? template : undefined;
}

export function buildClerkSupabaseAccessTokenProvider(
  getToken: ClerkSupabaseTokenGetter,
): () => Promise<string | null> {
  const template = getClerkSupabaseJwtTemplate();

  if (!template) {
    return () => getToken().catch(() => null);
  }

  return () => getToken({ template }).catch(() => null);
}
