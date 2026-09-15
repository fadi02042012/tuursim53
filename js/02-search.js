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
        city.region || "",
        city.code || "",
        city.id || "",
        city.iso2 || "",
        city.iso3 || ""
    ].join(" "));
}

// ترجمة اختيارية مع cache وfallback: لا تمنع البحث إذا تعذر الاتصال بالخدمة.
const translationCache = new Map();
const TRANSLATION_TIMEOUT_MS = 4500;

function looksLikeArabic(text) {
    return /[\u0600-\u06FF]/.test(text || "");
}

function looksLikeCode(text) {
    return /^[A-Za-z0-9][A-Za-z0-9_.:/-]{1,63}$/.test((text || "").trim());
}

async function translateArabicToEnglish(text) {
    const query = (text || "").trim();
    if (!query || !looksLikeArabic(query) || looksLikeCode(query)) return "";
    if (translationCache.has(query)) return translationCache.get(query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=ar|en`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`translation_http_${response.status}`);
        const data = await response.json();
        const translated = String(data?.responseData?.translatedText || "").trim();
        const usable = translated && translated.toLowerCase() !== query.toLowerCase() ? translated : "";
        translationCache.set(query, usable);
        return usable;
    } catch (error) {
        console.warn('تعذر ترجمة استعلام البحث، سيتم استخدام النص الأصلي:', error.message || error);
        translationCache.set(query, "");
        return "";
    } finally {
        clearTimeout(timeout);
    }
}

async function buildQueryVariants(query) {
    const original = (query || "").trim();
    if (!original) return [];

    const variants = new Set([original, normalizeText(original)]);
    const english = await translateArabicToEnglish(original);
    if (english) {
        variants.add(english);
        variants.add(english.toLowerCase());
    }
    return [...variants].filter(Boolean);
}

function matchesAnyVariant(searchableText, variants) {
    const raw = String(searchableText || "");
    const lower = raw.toLowerCase();
    const normalized = normalizeText(raw);
    return variants.some(variant => {
        const value = String(variant || "");
        return lower.includes(value.toLowerCase()) || normalized.includes(normalizeText(value));
    });
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

    const variants = await buildQueryVariants(query);
    const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;

    const resultsList = source.filter(city => {
        const searchableText = [
            city.city, city.city_ar, city.country, city.country_ar, city.region,
            city.code, city.id, city.iso2, city.iso3, city.name
        ].filter(value => value !== undefined && value !== null).join(' ');
        return matchesAnyVariant(searchableText, variants);
    });

    const countryResults = countries.filter(country => {
        const searchableText = [
            country.name, country.name_ar, country.capital, country.capital_ar,
            country.code, country.iso2, country.iso3, country.id
        ].filter(value => value !== undefined && value !== null).join(' ');
        return matchesAnyVariant(searchableText, variants);
    });

    // ترتيب النتائج: تطابق كامل، ثم بداية الاسم، ثم أقرب تطابق جزئي.
    // sortCitiesByRelevance معرّفة في 05-events.js وتُستدعى بعد تحميل جميع الملفات.
    const uniqueResults = removeDuplicates(resultsList);
    const rankedResults = typeof sortCitiesByRelevance === 'function'
        ? sortCitiesByRelevance(uniqueResults, query)
        : uniqueResults;

    const rankedCountries = countryResults.sort((a, b) => {
        const queryText = normalizeText(query);
        const score = (country) => {
            const names = [country.name, country.name_ar, country.capital, country.capital_ar]
                .filter(Boolean).map(value => normalizeText(value));
            if (names.some(name => name === queryText)) return 3;
            if (names.some(name => name.startsWith(queryText))) return 2;
            return 1;
        };
        return score(b) - score(a);
    });

    return {
        cities: rankedResults.slice(0, 100),
        countries: rankedCountries.slice(0, 10)
    };
}

// ============================================================
// 3. البحث في ويكيبيديا (مع دعم ترقيم الصفحات)
// ============================================================
async function searchWikipediaLanguage(query, language, limit = 30, offset = 0) {
    try {
        const cacheKey = `${language}_${query}_${limit}_${offset}`;
        if (wikiResultsCache[cacheKey]) return wikiResultsCache[cacheKey];

        const url = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${limit}&sroffset=${offset}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`wikipedia_http_${response.status}`);
        const data = await response.json();
        const results = (data.query?.search || []).map(item => ({
            title: item.title,
            snippet: String(item.snippet || '').replace(/<[^>]+>/g, ''),
            url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            language,
            size: item.size || 0,
            wordcount: item.wordcount || 0,
            timestamp: item.timestamp || ''
        }));
        wikiResultsCache[cacheKey] = results;
        return results;
    } catch (error) {
        console.warn(`تعذر البحث في ويكيبيديا ${language}:`, error.message || error);
        return [];
    }
}

async function searchWikipedia(query, limit = 30, offset = 0) {
    return searchWikipediaLanguage(query, 'ar', limit, offset);
}

async function searchWikipediaMultilingual(query, limit = 30, offset = 0) {
    const variants = await buildQueryVariants(query);
    const arabicQueries = variants.filter(value => looksLikeArabic(value));
    const englishQueries = variants.filter(value => !looksLikeArabic(value));

    const requests = [
        ...arabicQueries.map(value => searchWikipediaLanguage(value, 'ar', limit, offset)),
        ...englishQueries.map(value => searchWikipediaLanguage(value, 'en', limit, offset))
    ];
    const groups = await Promise.all(requests);
    const unique = new Map();
    groups.flat().forEach(item => unique.set(`${item.language}:${item.title}`, item));

    // موازنة النتائج حتى لا تحجب العربية النتائج الإنجليزية عند امتلاء الحد.
    const arabicResults = [...unique.values()].filter(item => item.language === 'ar');
    const englishResults = [...unique.values()].filter(item => item.language === 'en');
    const balanced = [];
    for (let index = 0; balanced.length < limit && (index < arabicResults.length || index < englishResults.length); index++) {
        if (arabicResults[index]) balanced.push(arabicResults[index]);
        if (englishResults[index] && balanced.length < limit) balanced.push(englishResults[index]);
    }
    return balanced.slice(0, limit);
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
    const wikiResults = await searchWikipediaMultilingual(query, 30);
    
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
