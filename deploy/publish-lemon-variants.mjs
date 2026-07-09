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

const variants = {
  'full-academic-mock': '1873379',
  'writing-only': '1873383',
  'speaking-only': '1873381',
  'reading-only': '1873394',
  'listening-only': '1873395',
};

for (const [slug, id] of Object.entries(variants)) {
  const r = await fetch(`https://api.lemonsqueezy.com/v1/variants/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        type: 'variants',
        id,
        attributes: { status: 'published' },
      },
    }),
  });
  const j = await r.json();
  console.log(
    slug,
    id,
    r.status,
    j.data?.attributes?.status ?? JSON.stringify(j.errors ?? j).slice(0, 200),
  );
}
