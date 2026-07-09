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
const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' };

const wh = await fetch('https://api.lemonsqueezy.com/v1/webhooks/116876', { headers });
const j = await wh.json();
console.log('webhook events:', j.data?.attributes?.events);
console.log('webhook url:', j.data?.attributes?.url);

for (const id of ['1878450']) {
  const v = await fetch(`https://api.lemonsqueezy.com/v1/variants/${id}`, { headers });
  const vj = await v.json();
  const p = await fetch(`https://api.lemonsqueezy.com/v1/products/${vj.data.relationships.product.data.id}?include=store`, { headers });
  const pj = await p.json();
  const store = pj.included?.find((x) => x.type === 'stores');
  console.log('\nvariant', id);
  console.log('  product:', pj.data?.attributes?.name, pj.data?.attributes?.status);
  console.log('  price:', vj.data?.attributes?.price);
  console.log('  store:', store?.attributes?.slug, store?.id);
  console.log('  test_mode:', vj.data?.attributes?.test_mode);
}
