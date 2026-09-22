import crypto from 'node:crypto';

const COOKIE = 'tuursim_admin_session';
const MAX_AGE = 60 * 60 * 12;

function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function sign(exp) {
  return crypto.createHmac('sha256', String(process.env.ADMIN_PASSWORD || '')).update(String(exp)).digest('hex');
}

function validPassword(password) {
  const expected = String(process.env.ADMIN_PASSWORD || '');
  return expected.length >= 8 && String(password || '') === expected;
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export default async (event) => {
  const method = event.httpMethod || 'GET';

  if (method === 'GET') {
    const raw = String(event.headers?.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
    const value = raw ? raw.slice(COOKIE.length + 1) : '';
    const parts = value.split('.');
    const exp = Number(parts[0]);
    const sig = parts[1] || '';
    const expected = Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000) ? sign(exp) : '';
    const ok = Boolean(sig && expected && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
    return json(200, { ok, authenticated: ok });
  }

  if (method === 'DELETE') {
    return json(200, { ok: true }, { 'set-cookie': cookie('', 0) });
  }

  if (method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { ok: false, error: 'invalid_json' }); }

  if (!validPassword(payload.password)) return json(401, { ok: false, error: 'invalid_password' });

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return json(200, { ok: true, authenticated: true }, { 'set-cookie': cookie(`${exp}.${sign(exp)}`, MAX_AGE) });
};
