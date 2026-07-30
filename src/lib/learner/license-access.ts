import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Represents the access rights a user has based on their active licenses.
 */
export interface UserAccess {
  /** Product IDs with full access (all courses in the product) */
  fullAccessProductIds: string[];
  /** Individual course IDs the user has access to */
  individualCourseIds: string[];
  /** All product IDs the user has any access to */
  allProductIds: string[];
  /** Whether the user has any active license at all */
  hasAnyAccess: boolean;
}

/**
 * Get the access rights for a user based on their active licenses.
 * Returns which products and courses the user can access.
 *
 * @param userId - The public.users.id (NOT auth_id)
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const supabase = createServiceRoleClient();

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('course_id, product_id, grants_full_product')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !licenses || licenses.length === 0) {
    return {
      fullAccessProductIds: [],
      individualCourseIds: [],
      allProductIds: [],
      hasAnyAccess: false,
    };
  }

  const fullAccessProductIds: string[] = [];
  const individualCourseIds: string[] = [];
  const allProductIds = new Set<string>();

  for (const lic of licenses) {
    if (lic.product_id) {
      allProductIds.add(lic.product_id);
    }

    if (lic.grants_full_product && lic.product_id) {
      fullAccessProductIds.push(lic.product_id);
    } else if (lic.course_id) {
      individualCourseIds.push(lic.course_id);
    }
  }

  return {
    fullAccessProductIds: [...new Set(fullAccessProductIds)],
    individualCourseIds: [...new Set(individualCourseIds)],
    allProductIds: [...allProductIds],
    hasAnyAccess: true,
  };
}

/**
 * Get the accessible course IDs for a user.
 * Resolves full-product access to individual course IDs.
 *
 * @param userId - The public.users.id (NOT auth_id)
 * @returns Array of course IDs the user can access, or null if unrestricted (no licenses = no access)
 */
export async function getAccessibleCourseIds(userId: string): Promise<string[] | null> {
  const access = await getUserAccess(userId);

  if (!access.hasAnyAccess) {
    return null; // No access at all
  }

  const supabase = createServiceRoleClient();
  const courseIds = new Set<string>(access.individualCourseIds);

  // Resolve full-product access to individual courses
  if (access.fullAccessProductIds.length > 0) {
    const { data: productCourses } = await supabase
      .from('courses')
      .select('id')
      .in('product_id', access.fullAccessProductIds);

    for (const course of productCourses || []) {
      courseIds.add(course.id);
    }
  }

  return [...courseIds];
}

/**
 * Get the user's public.users.id from the auth session.
 * Call this from server components/actions that need the user ID for license checks.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  // Dynamic import to avoid issues with server component context
  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const serviceClient = createServiceRoleClient();
  const { data: appUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  return appUser?.id || null;
}
