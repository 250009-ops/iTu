import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(join(ROOT, 'api', '.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let val = l.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return [l.slice(0, i).trim(), val];
    }),
);

const apiKey = env.LEMON_SQUEEZY_API_KEY;
const secret = env.LEMON_SQUEEZY_WEBHOOK_SECRET;
const webhookId = '116876';
const webhookUrl = 'https://itestu.uz/api/v1/payments/webhooks/lemon-squeezy';
const events = ['order_created', 'order_paid', 'order_refunded'];
const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
};

const r = await fetch(`https://api.lemonsqueezy.com/v1/webhooks/${webhookId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    data: {
      type: 'webhooks',
      id: webhookId,
      attributes: {
        url: webhookUrl,
        events,
        secret,
      },
    },
  }),
});
const j = await r.json();
console.log('update webhook:', r.status);
if (r.ok) {
  console.log('url:', j.data?.attributes?.url);
  console.log('events:', j.data?.attributes?.events);
} else {
  console.log(JSON.stringify(j, null, 2));
}
