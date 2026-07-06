// ─── Sync Auth Helper ──────────────────────────────────────────────────
// Shared auth logic for all sync API routes.
// Resolves the Supabase auth user → public.users row + learner_profile.

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export interface SyncUser {
  auth_id: string;        // Supabase Auth UUID
  user_id: string;        // public.users.id
  profile_id: string;     // public.learner_profiles.id
}

/**
 * Authenticate the request and return user + learner profile IDs.
 * Returns null if not authenticated or profile not found.
 */
export async function getSyncUser(): Promise<SyncUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Use service role to bypass RLS for this lookup
    const serviceClient = createServiceRoleClient();

    const { data: appUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!appUser) return null;

    const { data: profile } = await serviceClient
      .from('learner_profiles')
      .select('id')
      .eq('user_id', appUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!profile) return null;

    return {
      auth_id: user.id,
      user_id: appUser.id,
      profile_id: profile.id,
    };
  } catch {
    return null;
  }
}
