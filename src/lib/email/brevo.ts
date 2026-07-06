/**
 * Brevo (ex-Sendinblue) transactional email service.
 *
 * Uses the Brevo REST API v3 to send transactional emails.
 * Requires BREVO_API_KEY env var and BREVO_SENDER_EMAIL / BREVO_SENDER_NAME.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey === 'placeholder') {
    console.warn('[Brevo] API key not configured, skipping email send');
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@lingullio.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Lingullio';

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Brevo] Email send failed:', response.status, errorBody);
      return { success: false, error: `Brevo API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('[Brevo] Email sent successfully:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('[Brevo] Email send error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Send the activation email with the license code.
 */
export async function sendActivationEmail(
  customerEmail: string,
  activationCode: string,
  customerName?: string,
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lingullio.vercel.app';
  const activateUrl = `${appUrl}/en/activate`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488, #059669); padding: 32px 40px; text-align: center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                Lingullio
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">
                Your Chinese learning journey starts now
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;font-weight:600;">
                Welcome${customerName ? `, ${customerName}` : ''}!
              </h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Thank you for your purchase. Your Lingullio account is ready to be activated. Use the code below to create your account and start learning Chinese.
              </p>

              <!-- Activation Code Box -->
              <div style="background:#f0fdfa;border:2px solid #99f6e4;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="color:#0d9488;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">
                  Your activation code
                </p>
                <p style="color:#0f172a;font-size:32px;font-weight:800;letter-spacing:4px;margin:0;font-family:monospace;">
                  ${activationCode}
                </p>
              </div>

              <!-- Steps -->
              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px;">
                <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 12px;">How to activate:</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">
                      <span style="display:inline-block;width:24px;height:24px;background:#0d9488;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
                      Go to the activation page
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">
                      <span style="display:inline-block;width:24px;height:24px;background:#0d9488;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
                      Enter your email: <strong style="color:#334155;">${customerEmail}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">
                      <span style="display:inline-block;width:24px;height:24px;background:#0d9488;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
                      Enter your activation code
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">
                      <span style="display:inline-block;width:24px;height:24px;background:#0d9488;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">4</span>
                      Choose a password and start learning!
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${activateUrl}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#059669);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                  Activate my account
                </a>
              </div>

              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;text-align:center;">
                This code is valid for 30 days. If you have any issues, contact us at support@lingullio.com
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Lingullio &mdash; Master Chinese, one step at a time.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `Welcome to Lingullio${customerName ? `, ${customerName}` : ''}!

Thank you for your purchase. Your activation code is: ${activationCode}

To activate your account:
1. Go to ${activateUrl}
2. Enter your email: ${customerEmail}
3. Enter your activation code: ${activationCode}
4. Choose a password and start learning!

This code is valid for 30 days.
If you have any issues, contact us at support@lingullio.com

Lingullio - Master Chinese, one step at a time.`;

  return sendEmail({
    to: [{ email: customerEmail, name: customerName }],
    subject: 'Your Lingullio activation code',
    htmlContent,
    textContent,
  });
}
