export async function signIn(supabase: { auth: { signInAnonymously: () => unknown } }) {
  return supabase.auth.signInAnonymously();
}
