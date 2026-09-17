// ============================================================
// 03-links.js - روابط البحث المتقدم (48 تصنيفاً) + مجموعات
// ============================================================
const searches = [
    { name: "📺 البحث العادي", group: "أساسي", base: "https://www.youtube.com/results?search_query=", suffix: "" },
    { name: "🔥 الترتيب حسب عدد المشاهدات", group: "الترتيب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAMSAhAB" },
    { name: "⭐ الترتيب حسب التقييم", group: "الترتيب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAESAhAB" },
    { name: "📅 الترتيب حسب تاريخ التحميل", group: "الترتيب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAI%253D" },
    { name: "📝 البحث في عنوان الفيديو", group: "الترتيب", base: "https://www.youtube.com/results?search_query=intitle%3A%22", suffix: "%22" },
    { name: "🕐 آخر ساعة", group: "التاريخ", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIIAQ%253D%253D" },
    { name: "📆 اليوم", group: "التاريخ", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIAhAB" },
    { name: "📅 هذا الأسبوع", group: "التاريخ", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIAxAB" },
    { name: "🗓 هذا الشهر", group: "التاريخ", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIBBAB" },
    { name: "📖 هذا العام", group: "التاريخ", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIBRAB" },
    { name: "⏱ أقل من 4 دقائق", group: "المدة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAQ%253D%253D" },
    { name: "⌛ بين 4 و20 دقيقة", group: "المدة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAw%253D%253D" },
    { name: "🎬 أكثر من 20 دقيقة", group: "المدة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAg%253D%253D" },
    { name: "🎥 فيديوهات 4K", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJwAQ%253D%253D" },
    { name: "✨ HDR", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgPIAQE%253D" },
    { name: "📺 دقة HD", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIgAQ%253D%253D" },
    { name: "🌍 فيديوهات 360°", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJ4AQ%253D%253D" },
    { name: "🥽 VR180", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgPQAQE%253D" },
    { name: "🎞 ثلاثي الأبعاد", group: "الجودة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgI4AQ%253D%253D" },
    { name: "🏆 أكثر من 20 دقيقة + الأعلى مشاهدة", group: "مركب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAMSAhgC" },
    { name: "🎞 أكثر من 20 دقيقة + 4K", group: "مركب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgYQBBgCcAE%253D" },
    { name: "💎 أكثر من 20 دقيقة + 4K + HD", group: "مركب", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgYYAiABcAE%253D" },
    { name: "🎥 فيديوهات فقط", group: "نوع المحتوى", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAQ%253D%253D" },
    { name: "📺 قنوات", group: "نوع المحتوى", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAg%253D%253D" },
    { name: "📂 قوائم تشغيل", group: "نوع المحتوى", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAw%253D%253D" },
    { name: "🎬 أفلام", group: "نوع المحتوى", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQBA%253D%253D" },
    { name: "📡 بث مباشر", group: "نوع المحتوى", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJAAQ%253D%253D" },
    { name: "🎬 YouTube Shorts", group: "منصات", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&udm=39" },
    { name: "🔍 البحث في Google عن فيديوهات YouTube", group: "منصات", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&tbm=vid" },
    { name: "🆕 فيديوهات YouTube الأحدث (Google)", group: "منصات", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&num=100&udm=7&tbs=qdr:d" },
    { name: "📈 ترند YouTube", group: "منصات", base: "https://www.google.com/search?q=", suffix: "+site:https://www.youtube.com/feed/trending" },
    { name: "📂 قوائم تشغيل YouTube", group: "منصات", base: "https://www.google.com/search?q=", suffix: "+site:https://www.youtube.com/user/*/playlists" },
    { name: "📺 البحث داخل قناة TEDx", group: "قنوات محددة", base: "https://www.youtube.com/@TEDx/search?query=", suffix: "" },
    { name: "📺 البحث داخل قناة ArabicMOD", group: "قنوات محددة", base: "https://www.youtube.com/@ArabicMOD/search?query=", suffix: "" },
    { name: "📺 البحث داخل قناة Fortinet", group: "قنوات محددة", base: "https://www.youtube.com/@fortinet/search?query=", suffix: "" },
    { name: "😂 البحث داخل قناة Gags", group: "قنوات محددة", base: "https://www.youtube.com/@gags/search?query=", suffix: "" },
    { name: "📖 البحث داخل قناة Sautuliman", group: "قنوات محددة", base: "https://www.youtube.com/@Sautuliman-AljameatusSaifiyah/search?query=", suffix: "" },
    { name: "🎥 Vimeo", group: "منصات", base: "https://www.google.com/search?q=site:https://vimeo.com+", suffix: "" },
    { name: "🎞 Dailymotion", group: "منصات", base: "https://www.dailymotion.com/search/", suffix: "/videos" },
    { name: "▶ Playeur", group: "منصات", base: "https://playeur.com/search?q=", suffix: "" },
    { name: "🎬 Youku", group: "منصات", base: "https://so.youku.com/search_video/q_", suffix: "?searchfrom=1" },
    { name: "📺 Bilibili", group: "منصات", base: "https://search.bilibili.com/all?keyword=", suffix: "&from_source=webtop_search" },
    { name: "📹 Bing Video", group: "منصات", base: "https://www.bing.com/videos/search?q=", suffix: "" },
    { name: "📹 Yahoo Video", group: "منصات", base: "https://video.search.yahoo.com/search/video?p=", suffix: "" },
    { name: "📹 AOL Video", group: "منصات", base: "https://search.aol.com/aol/video?q=", suffix: "" },
    { name: "📹 Yandex Video", group: "منصات", base: "https://yandex.com/video/search?text=", suffix: "" },
    { name: "🌍 EarthCam", group: "منصات", base: "https://www.earthcam.com/search/ft_search.php?term=", suffix: "" },
    { name: "📷 WebCamTaxi", group: "منصات", base: "https://www.webcamtaxi.com/en/search.html?searchword=", suffix: "&searchphrase=all" }
];

function generateAdvancedLink(query, index = 0) {
    const search = searches[Math.max(0, Math.min(searches.length - 1, Number(index) || 0))];
    return search.base + encodeURIComponent(String(query || '')) + search.suffix;
}

function generateAllLinks(query) {
    return searches.map((search, index) => ({ id: index + 1, name: search.name, url: generateAdvancedLink(query, index) }));
}

window.getAdvancedLinksCount = () => searches.length;
window.getAdvancedLinkName = index => searches[Math.max(0, Math.min(searches.length - 1, Number(index) || 0))].name;
window.generateAdvancedLink = generateAdvancedLink;
window.getAdvancedSearches = () => searches.map((item, index) => ({ index, name: item.name, group: item.group }));

console.log('✅ 03-links.js تم تحميله بنجاح — 48 تصنيفاً منظماً');
