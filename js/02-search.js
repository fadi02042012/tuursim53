// ============================================================
// 02-search.js - منطق البحث وبطاقة بحث النص
// ============================================================
const RESULTS_PER_BATCH = 10;

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

function buildQueryVariants(query) {
    const original = String(query || '').trim();
    if (!original) return [];
    return [...new Set([original, normalizeText(original)])].filter(Boolean);
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

function performSearch(query) {
    const source = currentCountryCities.length ? currentCountryCities : allCities;
    const text = String(query || '').trim();
    if (!text) return { cities: source.slice(0, RESULTS_PER_BATCH), countries: [] };

    const variants = buildQueryVariants(text);
    const cities = removeDuplicates(source.filter(city => matchesAnyVariant([
        city.city, city.city_ar, city.country, city.country_ar, city.region,
        city.code, city.id, city.iso2, city.iso3, city.name
    ].filter(v => v !== undefined && v !== null).join(' '), variants)));

    const rankedCities = typeof sortCitiesByRelevance === 'function'
        ? sortCitiesByRelevance(cities, text) : cities;

    const countryResults = countries.filter(country => matchesAnyVariant([
        country.name, country.name_ar, country.capital, country.capital_ar,
        country.code, country.iso2, country.iso3, country.id
    ].filter(v => v !== undefined && v !== null).join(' '), variants));

    const q = normalizeText(text);
    countryResults.sort((a, b) => {
        const score = country => {
            const names = [country.name, country.name_ar, country.capital, country.capital_ar]
                .filter(Boolean).map(normalizeText);
            return names.some(n => n === q) ? 3 : names.some(n => n.startsWith(q)) ? 2 : 1;
        };
        return score(b) - score(a);
    });

    return {
        cities: rankedCities.slice(0, RESULTS_PER_BATCH),
        countries: countryResults.slice(0, RESULTS_PER_BATCH)
    };
}

async function searchWikipediaLanguage(query, language, limit = RESULTS_PER_BATCH, offset = 0) {
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

async function searchWikipedia(query, limit = RESULTS_PER_BATCH, offset = 0) {
    return searchWikipediaLanguage(query, 'ar', limit, offset);
}

async function searchWikipediaMultilingual(query, limit = RESULTS_PER_BATCH, offset = 0) {
    const requestId = ++lastSearchRequestId;
    const original = String(query || '').trim();
    const variants = buildQueryVariants(original);

    const requests = [
        ...variants.filter(looksLikeArabic).map(q => searchWikipediaLanguage(q, 'ar', limit, offset)),
        ...variants.filter(q => !looksLikeArabic(q)).map(q => searchWikipediaLanguage(q, 'en', limit, offset)),
        // طلب مباشر إضافي للاستعلام الأصلي، حتى لا تضيع صفحة صحيحة مثل "موسى"
        searchWikipediaLanguage(original, looksLikeArabic(original) ? 'ar' : 'en', limit, offset)
    ];

    const groups = await Promise.all(requests);
    if (requestId !== lastSearchRequestId) return [];

    const unique = new Map();
    groups.flat().forEach(item => unique.set(`${item.language}:${item.title}`, item));

    // ويكيبيديا قد تعيد نتائج تقريبية أو غير مرتبطة بالاستعلام.
    // لا نعرض نتيجة ويكيبيديا إلا إذا ظهر الاستعلام نفسه في عنوان الصفحة.
    // هذا يمنع تحويل نتائج تقريبية مثل "كالب بن يفنة" إلى نتيجة لـ "كراسيدا".
    const relevant = [...unique.values()].filter(item =>
        matchesAnyVariant(item.title, variants)
    );

    return relevant.slice(0, limit);
}

function prependTextQueryCard(query) {
    const text = String(query || '').trim();
    if (!text) return;
    const item = { type: 'بحث نصي', name: text, query: text };
    const key = favoriteKey(item);
    favoriteItemsCache[key] = item;
    const active = getFavorites().some(x => x.key === key);
    const favorite = '<button type="button" class="btn btn-favorite favorite-toggle" data-favorite-key="'+escapeHtml(key)+'" aria-pressed="'+(active?'true':'false')+'">'+(active?'⭐ في المفضلة':'☆ أضف للمفضلة')+'</button>';
    const card = `
        <div class="card text-query-card" style="background:white;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 1px 5px rgba(0,0,0,.08);">
            <div style="text-align:left;margin-bottom:7px;">${favorite}</div>
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
                <div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(text)}</span>
                <span class="country-name" style="color:#64748b;margin-right:8px;">📝 بحث نصي</span></div>
            </div>
            <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;">
                <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}">📍 خرائط</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}">🔍 Google</a>
                <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}">▶ YouTube</a>
                <a class="btn btn-secondary advanced-category-link" data-query="${escapeHtml(text)}" target="_blank" rel="noopener noreferrer" href="${escapeHtml(getCategoryUrl(text))}"><span class="advanced-category-link-text">⚡ ${escapeHtml(getCategoryName())}</span></a>
            </div>
            <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 0;padding:0;">
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في ' + text)}">🌍 السياحة</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق ' + text)}">🏨 فنادق</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم ' + text)}">🍽️ مطاعم</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('صور ' + text)}">📷 صور</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فيديو ' + text)}">🎬 فيديو</a>
            </div>
        </div>`;
    resultsDiv.insertAdjacentHTML('afterbegin', card);
}

async function handleSearch() {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    if (!query) {
        const source = currentCountryCities.length
            ? (typeof sortCitiesForCountry === 'function'
                ? sortCitiesForCountry(currentCountryCities, countrySelect?.value || '')
                : currentCountryCities.slice())
            : (typeof sortCitiesAlphabetically === 'function'
                ? sortCitiesAlphabetically(allCities)
                : allCities.slice());

        if (currentCountryCities.length) {
            currentFullResults = source;
            currentDisplayLimit = Math.min(RESULTS_PER_BATCH, source.length);
            renderResults({ cities: source.slice(0, currentDisplayLimit), countries: [] });
            if (typeof updateShowMoreButton === 'function') updateShowMoreButton();
            if (typeof window.refreshResultsPagination === 'function') window.refreshResultsPagination();
        } else if (source.length) {
            renderResults({ cities: source.slice(0, RESULTS_PER_BATCH), countries: [] });
        } else {
            renderResults({ cities: [], countries: countries.slice(0, RESULTS_PER_BATCH) });
        }
        return;
    }

    updateStatus('🔎 جاري البحث في ملفات JSON...', '#f59e0b');
    allLinksData = [];
    resultsDiv.innerHTML = '';

    if (!currentCountryCities.length && !allCities.length) {
        try {
            await loadGlobalCities();
        } catch (error) {
            console.warn('تحميل قاعدة المدن:', error);
        }
    }

    const localResults = performSearch(query);
    if (localResults.cities.length || localResults.countries.length) {
        renderResults(localResults);
        countSpan.textContent = String(localResults.cities.length + localResults.countries.length);
        updateStatus('✅ ظهرت النتائج من ملفات JSON.', '#10b981');
        return;
    }

    updateStatus('📖 لا توجد مطابقة في JSON — جاري البحث في ويكيبيديا...', '#f59e0b');

    try {
        const wikiResults = await searchWikipediaMultilingual(query, RESULTS_PER_BATCH);
        if (wikiResults.length) {
            resultsDiv.innerHTML = '';
            allLinksData = [];
            renderWikipediaResults(wikiResults, query);
            countSpan.textContent = String(wikiResults.length);
            updateStatus('📖 ظهرت النتائج من ويكيبيديا.', '#10b981');
            return;
        }
    } catch (error) {
        console.warn('Wikipedia search:', error);
    }

    resultsDiv.innerHTML = '';
    allLinksData = [];
    prependTextQueryCard(query);
    countSpan.textContent = '1';
    updateStatus('🔎 لا توجد نتائج في JSON أو ويكيبيديا — ظهرت بطاقة البحث النصي.', '#64748b');
}

console.log('✅ 02-search.js تم تحميله بنجاح — ترتيب البحث: JSON ثم Wikipedia ثم بحث نصي');