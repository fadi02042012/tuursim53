// ============================================================
// 02-search.js - منطق البحث (معدل - سريع وصحيح)
// ============================================================

// ============================================================
// 1. دوال مساعدة للبحث
// ============================================================
function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .trim();
}

function buildSearchableText(city) {
    return normalizeText([
        city.city || "",
        city.city_ar || "",
        city.country || "",
        city.country_ar || "",
        city.region || ""
    ].join(" "));
}

/**
 * تهريب نص لإدراجه بأمان داخل HTML (يمنع XSS من بيانات المدن/ويكيبيديا)
 * منقولة إلى هنا (بدل 05-events.js) لأنها مستخدمة من 04-ui.js الذي يُحمّل قبله
 */
function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = `${item.city || ""}_${item.country || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ============================================================
// 2. البحث في البيانات المحلية (محسن للسرعة)
// ============================================================
async function performSearch(query) {
    if (!query || query.trim() === '') {
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        return { cities: source.slice(0, 100), countries: [] };
    }

    const trimmedQuery = query.trim();
    const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
    let resultsList = [];
    let countryResults = [];

    const lowerQuery = trimmedQuery.toLowerCase();
    const arabicQuery = normalizeText(trimmedQuery);
    
    // ✅ استخدام indexOf بدلاً من includes (أسرع)
    resultsList = source.filter(c => {
        // ✅ استخدام _searchKey المحسوب مسبقاً إن وُجد بدل إعادة حسابه في كل بحث
        const searchText = c._searchKey || buildSearchableText(c);
        return searchText.indexOf(arabicQuery) !== -1 ||
               (c.city || "").toLowerCase().indexOf(lowerQuery) !== -1 ||
               (c.city_ar || "").indexOf(arabicQuery) !== -1 ||
               (c.country || "").toLowerCase().indexOf(lowerQuery) !== -1 ||
               (c.country_ar || "").indexOf(arabicQuery) !== -1;
    });

    if (countries.length > 0) {
        countryResults = countries.filter(c => {
            const nameMatch = (c.name || "").toLowerCase().indexOf(lowerQuery) !== -1 ||
                             (c.name_ar || "").indexOf(arabicQuery) !== -1;
            const capitalMatch = (c.capital || "").toLowerCase().indexOf(lowerQuery) !== -1 ||
                                (c.capital_ar || "").indexOf(arabicQuery) !== -1;
            return nameMatch || capitalMatch;
        });
    }

    resultsList = removeDuplicates(resultsList);
    return { cities: resultsList.slice(0, 100), countries: countryResults.slice(0, 10) };
}

// ============================================================
// 3. البحث في ويكيبيديا (مع دعم ترقيم الصفحات)
// ============================================================
async function searchWikipedia(query, limit = 30, offset = 0) {
    try {
        const cacheKey = `${query}_${limit}_${offset}`;
        if (wikiResultsCache[cacheKey]) {
            return wikiResultsCache[cacheKey];
        }
        
        const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${limit}&sroffset=${offset}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.query || !data.query.search || data.query.search.length === 0) {
            wikiResultsCache[cacheKey] = [];
            return [];
        }
        
        const results = data.query.search.map(item => ({
            title: item.title,
            snippet: item.snippet.replace(/<[^>]+>/g, ''),
            url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            size: item.size || 0,
            wordcount: item.wordcount || 0,
            timestamp: item.timestamp || ''
        }));
        
        wikiResultsCache[cacheKey] = results;
        return results;
        
    } catch (error) {
        console.error("خطأ في البحث في ويكيبيديا:", error);
        return [];
    }
}

// ============================================================
// 4. دالة البحث الرئيسية (معدلة - تبحث في JSON أولاً)
// ============================================================
async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        renderResults({
            cities: source.slice(0, 100),
            countries: []
        });
        return;
    }
    
    // ✅ الخطوة 1: البحث في JSON أولاً
    const results = await performSearch(query);
    
    // ✅ الخطوة 2: إذا وجد نتائج في JSON → اعرضها فوراً
    if (results.cities.length > 0 || results.countries.length > 0) {
        renderResults(results);
        countSpan.textContent = results.cities.length + results.countries.length;
        return;
    }
    
    // ✅ الخطوة 3: إذا لم يجد في JSON → ابحث في ويكيبيديا
    const wikiResults = await searchWikipedia(query, 30);
    
    // ✅ الخطوة 4: إذا وجد في ويكيبيديا → اعرض النتائج
    if (wikiResults.length > 0) {
        resultsDiv.innerHTML = '';
        allLinksData = [];
        renderWikipediaResults(wikiResults, query);
        countSpan.textContent = wikiResults.length;
        return;
    }
    
    // ✅ الخطوة 5: إذا لم يجد نهائياً → عرض "لا توجد نتائج"
    resultsDiv.innerHTML = `
        <div class="card no-results">
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:16px;">🔍</div>
                <h3>لا توجد نتائج</h3>
                <p style="color:#94a3b8;margin-top:8px;">جرب البحث بكلمات مختلفة</p>
                <p style="color:#94a3b8;font-size:12px;margin-top:4px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p>
                <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <button onclick="searchOnlyWikipedia()" style="padding:10px 24px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">📖 بحث في ويكيبيديا</button>
                    <button onclick="searchAllWikipedia()" style="padding:10px 24px;background:#8b5cf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">🔍 بحث موسع (100 نتيجة)</button>
                </div>
            </div>
        </div>
    `;
    countSpan.textContent = '0';
}

// ============================================================
// 5. ملاحظة: window.searchOnlyWikipedia / searchAllWikipedia / loadMoreWikipedia
// معرّفة في 05-events.js (النسخة النهائية المستخدمة فعلياً في الواجهة، وتشمل
// تحديث شريط الحالة وترقيم الصفحات عبر CONFIG). كانت هذه الدوال معرّفة هنا
// أيضاً بنسخة قديمة تُستبدل بصمت عند تحميل 05-events.js (كود ميت يسبب لبساً)
// — تمت إزالتها من هنا لتفادي التكرار وتعارض مصدر الحقيقة الوحيد.
// ============================================================

console.log('✅ 02-search.js تم تحميله بنجاح');