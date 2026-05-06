type PaymentReceiptArgs = {
  recipientEmail: string;
  recipientName?: string;
  planName: string;
  creditsGranted: number;
  newBalance: number;
  amountUsd: string;
  transactionId: string;
  paidAt: Date;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://theproductshot.com';

export function buildPaymentReceipt(args: PaymentReceiptArgs) {
  const {

    recipientName,
    planName,
    creditsGranted,
    newBalance,
    amountUsd,
    transactionId,
    paidAt,
  } = args;

  const greeting = recipientName ? `Hi ${recipientName.split(' ')[0]},` : 'Hi,';
  const dateStr = paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Your ${creditsGranted} credits are ready`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;color:#0a0a0a;">Your credits are ready 🎉</h1>
              <p style="margin:0;font-size:16px;line-height:1.5;color:#525252;">${greeting}</p>
              <p style="margin:8px 0 0 0;font-size:16px;line-height:1.5;color:#525252;">Thanks for your purchase. Your ProductShot credits have been added.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background-color:#f9fafb;border:1px solid #e5e5e5;border-radius:12px;"><tr><td style="padding:20px 24px;"><p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#737373;">Credits added</p><p style="margin:6px 0 0 0;font-size:36px;font-weight:600;color:#0a0a0a;">+${creditsGranted}</p><p style="margin:6px 0 0 0;font-size:14px;color:#525252;">New balance: <strong>${newBalance} credits</strong></p></td></tr></table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;"><tr><td align="center"><a href="${SITE_URL}/generate" style="display:inline-block;background-color:#4338ca;color:#fff;text-decoration:none;font-weight:500;font-size:15px;padding:12px 24px;border-radius:8px;">Generate photos →</a></td></tr></table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid #e5e5e5;padding-top:24px;font-size:14px;color:#525252;">
              <tr><td style="color:#737373;adding-bottom:6px;">Plan</td><td style="color:#0a0a0a;padding-bottom:6px;">${planName}</td></tr>
              <tr><td style="color:#737373;padding-bottom:6px;">Amount</td><td style="color:#0a0a0a;padding-bottom:6px;">$${amountUsd} USD</td></tr>
              <tr><td style="color:#737373;padding-bottom:6px;">Date</td><td style="color:#0a0a0a;padding-bottom:6px;">${dateStr}</td></tr>
              <tr><td style="color:#737373;padding-bottom:6px;vertical-align:top;">Txn</td><td style="color:#0a0a0a;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;padding-bottom:6px;">${transactionId}</td></tr>
              </table>
              <p style="margin:32px 0 0 0;font-size:13px;color:#737373;">Need help? Reply or email <a href="mailto:hello@theproductshot.com" style="color:#4338ca;">hello@theproductshot.com</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Your ${creditsGranted} credits are ready

${greeting}

Thanks for your purchase. Your ProductShot credits have been added.

Credits added: +${creditsGranted}
New balance: ${newBalance} credits

Generate photos: ${SITE_URL}/generate

Receipt
-------
Plan: ${planName}
Amount: $${amountUsd} USD
Date: ${dateStr}
Txn: ${transactionId}

Help: reply or email hello@theproductshot.com
${SITE_URL}`;

  return { subject, html, text };
}
