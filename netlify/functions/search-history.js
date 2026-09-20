const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'fadi02042012/tuursim53';
const TOKEN = process.env.GITHUB_TOKEN;

function userFileId(name) {
  return crypto.createHash('sha256').update(String(name || '').trim().toLowerCase()).digest('hex').slice(0, 24);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }
  if (!TOKEN) {
    return { statusCode: 503, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'GITHUB_TOKEN_NOT_CONFIGURED' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const user = String(body.user || '').trim();
    const query = String(body.query || '').trim();
    if (!user || !query) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'user_and_query_required' }) };
    }

    const filePath = `data/search-history/${userFileId(user)}.json`;
    const apiBase = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };

    let history = [];
    let sha = null;
    const existing = await fetch(apiBase, { headers });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
      try {
        history = JSON.parse(Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8'));
      } catch (_) { history = []; }
    } else if (existing.status !== 404) {
      throw new Error(`github_read_${existing.status}`);
    }

    if (!Array.isArray(history)) history = [];
    history.unshift({
      query,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 200);

    const content = Buffer.from(JSON.stringify(history, null, 2), 'utf8').toString('base64');
    const payload = {
      message: `Update search history for user ${userFileId(user)}`,
      content,
      branch: 'main'
    };
    if (sha) payload.sha = sha;

    const saved = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    if (!saved.ok) throw new Error(`github_write_${saved.status}`);

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error('search-history error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'history_save_failed' }) };
  }
};
