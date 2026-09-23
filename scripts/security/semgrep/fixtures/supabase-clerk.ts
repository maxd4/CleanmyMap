export async function readProfile(supabase: { from: (table: string) => unknown }) {
  return supabase.from("profiles");
}
