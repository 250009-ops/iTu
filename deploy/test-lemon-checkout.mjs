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
const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
};

async function testCheckout(label, storeId, withCustom) {
  const attributes = {
    checkout_options: { embed: false },
    product_options: {
      name: 'Writing Only',
      redirect_url: 'https://itestu.uz/student/mock-day?payment=success',
      receipt_button_text: 'Go to Mock Day',
    },
  };
  if (withCustom) {
    attributes.checkout_data = {
      email: 'test@itestu.uz',
      name: 'Test',
      custom: { order_id: 'test-order', order_code: 'TEST-001' },
    };
  }

  const r = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes,
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: '1873383' } },
        },
      },
    }),
  });
  const j = await r.json();
  const url = j.data?.attributes?.url;
  console.log(`\n=== ${label} (${r.status}) ===`);
  console.log(url);
  if (!url) return console.log(JSON.stringify(j, null, 2));

  const hop = await fetch(url, { redirect: 'manual' });
  console.log('redirect:', hop.status, hop.headers.get('location'));
}

await testCheckout('readu + custom', '397235', true);
await testCheckout('readu no custom', '397235', false);
await testCheckout('itestu + custom', '425053', true);

const buyUrls = [
  'https://readu.lemonsqueezy.com/checkout/buy/1873383',
  'https://readu.lemonsqueezy.com/checkout/buy/52508a26-a275-4337-a0e9-6b037eabdaf0',
  'https://readu.lemonsqueezy.com/checkout/buy/52508a26-a275-4337-a0e9-6b037eabdaf0?checkout[custom][order_id]=abc&checkout[email]=test@itestu.uz',
];
for (const u of buyUrls) {
  const hop = await fetch(u, { redirect: 'manual' });
  console.log('\nbuy', u);
  console.log('redirect:', hop.status, hop.headers.get('location'));
}
