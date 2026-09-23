const CACHE_TTL = 5 * 60 * 1000;
const cache = globalThis.__tuursimYoutubeCache || (globalThis.__tuursimYoutubeCache = new Map());

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60, stale-while-revalidate=300" }
  });
}

export default async (req) => {
  const key = process.env.YOUTUBE_API_KEY;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return json({ error: "query_required", items: [] }, 400);
  if (!key) return json({ error: "youtube_api_key_missing", items: [] }, 503);

  const order = ["relevance", "viewCount", "date"].includes(url.searchParams.get("order") || "")
    ? url.searchParams.get("order") : "relevance";
  const duration = ["short", "medium", "long"].includes(url.searchParams.get("videoDuration") || "")
    ? url.searchParams.get("videoDuration") : "";
  const definition = ["high", "standard"].includes(url.searchParams.get("videoDefinition") || "")
    ? url.searchParams.get("videoDefinition") : "";
  const captions = ["any", "closedCaption", "none"].includes(url.searchParams.get("videoCaption") || "")
    ? url.searchParams.get("videoCaption") : "";
  const region = /^[A-Z]{2}$/.test(url.searchParams.get("regionCode") || "")
    ? url.searchParams.get("regionCode") : "";

  const cacheKey = JSON.stringify({ q, order, duration, definition, captions, region });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return json(cached.data);

  const params = new URLSearchParams({
    key, part: "snippet", q, type: "video", maxResults: "12",
    order, safeSearch: "moderate", videoEmbeddable: "true", relevanceLanguage: "ar"
  });
  if (region) params.set("regionCode", region);
  if (duration) params.set("videoDuration", duration);
  if (definition) params.set("videoDefinition", definition);
  if (captions) params.set("videoCaption", captions);

  const sr = await fetch("https://www.googleapis.com/youtube/v3/search?" + params);
  if (!sr.ok) { const e = await sr.json().catch(() => ({})); const reason = e?.error?.errors?.[0]?.reason || e?.error?.status || ""; const code = reason === "quotaExceeded" ? "youtube_quota_exceeded" : (reason === "accessNotConfigured" ? "youtube_api_disabled" : "youtube_search_failed"); return json({ error: code, items: [] }, sr.status); }
  const search = await sr.json();
  const ids = (search.items || []).map(x => x.id?.videoId).filter(Boolean).slice(0, 12);
  if (!ids.length) return json({ items: [] });

  const vr = await fetch("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams({
    key, part: "snippet,statistics,contentDetails", id: ids.join(",")
  }));
  if (!vr.ok) { const e = await vr.json().catch(() => ({})); const reason = e?.error?.errors?.[0]?.reason || e?.error?.status || ""; const code = reason === "quotaExceeded" ? "youtube_quota_exceeded" : (reason === "accessNotConfigured" ? "youtube_api_disabled" : "youtube_video_details_failed"); return json({ error: code, items: [] }, vr.status); }
  const details = await vr.json();
  const byId = new Map((details.items || []).map(x => [x.id, x]));
  const now = Date.now();

  const items = ids.map((id, index) => {
    const x = byId.get(id), s = x?.snippet || {}, st = x?.statistics || {};
    const views = Number(st.viewCount || 0), likes = Number(st.likeCount || 0);
    const published = Date.parse(s.publishedAt || "");
    const ageYears = published ? Math.max(0, (now - published) / 31557600000) : 10;
    const recency = 1 / (1 + ageYears);
    const engagement = views ? Math.min(1, (likes / views) * 40) : 0;
    const popularity = views ? Math.min(1, Math.log10(views + 1) / 8) : 0;
    return {
      id, title: s.title || "", description: s.description || "",
      channel: s.channelTitle || "", publishedAt: s.publishedAt || "",
      thumbnail: s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "",
      views, likes, duration: x?.contentDetails?.duration || "",
      url: "https://www.youtube.com/watch?v=" + id,
      embed: "https://www.youtube.com/embed/" + id,
      relevanceRank: index + 1,
      score: (1 - Math.min(1, index / 11)) * 0.35 + popularity * 0.40 + engagement * 0.10 + recency * 0.15
    };
  });

  if (order === "viewCount") items.sort((a, b) => b.views - a.views);
  else if (order === "date") items.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
  else items.sort((a, b) => b.score - a.score);

  const data = { items };
  cache.set(cacheKey, { time: Date.now(), data });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return json(data);
};