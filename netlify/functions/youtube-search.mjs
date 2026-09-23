export default async (req) => {
  const key = process.env.YOUTUBE_API_KEY;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return Response.json({ error: "query_required", items: [] }, { status: 400 });
  if (!key) return Response.json({ error: "youtube_api_key_missing", items: [] }, { status: 503 });

  const params = new URLSearchParams({
    key, part: "snippet", q, type: "video", maxResults: "24",
    order: url.searchParams.get("order") || "relevance",
    safeSearch: "moderate", videoEmbeddable: "true",
    relevanceLanguage: "ar"
  });
  const region = url.searchParams.get("regionCode");
  const duration = url.searchParams.get("videoDuration");
  const hd = url.searchParams.get("videoDefinition");
  const captions = url.searchParams.get("videoCaption");
  if (region) params.set("regionCode", region);
  if (duration && ["short","medium","long"].includes(duration)) params.set("videoDuration", duration);
  if (hd && ["high","standard"].includes(hd)) params.set("videoDefinition", hd);
  if (captions && ["any","closedCaption","none"].includes(captions)) params.set("videoCaption", captions);

  const sr = await fetch("https://www.googleapis.com/youtube/v3/search?" + params);
  if (!sr.ok) return Response.json({ error: "youtube_search_failed", items: [] }, { status: sr.status });
  const search = await sr.json();
  const ids = (search.items || []).map(x => x.id?.videoId).filter(Boolean);
  if (!ids.length) return Response.json({ items: [] });

  const vr = await fetch("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams({
    key, part: "snippet,statistics,contentDetails", id: ids.join(",")
  }));
  if (!vr.ok) return Response.json({ error: "youtube_video_details_failed", items: [] }, { status: vr.status });
  const details = await vr.json();
  const byId = new Map((details.items || []).map(x => [x.id, x]));

  const items = ids.map(id => {
    const x = byId.get(id), s = x?.snippet || {};
    const st = x?.statistics || {};
    const views = Number(st.viewCount || 0), likes = Number(st.likeCount || 0);
    return {
      id, title: s.title || "", description: s.description || "",
      channel: s.channelTitle || "", publishedAt: s.publishedAt || "",
      thumbnail: s.thumbnails?.high?.url || s.thumbnails?.medium?.url || "",
      views, likes, duration: x?.contentDetails?.duration || "",
      url: "https://www.youtube.com/watch?v=" + id,
      embed: "https://www.youtube.com/embed/" + id,
      score: views ? Math.log10(views + 1) * 0.65 + Math.log10(likes + 1) * 0.2 + (s.publishedAt ? Math.max(0, 1 - (Date.now()-Date.parse(s.publishedAt))/31557600000)*0.15 : 0) : 0
    };
  });
  items.sort((a,b)=>b.score-a.score);
  return Response.json({ items });
};