import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/signin');

  try {
    const supabase = getSupabaseServerClient();
    // Check if user has 'admin' or 'godmode' role via Clerk metadata or custom DB table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'godmode')) {
      redirect('/');
    }
  } catch {
    // If role check fails, deny access
    redirect('/');
  }
}
