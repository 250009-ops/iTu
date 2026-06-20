const base = 'https://itestu.uz/api/v1';

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student', password: 'student' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.accessToken;
}

async function main() {
  const token = await login();
  for (const code of ['MOCK-3013', 'MOCK-5739']) {
    const res = await fetch(`${base}/exam-sessions/${code}/content/listening`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    console.log(`\n${code} -> ${res.status}`);
    console.log(text.slice(0, 500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
