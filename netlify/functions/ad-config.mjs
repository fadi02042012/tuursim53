import { getStore } from '@netlify/blobs';

const MAX_IMAGE_DATA_URL_LENGTH = 5_000_000;
const DEFAULT_CONFIG = { enabled: false, imageUrl: '', targetUrl: '', updatedAt: '' };

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

function getUser(event) {
  try { return event.clientContext?.user || null; } catch (_) { return null; }
}

function isAdmin(event) {
  const user = getUser(event);
  if (!user) return false;
  const roles = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];
  if (roles.includes('admin')) return true;
  const configured = String(process.env.ADMIN_EMAILS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  return configured.includes(String(user.email || '').trim().toLowerCase());
}

async function readConfig() {
  const store = getStore({ name: 'tuursim53-site-config', consistency: 'strong' });
  const config = await store.get('ad-config', { type: 'json' });
  return config && typeof config === 'object' ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
}

export default async (event) => {
  const method = event.httpMethod || 'GET';

  if (method === 'GET') {
    try { return json(200, { ok: true, config: await readConfig() }); }
    catch (error) {
      console.error('ad-config GET failed', error);
      return json(200, { ok: true, config: DEFAULT_CONFIG });
    }
  }

  if (!['POST', 'PUT'].includes(method)) return json(405, { ok: false, error: 'method_not_allowed' });
  if (!isAdmin(event)) return json(403, { ok: false, error: 'admin_only' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return json(400, { ok: false, error: 'invalid_json' }); }

  const enabled = Boolean(payload.enabled);
  const imageUrl = String(payload.imageUrl || '').trim();
  const targetUrl = String(payload.targetUrl || '').trim();

  if (imageUrl.length > MAX_IMAGE_DATA_URL_LENGTH) return json(413, { ok: false, error: 'image_too_large' });
  if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(imageUrl)) {
    return json(400, { ok: false, error: 'invalid_image_url' });
  }
  if (targetUrl && !/^https?:\/\//i.test(targetUrl)) return json(400, { ok: false, error: 'invalid_target_url' });

  const config = {
    enabled: enabled && Boolean(imageUrl),
    imageUrl,
    targetUrl,
    updatedAt: new Date().toISOString()
  };

  try {
    const store = getStore({ name: 'tuursim53-site-config', consistency: 'strong' });
    await store.setJSON('ad-config', config);
    return json(200, { ok: true, config });
  } catch (error) {
    console.error('ad-config SAVE failed', error);
    return json(500, { ok: false, error: 'save_failed' });
  }
};
