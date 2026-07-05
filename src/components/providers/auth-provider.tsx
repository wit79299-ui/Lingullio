'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: Record<string, unknown> | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const initializedRef = useRef(false);

  // Set initial user from server (runs once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialUser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useAuthStore.getState().setUser(initialUser as any);
    } else {
      useAuthStore.getState().setLoading(false);
    }
  }, [initialUser]);

  // Listen for auth state changes (runs once)
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().setUser(null);
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
            useAuthStore.getState().setUser(appUser as any);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: subscribe once on mount

  return <>{children}</>;
}
