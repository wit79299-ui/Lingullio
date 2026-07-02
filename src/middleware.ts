import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication
const protectedPrefixes = ['/dashboard', '/courses', '/revisions', '/mock-exams', '/progress', '/objectives', '/resources', '/settings', '/profile', '/onboarding', '/exercises'];

// Routes that require admin role
const adminPrefixes = ['/admin'];

// Auth routes (accessible only when NOT authenticated)
const authRoutes = ['/login', '/activate', '/forgot-password', '/reset-password'];

function getPathnameWithoutLocale(pathname: string, locales: readonly string[]) {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  // Run intl middleware first to handle locale
  const intlResponse = intlMiddleware(request);

  // DEMO MODE: skip auth checks for development preview
  // Activated when: Supabase not configured OR NEXT_PUBLIC_DEMO_MODE=true
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const isDemoMode =
    !supabaseUrl ||
    supabaseUrl.includes('placeholder') ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return intlResponse;
  }

  // Create Supabase client with request/response cookies
  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            intlResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const cleanPath = getPathnameWithoutLocale(pathname, routing.locales);

  // Check if route is protected
  const isProtected = protectedPrefixes.some(
    (prefix) => cleanPath.startsWith(prefix) || cleanPath === prefix
  );
  const isAdmin = adminPrefixes.some(
    (prefix) => cleanPath.startsWith(prefix) || cleanPath === prefix
  );
  const isAuthRoute = authRoutes.some(
    (route) => cleanPath.startsWith(route) || cleanPath === route
  );

  // If no session and trying to access protected/admin route, redirect to login
  if (!session && (isProtected || isAdmin)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For admin routes, check role (via user metadata or app user query)
  // This is a lightweight check; full role verification happens server-side
  if (session && isAdmin) {
    const { data: appUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (!appUser || !['admin', 'editor', 'reviewer'].includes(appUser.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|auth|monitoring|setup|.*\\..*).*)',
  ],
};
