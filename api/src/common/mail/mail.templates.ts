export type EmailLayoutOptions = {
  preheader?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function buildEmailHtml(options: EmailLayoutOptions): string {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') ?? 'https://itestu.uz';
  const ctaBlock =
    options.ctaLabel && options.ctaUrl
      ? `<p style="margin:28px 0 0;">
          <a href="${options.ctaUrl}" style="display:inline-block;background:#E31837;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">
            ${escapeHtml(options.ctaLabel)}
          </a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(options.preheader ?? options.title)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;padding:24px 28px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">itestu</p>
              <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">IELTS mock exams · practice with confidence</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(options.title)}</h1>
              <div style="font-size:15px;line-height:1.6;color:#334155;">${options.bodyHtml}</div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                ${escapeHtml(options.footerNote ?? `You received this email from iTestU (${appUrl}).`)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(name: string, resetUrl: string) {
  const title = 'Reset your password';
  const text = [
    `Hi ${name},`,
    '',
    'We received a request to reset your iTestU password.',
    `Reset it here: ${resetUrl}`,
    '',
    'This link expires in 1 hour. If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = buildEmailHtml({
    preheader: 'Use this link to choose a new password.',
    title,
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="margin-top:16px;font-size:13px;color:#64748b;">This link expires in <strong>1 hour</strong>. If you did not request a reset, you can safely ignore this email.</p>
    `,
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    footerNote: 'If the button does not work, copy and paste this link into your browser: ' + resetUrl,
  });

  return { subject: title, text, html };
}

export function welcomeEmail(name: string, loginUrl: string) {
  const title = 'Welcome to iTestU';
  const text = [
    `Hi ${name},`,
    '',
    'Your iTestU account is ready. Book a full IELTS mock, complete all four modules, and get examiner-graded Writing and Speaking results.',
    `Sign in: ${loginUrl}`,
  ].join('\n');

  const html = buildEmailHtml({
    preheader: 'Your account is ready — book your first mock.',
    title,
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Welcome to <strong>iTestU</strong>. You can now book a computer-delivered IELTS mock, check in on exam day, and track your band scores when results are released.</p>
    `,
    ctaLabel: 'Go to dashboard',
    ctaUrl: loginUrl,
  });

  return { subject: title, text, html };
}

export function contactInquiryEmail(
  name: string,
  email: string,
  topic: string,
  message: string,
  ticketCode: string,
) {
  const title = `New contact inquiry (${ticketCode})`;
  const text = [
    `Ticket: ${ticketCode}`,
    `Topic: ${topic}`,
    `From: ${name} <${email}>`,
    '',
    message,
    '',
    'Reply directly to this email to respond to the sender.',
  ].join('\n');

  const html = buildEmailHtml({
    preheader: `${topic} — ${name}`,
    title,
    bodyHtml: `
      <p><strong>Ticket:</strong> ${escapeHtml(ticketCode)}</p>
      <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p style="margin-top:16px;white-space:pre-wrap;">${escapeHtml(message)}</p>
      <p style="margin-top:16px;font-size:13px;color:#64748b;">Reply directly to this email to respond to the sender.</p>
    `,
  });

  return { subject: `[${ticketCode}] Contact · ${topic} — ${name}`, text, html };
}

export function contactConfirmationEmail(name: string, ticketCode: string) {
  const title = 'We received your message';
  const text = [
    `Hi ${name},`,
    '',
    `Thanks for contacting iTestU. Your reference is ${ticketCode}.`,
    'Our team will reply within one business day.',
  ].join('\n');

  const html = buildEmailHtml({
    preheader: `Reference ${ticketCode}`,
    title,
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for contacting <strong>iTestU</strong>. We received your message and will get back to you within one business day.</p>
      <p style="margin-top:12px;font-size:13px;color:#64748b;">Reference: <strong>${escapeHtml(ticketCode)}</strong></p>
    `,
  });

  return { subject: `We received your message (${ticketCode})`, text, html };
}

export function portalNotificationEmail(
  name: string,
  title: string,
  body: string,
  actionUrl?: string,
) {
  const text = [`Hi ${name},`, '', title, '', body, actionUrl ? `Open: ${actionUrl}` : '']
    .filter(Boolean)
    .join('\n');

  const html = buildEmailHtml({
    preheader: body.slice(0, 120),
    title,
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>${escapeHtml(body)}</p>
    `,
    ctaLabel: actionUrl ? 'View in iTestU' : undefined,
    ctaUrl: actionUrl,
  });

  return { subject: title, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
