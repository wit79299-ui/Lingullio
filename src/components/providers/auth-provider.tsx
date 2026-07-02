'use client';

import { useEffect, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: Record<string, unknown> | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    // Set initial user from server if available
    if (initialUser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUser(initialUser as any);
    } else {
      setLoading(false);
    }
  }, [initialUser, setUser, setLoading]);

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Fetch fresh app user data
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: appUser } = await supabase
            .from('users')
            .select('*, learner_profiles(*)')
            .eq('auth_id', authUser.id)
            .single();

          if (appUser) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setUser(appUser as any);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return <>{children}</>;
}
