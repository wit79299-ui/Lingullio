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

// ── Types for Shopify line items ──
interface ShopifyLineItem {
  sku?: string;
  variant_id?: number;
  product_id?: number;
  title?: string;
  quantity?: number;
}

interface SkuMapping {
  sku: string;
  course_id: string | null;
  product_id: string | null;
  grants_full_product: boolean;
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
      .limit(1)
      .maybeSingle();

    if (existingLicense) {
      console.log(`[Shopify Webhook] Order #${shopifyOrderNumber} already processed`);
      return NextResponse.json({ status: 'already_processed' });
    }

    // ── Extract SKUs from order line items ──
    const lineItems: ShopifyLineItem[] = order.line_items || [];
    const skus = lineItems
      .map((item) => item.sku?.toUpperCase())
      .filter((sku): sku is string => !!sku);

    console.log(`[Shopify Webhook] Order SKUs: ${skus.join(', ') || '(none)'}`);

    // ── Lookup SKU mappings from database ──
    let resolvedMappings: SkuMapping[] = [];

    if (skus.length > 0) {
      const { data: mappings, error: mappingError } = await supabase
        .from('shopify_sku_mappings')
        .select('sku, course_id, product_id, grants_full_product')
        .in('sku', skus);

      if (mappingError) {
        console.error('[Shopify Webhook] Error looking up SKU mappings:', mappingError);
      } else {
        resolvedMappings = (mappings || []) as SkuMapping[];
      }
    }

    // ── Fallback: if no SKU mapping found, use default HSK full access ──
    // This preserves backward compatibility for orders without SKUs configured
    if (resolvedMappings.length === 0) {
      console.warn('[Shopify Webhook] No SKU mappings found, falling back to HSK full access');
      resolvedMappings = [{
        sku: 'HSK-MASTERY',
        course_id: 'a0000000-0000-0000-0000-000000000001', // HSK-1 as reference
        product_id: 'f0000000-0000-0000-0000-000000000001', // LINGULLIO-HSK
        grants_full_product: true,
      }];
    }

    // ── Determine what to grant ──
    // Group by product_id to avoid duplicate licenses for the same product
    const productGrants = new Map<string, {
      product_id: string;
      course_id: string | null;
      grants_full_product: boolean;
    }>();

    for (const mapping of resolvedMappings) {
      const productId = mapping.product_id || 'unknown';
      const existing = productGrants.get(productId);

      if (!existing) {
        productGrants.set(productId, {
          product_id: mapping.product_id!,
          course_id: mapping.course_id,
          grants_full_product: mapping.grants_full_product,
        });
      } else if (mapping.grants_full_product && !existing.grants_full_product) {
        // Upgrade to full product access if any SKU grants it
        existing.grants_full_product = true;
      }
    }

    // ── Generate unique activation code ──
    let activationCode: string;
    let codeExists = true;
    do {
      activationCode = generateActivationCode();
      const { data } = await supabase
        .from('licenses')
        .select('id')
        .eq('activation_code', activationCode)
        .maybeSingle();
      codeExists = !!data;
    } while (codeExists);

    // ── Create license(s) ── one per product ──
    // For simplicity, we create one license with the activation code.
    // If multiple products are in the order, we create one license per product
    // but share the same activation code (the user activates once, gets all).
    const grants = Array.from(productGrants.values());
    const licensesToInsert = grants.map((grant) => ({
      email: customerEmail.toLowerCase(),
      shopify_order_id: shopifyOrderId,
      shopify_order_number: shopifyOrderNumber,
      activation_code: activationCode, // Same code for all licenses in this order
      course_id: grant.course_id || getDefaultCourseForProduct(grant.product_id),
      product_id: grant.product_id,
      grants_full_product: grant.grants_full_product,
      status: 'pending' as const,
      duration_months: 12,
    }));

    // If multiple products, each license after the first needs a unique activation_code
    // because activation_code has a UNIQUE constraint
    for (let i = 1; i < licensesToInsert.length; i++) {
      let extraCode: string;
      let extraCodeExists = true;
      do {
        extraCode = generateActivationCode();
        const { data } = await supabase
          .from('licenses')
          .select('id')
          .eq('activation_code', extraCode)
          .maybeSingle();
        extraCodeExists = !!data;
      } while (extraCodeExists || extraCode === activationCode);
      licensesToInsert[i].activation_code = extraCode;
    }

    const { error: insertError } = await supabase
      .from('licenses')
      .insert(licensesToInsert);

    if (insertError) {
      console.error('[Shopify Webhook] Error creating license(s):', insertError);
      return NextResponse.json(
        { error: 'Failed to create license' },
        { status: 500 }
      );
    }

    const productNames = grants.map((g) => getProductLabel(g.product_id)).join(' + ');
    console.log(`[Shopify Webhook] ${grants.length} license(s) created for ${customerEmail}: ${productNames}`);

    // ── Send activation email via Brevo ──
    // Send one email with the primary activation code
    const emailResult = await sendActivationEmail(
      customerEmail.toLowerCase(),
      activationCode,
      customerName,
    );

    if (emailResult.success) {
      console.log(`[Shopify Webhook] Activation email sent to ${customerEmail}`);
    } else {
      console.error(`[Shopify Webhook] Email send failed: ${emailResult.error}`);
    }

    return NextResponse.json({
      status: 'ok',
      licenses_created: grants.length,
      products: grants.map((g) => g.product_id),
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

// ── Helper: get default course_id for a product (first course of that product) ──
function getDefaultCourseForProduct(productId: string): string {
  // Known defaults - these are the "reference" courses for each product
  const defaults: Record<string, string> = {
    'f0000000-0000-0000-0000-000000000001': 'a0000000-0000-0000-0000-000000000001', // HSK -> HSK-1
    'f0000000-0000-0000-0000-000000000002': 'b0000000-0000-0000-0000-000000000001', // TEF -> TEF-CO
  };
  return defaults[productId] || 'a0000000-0000-0000-0000-000000000001';
}

// ── Helper: human-readable product label for logging ──
function getProductLabel(productId: string): string {
  const labels: Record<string, string> = {
    'f0000000-0000-0000-0000-000000000001': 'LINGULLIO-HSK',
    'f0000000-0000-0000-0000-000000000002': 'LINGULLIO-TEF',
  };
  return labels[productId] || productId;
}
