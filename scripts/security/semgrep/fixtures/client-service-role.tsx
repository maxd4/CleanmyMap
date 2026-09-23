"use client";

export function ClientSecretLeak() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return <span>{key}</span>;
}
