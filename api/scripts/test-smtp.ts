#!/usr/bin/env npx tsx
/**
 * Verify Eskiz SMTP settings from api/.env
 * Usage: cd api && npm run mail:test [recipient@example.com]
 */
import 'dotenv/config';
import * as nodemailer from 'nodemailer';

async function main() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const from =
    process.env.SMTP_FROM?.trim() || 'iTestU <noreply@itestu.uz>';
  const to = process.argv[2]?.trim() || user;

  if (!host || !user || !pass) {
    console.error('Set SMTP_HOST, SMTP_USER, and SMTP_PASS in api/.env');
    process.exit(1);
  }

  if (!to) {
    console.error('Pass a recipient email or set SMTP_USER');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  console.log(`Verifying SMTP ${host}:${port} as ${user}...`);
  await transporter.verify();
  console.log('SMTP connection OK');

  await transporter.sendMail({
    from,
    to,
    subject: 'iTestU SMTP test',
    text: 'If you received this, Eskiz SMTP is configured correctly for iTestU.',
    html: '<p>If you received this, <strong>Eskiz SMTP</strong> is configured correctly for iTestU.</p>',
  });

  console.log(`Test email sent to ${to}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
