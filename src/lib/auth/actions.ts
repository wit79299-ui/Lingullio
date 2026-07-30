'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// -------------------------------------------------------------------
// Sign in with email + password
// -------------------------------------------------------------------
export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// -------------------------------------------------------------------
// Sign out
// -------------------------------------------------------------------
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
}

// -------------------------------------------------------------------
// Request password reset email
// -------------------------------------------------------------------
export async function requestPasswordReset(email: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// -------------------------------------------------------------------
// Update password (after reset link clicked)
// -------------------------------------------------------------------
export async function resetPassword(newPassword: string, code: string | null) {
  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return { error: exchangeError.message };
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// -------------------------------------------------------------------
// Verify activation code and create account
// Step 1: Check that the code exists in licenses table (pending status)
// -------------------------------------------------------------------
export async function verifyActivationCode(email: string, code: string) {
  const serviceClient = createServiceRoleClient();

  const { data: license, error } = await serviceClient
    .from('licenses')
    .select('id, email, status, course_id, product_id')
    .eq('activation_code', code.toUpperCase())
    .eq('status', 'pending')
    .single();

  if (error || !license) {
    return { error: 'invalidCode', license: null };
  }

  // Verify email matches the license email
  if (license.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'invalidCode', license: null };
  }

  return { error: null, license };
}

// -------------------------------------------------------------------
// Activate account: create Supabase Auth user, link to app user,
// activate ALL pending licenses for this email, create learner profiles
// -------------------------------------------------------------------
export async function activateAccount(
  email: string,
  password: string,
  activationCode: string
) {
  const serviceClient = createServiceRoleClient();

  // 1. Verify activation code again (security)
  const { data: license, error: licenseError } = await serviceClient
    .from('licenses')
    .select('id, email, status, course_id, product_id, duration_months, grants_full_product')
    .eq('activation_code', activationCode.toUpperCase())
    .eq('status', 'pending')
    .single();

  if (licenseError || !license) {
    return { error: 'invalidCode' };
  }

  if (license.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'invalidCode' };
  }

  // 2. Create Supabase Auth user
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { error: 'emailAlreadyExists' };
    }
    return { error: authError.message };
  }

  const authId = authData.user.id;

  // 3. Create app user record
  const { data: appUser, error: userError } = await serviceClient
    .from('users')
    .insert({
      auth_id: authId,
      email: email.toLowerCase(),
      role: 'learner',
      interface_language: 'en',
      is_active: true,
    })
    .select('id')
    .single();

  if (userError) {
    return { error: userError.message };
  }

  // 4. Find ALL pending licenses for this email (user may have bought multiple products)
  const { data: allLicenses } = await serviceClient
    .from('licenses')
    .select('id, course_id, product_id, duration_months, grants_full_product')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending');

  const licensesToActivate = allLicenses || [license];

  // 5. Activate all licenses
  const now = new Date();
  for (const lic of licensesToActivate) {
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + (lic.duration_months || 12));

    await serviceClient
      .from('licenses')
      .update({
        user_id: appUser.id,
        status: 'active',
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', lic.id);
  }

  // 6. Determine which exam types the user has access to
  // Look up course exam_types from the license course_ids
  const courseIds = licensesToActivate
    .map((l) => l.course_id)
    .filter((id): id is string => !!id);

  let examTypes: string[] = [];

  if (courseIds.length > 0) {
    const { data: courses } = await serviceClient
      .from('courses')
      .select('exam_type')
      .in('id', courseIds);

    examTypes = [...new Set((courses || []).map((c) => c.exam_type))];
  }

  // Fallback: if no exam types resolved, check product exam_types
  if (examTypes.length === 0) {
    const productIds = licensesToActivate
      .map((l) => l.product_id)
      .filter((id): id is string => !!id);

    if (productIds.length > 0) {
      const { data: products } = await serviceClient
        .from('products')
        .select('exam_type')
        .in('id', productIds);

      examTypes = [...new Set((products || []).map((p) => p.exam_type))];
    }
  }

  // Final fallback
  if (examTypes.length === 0) {
    examTypes = ['HSK'];
  }

  // 7. Create a learner profile for each exam type
  // Default levels per exam type
  const defaultLevels: Record<string, string> = {
    'HSK': '1',
    'TEF': 'B1', // TEF uses CEFR-like levels
  };

  for (const examType of examTypes) {
    const targetLevel = defaultLevels[examType] || '1';

    await serviceClient
      .from('learner_profiles')
      .insert({
        user_id: appUser.id,
        target_exam: examType,
        target_level: targetLevel,
        onboarding_completed: false,
        diagnostic_completed: false,
      });
  }

  return { error: null };
}

// -------------------------------------------------------------------
// Get current session user
// -------------------------------------------------------------------
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch app user data
  const { data: appUser } = await supabase
    .from('users')
    .select('*, learner_profiles(*)')
    .eq('auth_id', user.id)
    .single();

  return appUser;
}

// -------------------------------------------------------------------
// Get current session (lightweight, for middleware)
// -------------------------------------------------------------------
export async function getSession() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}
