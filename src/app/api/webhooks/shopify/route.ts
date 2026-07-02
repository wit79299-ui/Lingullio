import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
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
// Handles order/paid webhook from Shopify
export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('SHOPIFY_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const order = JSON.parse(body);
    const supabase = createServiceRoleClient();

    const customerEmail = order.customer?.email || order.email;
    const shopifyOrderId = String(order.id);
    const shopifyOrderNumber = String(order.order_number);

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No customer email found' },
        { status: 400 }
      );
    }

    // Find the course to associate (based on product SKU or default to first published course)
    // For now, we map based on the first line item SKU
    const lineItems = order.line_items || [];
    let courseSlug = 'hsk-1'; // default

    for (const item of lineItems) {
      if (item.sku) {
        // SKU format expected: HSK-1, HSK-2, etc.
        courseSlug = item.sku.toLowerCase().replace('_', '-');
        break;
      }
    }

    // Look up the course
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseSlug)
      .single();

    if (!course) {
      console.error(`Course not found for slug: ${courseSlug}`);
      // Use a fallback or return error
      return NextResponse.json(
        { error: `Course not found: ${courseSlug}` },
        { status: 404 }
      );
    }

    // Check if license already exists for this order
    const { data: existingLicense } = await supabase
      .from('licenses')
      .select('id')
      .eq('shopify_order_id', shopifyOrderId)
      .single();

    if (existingLicense) {
      // Already processed
      return NextResponse.json({ status: 'already_processed' });
    }

    // Generate unique activation code
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

    // Create pending license
    const { error: insertError } = await supabase.from('licenses').insert({
      email: customerEmail.toLowerCase(),
      shopify_order_id: shopifyOrderId,
      shopify_order_number: shopifyOrderNumber,
      activation_code: activationCode,
      course_id: course.id,
      status: 'pending',
      duration_months: 12,
    });

    if (insertError) {
      console.error('Error creating license:', insertError);
      return NextResponse.json(
        { error: 'Failed to create license' },
        { status: 500 }
      );
    }

    // TODO: Send activation email via Brevo with the activation code
    // For now, log the code
    console.log(
      `License created for ${customerEmail}: code ${activationCode}`
    );

    return NextResponse.json({
      status: 'ok',
      activation_code: activationCode,
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
