import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendActivationEmail } from '@/lib/email/brevo';
import crypto from 'crypto';

// Verify Shopify HMAC signature
function verifyShopifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

// Generate a random activation code (8 chars, uppercase alphanumeric)
function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// POST /api/webhooks/shopify
// Handles orders/paid webhook from Shopify
export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Shopify Webhook] SHOPIFY_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifySignature(body, signature, secret)) {
    console.error('[Shopify Webhook] Invalid HMAC signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const order = JSON.parse(body);
    const supabase = createServiceRoleClient();

    const customerEmail = order.customer?.email || order.email;
    const customerName = [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean)
      .join(' ') || undefined;
    const shopifyOrderId = String(order.id);
    const shopifyOrderNumber = String(order.order_number || '');

    if (!customerEmail) {
      console.error('[Shopify Webhook] No customer email in order', shopifyOrderId);
      return NextResponse.json(
        { error: 'No customer email found' },
        { status: 400 }
      );
    }

    console.log(`[Shopify Webhook] Processing order #${shopifyOrderNumber} for ${customerEmail}`);

    // ── Check for duplicate processing ──
    const { data: existingLicense } = await supabase
      .from('licenses')
      .select('id, activation_code')
      .eq('shopify_order_id', shopifyOrderId)
      .single();

    if (existingLicense) {
      console.log(`[Shopify Webhook] Order #${shopifyOrderNumber} already processed`);
      return NextResponse.json({ status: 'already_processed' });
    }

    // ── Single product = full access → use HSK-1 course as reference ──
    // The user gets access to ALL courses upon activation (no per-course restriction).
    // We store one license row pointing to HSK-1 as the primary course.
    const primaryCourseId = 'a0000000-0000-0000-0000-000000000001'; // HSK-1

    // ── Generate unique activation code ──
    let activationCode: string;
    let codeExists = true;
    do {
      activationCode = generateActivationCode();
      const { data } = await supabase
        .from('licenses')
        .select('id')
        .eq('activation_code', activationCode)
        .single();
      codeExists = !!data;
    } while (codeExists);

    // ── Create pending license ──
    const { error: insertError } = await supabase.from('licenses').insert({
      email: customerEmail.toLowerCase(),
      shopify_order_id: shopifyOrderId,
      shopify_order_number: shopifyOrderNumber,
      activation_code: activationCode,
      course_id: primaryCourseId,
      status: 'pending',
      duration_months: 12,
    });

    if (insertError) {
      console.error('[Shopify Webhook] Error creating license:', insertError);
      return NextResponse.json(
        { error: 'Failed to create license' },
        { status: 500 }
      );
    }

    console.log(`[Shopify Webhook] License created: ${activationCode} for ${customerEmail}`);

    // ── Send activation email via Brevo ──
    const emailResult = await sendActivationEmail(
      customerEmail.toLowerCase(),
      activationCode,
      customerName,
    );

    if (emailResult.success) {
      console.log(`[Shopify Webhook] Activation email sent to ${customerEmail}`);
    } else {
      // Email failed but license is created - not fatal
      // Admin can resend or user can still activate manually
      console.error(`[Shopify Webhook] Email send failed: ${emailResult.error}`);
    }

    return NextResponse.json({
      status: 'ok',
      email_sent: emailResult.success,
    });
  } catch (err) {
    console.error('[Shopify Webhook] Processing error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
