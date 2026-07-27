// ============================================================
// 03-links.js - روابط YouTube والبحث المتقدم (51 رابط)
// ============================================================

// ============================================================
// 1. مصفوفة الروابط (51 رابط مرتبة منطقياً حسب النوع)
// ============================================================
const searches = [
    // ============================================================
    // القسم 1: البحث الأساسي في YouTube (5 روابط)
    // ============================================================
    { name: "📺 البحث العادي", base: "https://www.youtube.com/results?search_query=", suffix: "" },
    { name: "🔥 الترتيب حسب عدد المشاهدات", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAMSAhAB" },
    { name: "⭐ الترتيب حسب التقييم", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAESAhAB" },
    { name: "📅 الترتيب حسب تاريخ التحميل", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAI%253D" },
    { name: "📝 البحث في عنوان الفيديو", base: "https://www.youtube.com/results?search_query=intitle%3A%22", suffix: "%22" },

    // ============================================================
    // القسم 2: فلترة الوقت (5 روابط)
    // ============================================================
    { name: "🕐 آخر ساعة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIIAQ%253D%253D" },
    { name: "📆 اليوم", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIAhAB" },
    { name: "📅 هذا الأسبوع", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIAxAB" },
    { name: "🗓 هذا الشهر", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIBBAB" },
    { name: "📖 هذا العام", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgQIBRAB" },

    // ============================================================
    // القسم 3: فلترة المدة (3 روابط)
    // ============================================================
    { name: "⏱ أقل من 4 دقائق", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAQ%253D%253D" },
    { name: "⌛ بين 4 و20 دقيقة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAw%253D%253D" },
    { name: "🎬 أكثر من 20 دقيقة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIYAg%253D%253D" },

    // ============================================================
    // القسم 4: فلترة الجودة (6 روابط)
    // ============================================================
    { name: "🎥 فيديوهات 4K", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJwAQ%253D%253D" },
    { name: "✨ HDR", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgPIAQE%253D" },
    { name: "📺 دقة HD", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIgAQ%253D%253D" },
    { name: "🌍 فيديوهات 360°", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJ4AQ%253D%253D" },
    { name: "🥽 VR180", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgPQAQE%253D" },
    { name: "🎞 ثلاثي الأبعاد", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgI4AQ%253D%253D" },

    // ============================================================
    // القسم 5: مجموعات متقدمة (مدة + جودة) (3 روابط)
    // ============================================================
    { name: "🏆 أكثر من 20 دقيقة + الأعلى مشاهدة", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=CAMSAhgC" },
    { name: "🎞 أكثر من 20 دقيقة + 4K", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgYQBBgCcAE%253D" },
    { name: "💎 أكثر من 20 دقيقة + 4K + HD", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgYYAiABcAE%253D" },

    // ============================================================
    // القسم 6: أنواع المحتوى (6 روابط)
    // ============================================================
    { name: "🎥 فيديوهات فقط", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAQ%253D%253D" },
    { name: "📺 قنوات", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAg%253D%253D" },
    { name: "📂 قوائم تشغيل", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQAw%253D%253D" },
    { name: "🎬 أفلام", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgIQBA%253D%253D" },
    { name: "📡 بث مباشر", base: "https://www.youtube.com/results?search_query=", suffix: "&sp=EgJAAQ%253D%253D" },
    { name: "🎬 YouTube Shorts", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&udm=39" },

    // ============================================================
    // القسم 7: بحث متقدم في Google (4 روابط)
    // ============================================================
    { name: "🔍 البحث في Google عن فيديوهات YouTube", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&tbm=vid" },
    { name: "🆕 فيديوهات YouTube الأحدث (Google)", base: "https://www.google.com/search?q=site:youtube.com+", suffix: "&num=100&udm=7&tbs=qdr:d" },
    { name: "📈 ترند YouTube", base: "https://www.google.com/search?q=", suffix: "+site:https://www.youtube.com/feed/trending" },
    { name: "📂 قوائم تشغيل YouTube", base: "https://www.google.com/search?q=", suffix: "+site:https://www.youtube.com/user/*/playlists" },

    // ============================================================
    // القسم 8: قنوات محددة (5 روابط)
    // ============================================================
    { name: "📺 البحث داخل قناة TEDx", base: "https://www.youtube.com/@TEDx/search?query=", suffix: "" },
    { name: "📺 البحث داخل قناة ArabicMOD", base: "https://www.youtube.com/@ArabicMOD/search?query=", suffix: "" },
    { name: "📺 البحث داخل قناة Fortinet", base: "https://www.youtube.com/@fortinet/search?query=", suffix: "" },
    { name: "😂 البحث داخل قناة Gags", base: "https://www.youtube.com/@gags/search?query=", suffix: "" },
    { name: "📖 البحث داخل قناة Sautuliman", base: "https://www.youtube.com/@Sautuliman-AljameatusSaifiyah/search?query=", suffix: "" },

    // ============================================================
    // القسم 9: منصات فيديو أخرى (5 روابط)
    // ============================================================
    { name: "🎥 Vimeo", base: "https://www.google.com/search?q=site:https://vimeo.com+", suffix: "" },
    { name: "🎞 Dailymotion", base: "https://www.dailymotion.com/search/", suffix: "/videos" },
    { name: "▶ Playeur", base: "https://playeur.com/search?q=", suffix: "" },
    { name: "🎬 Youku", base: "https://so.youku.com/search_video/q_", suffix: "?searchfrom=1" },
    { name: "📺 Bilibili", base: "https://search.bilibili.com/all?keyword=", suffix: "&from_source=webtop_search" },

    // ============================================================
    // القسم 10: محركات بحث فيديو (4 روابط)
    // ============================================================
    { name: "📹 Bing Video", base: "https://www.bing.com/videos/search?q=", suffix: "" },
    { name: "📹 Yahoo Video", base: "https://video.search.yahoo.com/search/video?p=", suffix: "" },
    { name: "📹 AOL Video", base: "https://search.aol.com/aol/video?q=", suffix: "" },
    { name: "📹 Yandex Video", base: "https://yandex.com/video/search?text=", suffix: "" },

    // ============================================================
    // القسم 11: كاميرات الويب (2 روابط)
    // ============================================================
    { name: "🌍 EarthCam", base: "https://www.earthcam.com/search/ft_search.php?term=", suffix: "" },
    { name: "📷 WebCamTaxi", base: "https://www.webcamtaxi.com/en/search.html?searchword=", suffix: "&searchphrase=all" },

    // ============================================================
    // القسم 12: مواضيع محددة (3 روابط)
    // ============================================================
    { name: "🏭 YouTube آلات", base: "https://www.youtube.com/results?search_query=%D8%A2%D9%84%D8%A9+OR+%D9%85%D8%A7%D9%83%D9%8A%D9%86%D8%A9+", suffix: "&sp=CAM%253D" },
    { name: "🍳 YouTube طبخ", base: "https://www.youtube.com/results?search_query=%D8%B7%D8%A8%D8%AE+", suffix: "&sp=CAM%253D" },
    { name: "🚁 Drone 4K", base: "https://www.youtube.com/results?search_query=DRONE+", suffix: "&sp=EgJwAQ%253D%253D" }
];

// ============================================================
// 2. توليد روابط لكلمة بحث معينة
// ============================================================
function generateAllLinks(query) {
    const encodedQuery = encodeURIComponent(query);
    return searches.map((search, index) => ({
        id: index + 1,
        name: search.name,
        url: search.base + encodedQuery + search.suffix
    }));
}

// ============================================================
// 3. عرض/إخفاء الروابط
// ============================================================
window.toggleLinks = function(index) {
    const container = document.getElementById(`links-${index}`);
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        const btn = document.querySelector(`[onclick="toggleLinks(${index})"]`);
        if (btn) {
            const linksCount = allLinksData[index]?.links.length || 0;
            btn.textContent = container.style.display === 'block' ? 
                `📋 إخفاء الروابط (${linksCount})` : 
                `📋 عرض الروابط (${linksCount})`;
        }
    }
};

console.log('✅ 03-links.js تم تحميله بنجاح');
console.log(`📊 عدد روابط YouTube: ${searches.length}`);