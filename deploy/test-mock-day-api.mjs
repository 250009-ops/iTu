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
  const hub = await fetch(`${base}/students/mock-day`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const hubData = await hub.json();
  console.log('Mock day hub:', JSON.stringify(hubData.enrollment, null, 2));

  const code = hubData.enrollment?.sessionCode;
  if (!code) return;

  const res = await fetch(`${base}/exam-sessions/${code}/content/listening`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log(`\n${code} listening -> ${res.status}`);
  const parsed = JSON.parse(text);
  console.log('audioTracks:', parsed.content?.audioTracks?.length ?? 0);
  if (parsed.content?.audioTracks?.[0]) {
    console.log('first track url:', parsed.content.audioTracks[0].url?.slice(0, 80));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
