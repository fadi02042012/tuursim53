// ============================================================
// 02-search.js - منطق البحث وبطاقة نص البحث
// ============================================================
function normalizeText(text) {
    return String(text || '').toLowerCase()
        .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').trim();
}

function buildSearchableText(city) {
    return normalizeText([
        city.city, city.city_ar, city.country, city.country_ar, city.region,
        city.code, city.id, city.iso2, city.iso3
    ].filter(Boolean).join(' '));
}

const translationCache = new Map();
const TRANSLATION_TIMEOUT_MS = 4500;
let activeWikipediaRequest = null;
let lastSearchRequestId = 0;

function looksLikeArabic(text) { return /[\u0600-\u06FF]/.test(text || ''); }
function looksLikeCode(text) { return /^[A-Za-z0-9][A-Za-z0-9_.:/-]{1,63}$/.test((text || '').trim()); }

async function translateArabicToEnglish(text) {
    const query = String(text || '').trim();
    if (!query || !looksLikeArabic(query) || looksLikeCode(query)) return '';
    if (translationCache.has(query)) return translationCache.get(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=ar|en`, { signal: controller.signal });
        if (!response.ok) throw new Error(`translation_http_${response.status}`);
        const data = await response.json();
        const translated = String(data?.responseData?.translatedText || '').trim();
        const result = translated && translated.toLowerCase() !== query.toLowerCase() ? translated : '';
        translationCache.set(query, result);
        return result;
    } catch (error) {
        console.warn('تعذر ترجمة استعلام البحث:', error.message || error);
        translationCache.set(query, '');
        return '';
    } finally { clearTimeout(timeout); }
}

async function buildQueryVariants(query) {
    const original = String(query || '').trim();
    if (!original) return [];
    const variants = new Set([original, normalizeText(original)]);
    const english = await translateArabicToEnglish(original);
    if (english) { variants.add(english); variants.add(english.toLowerCase()); }
    return [...variants].filter(Boolean);
}

function matchesAnyVariant(text, variants) {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    const normalized = normalizeText(raw);
    return variants.some(variant => {
        const value = String(variant || '');
        return lower.includes(value.toLowerCase()) || normalized.includes(normalizeText(value));
    });
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = `${item.city || ''}_${item.country || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function performSearch(query) {
    if (!query || !query.trim()) {
        const source = currentCountryCities.length ? currentCountryCities : allCities;
        return { cities: source.slice(0, 50), countries: [] };
    }

    const variants = await buildQueryVariants(query);
    const source = currentCountryCities.length ? currentCountryCities : allCities;
    const cities = removeDuplicates(source.filter(city => matchesAnyVariant([
        city.city, city.city_ar, city.country, city.country_ar, city.region,
        city.code, city.id, city.iso2, city.iso3, city.name
    ].filter(v => v !== undefined && v !== null).join(' '), variants)));
    const rankedCities = typeof sortCitiesByRelevance === 'function'
        ? sortCitiesByRelevance(cities, query) : cities;
    const countryResults = countries.filter(country => matchesAnyVariant([
        country.name, country.name_ar, country.capital, country.capital_ar,
        country.code, country.iso2, country.iso3, country.id
    ].filter(v => v !== undefined && v !== null).join(' '), variants));
    const q = normalizeText(query);
    countryResults.sort((a, b) => {
        const score = country => {
            const names = [country.name, country.name_ar, country.capital, country.capital_ar]
                .filter(Boolean).map(normalizeText);
            return names.some(n => n === q) ? 3 : names.some(n => n.startsWith(q)) ? 2 : 1;
        };
        return score(b) - score(a);
    });
    return { cities: rankedCities.slice(0, 50), countries: countryResults.slice(0, 10) };
}

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
    const requestId = ++lastSearchRequestId;
    if (activeWikipediaRequest) {
        try { activeWikipediaRequest.abort(); } catch (_) {}
    }

    const variants = await buildQueryVariants(query);
    const requests = [
        ...variants.filter(looksLikeArabic).map(q => searchWikipediaLanguage(q, 'ar', limit, offset)),
        ...variants.filter(q => !looksLikeArabic(q)).map(q => searchWikipediaLanguage(q, 'en', limit, offset))
    ];
    const groups = await Promise.all(requests);

    // لا تسمح لطلب قديم بأن يعيد رسم الواجهة بعد طلب أحدث.
    if (requestId !== lastSearchRequestId) return [];

    const unique = new Map();
    groups.flat().forEach(item => unique.set(`${item.language}:${item.title}`, item));
    const ar = [...unique.values()].filter(item => item.language === 'ar');
    const en = [...unique.values()].filter(item => item.language === 'en');
    const balanced = [];
    for (let i = 0; balanced.length < limit && (i < ar.length || i < en.length); i++) {
        if (ar[i]) balanced.push(ar[i]);
        if (en[i] && balanced.length < limit) balanced.push(en[i]);
    }
    return balanced.slice(0, limit);
}

function prependTextQueryCard(query) {
    const text = String(query || '').trim();
    if (!text) return;
    const links = generateAllLinks(text);
    const index = allLinksData.length;
    allLinksData.push({ query: text, links, type: 'بحث نصي', name: text });
    const linkItems = links.map(link => `
        <a class="link-item" target="_blank" rel="noopener noreferrer" href="${link.url}" style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:inherit;">
            <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
            <span class="link-name" style="margin-right:4px;">${escapeHtml(link.name)}</span>
        </a>`).join('');
    const card = `
        <div class="card text-query-card" style="background:white;border-radius:12px;padding:0;margin-bottom:0;box-shadow:none;">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0;flex-wrap:wrap;">
                <div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(text)}</span>
                <span class="country-name" style="color:#64748b;margin-right:8px;">📝 بحث نصي</span></div>
                <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
            </div>
            <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0;">
                <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}" style="padding:6px 12px;background:#10b981;color:white;border-radius:8px;text-decoration:none;">📍 خرائط</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a>
                <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a>
                <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${links.length})</button>
                <button class="btn btn-favorite favorite-toggle" data-favorite-index="${index}" onclick="toggleFavorite(${index})" type="button" aria-label="إضافة ${escapeHtml(text)} إلى المفضلة" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">⭐ المفضلة</button>
            </div>
            <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin:0;padding:0;">
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في ' + text)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🌍 السياحة</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق ' + text)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🏨 فنادق</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم ' + text)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🍽️ مطاعم</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('صور ' + text)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">📷 صور</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فيديو ' + text)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🎬 فيديو</a>
            </div>
            <div class="all-links-container" id="links-${index}" style="display:none;margin:0;padding:10px;background:#f8fafc;border-radius:8px;">
                <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>📌 ${links.length} رابط بحث متقدم</span><span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(text)}</span></div>
                <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">${linkItems}</div>
            </div>
        </div>`;
    resultsDiv.insertAdjacentHTML('afterbegin', card);
}

async function handleSearch() {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (!query) {
        const source = currentCountryCities.length ? currentCountryCities : allCities;
        renderResults({ cities: source.slice(0, 50), countries: [] });
        return;
    }

    const results = await performSearch(query);
    if (results.cities.length || results.countries.length) {
        renderResults(results);
        prependTextQueryCard(query);
        countSpan.textContent = results.cities.length + results.countries.length + 1;
        return;
    }

    allLinksData = [];
    prependTextQueryCard(query);
    updateStatus('🔍 جاري البحث في ويكيبيديا...', '#f59e0b');
    const wikiResults = await searchWikipediaMultilingual(query, 30);
    if (wikiResults.length) {
        renderWikipediaResults(wikiResults, query);
        updateStatus(`📖 تم العثور على ${wikiResults.length} نتيجة في ويكيبيديا`, '#10b981');
        countSpan.textContent = wikiResults.length + 1;
    } else {
        updateStatus('✅ تم إنشاء بطاقة للنص المدخل', '#10b981');
        countSpan.textContent = '1';
    }
}

console.log('✅ 02-search.js تم تحميله بنجاح — البحث المؤكد فقط ينفذ طلبات الشبكة');
