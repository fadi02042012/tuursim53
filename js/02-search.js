// ============================================================
// 02-search.js - منطق البحث (معدل - بطاقة للنص عند عدم وجود نتائج)
// ============================================================

function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
        .replace(/ؤ/g, "و").replace(/ئ/g, "ي").trim();
}

function buildSearchableText(city) {
    return normalizeText([
        city.city || "", city.city_ar || "", city.country || "", city.country_ar || "",
        city.region || "", city.code || "", city.id || "", city.iso2 || "", city.iso3 || ""
    ].join(" "));
}

const translationCache = new Map();
const TRANSLATION_TIMEOUT_MS = 4500;

function looksLikeArabic(text) { return /[\u0600-\u06FF]/.test(text || ""); }
function looksLikeCode(text) { return /^[A-Za-z0-9][A-Za-z0-9_.:/-]{1,63}$/.test((text || "").trim()); }

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
    } finally { clearTimeout(timeout); }
}

async function buildQueryVariants(query) {
    const original = (query || "").trim();
    if (!original) return [];
    const variants = new Set([original, normalizeText(original)]);
    const english = await translateArabicToEnglish(original);
    if (english) { variants.add(english); variants.add(english.toLowerCase()); }
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

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

// بطاقة للنص الذي أدخله المستخدم، بنفس أسلوب بطاقات المدن والدول.
// تُضاف قبل نتائج ويكيبيديا أو رسالة عدم العثور على نتائج.
function renderTextQueryCard(query) {
    const text = String(query || '').trim();
    if (!text) return;

    const links = generateAllLinks(text);
    const index = allLinksData.length;
    allLinksData.push({ query: text, links, type: 'بحث نصي', name: text });

    const linksHtml = links.map(link => `
        <a class="link-item" target="_blank" rel="noopener noreferrer"
           href="${link.url}"
           style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:inherit;">
            <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
            <span class="link-name" style="margin-right:4px;">${escapeHtml(link.name)}</span>
        </a>
    `).join('');

    const card = `
        <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border-right:4px solid #6366f1;">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                <div>
                    <span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(text)}</span>
                    <span class="country-name" style="color:#64748b;margin-right:8px;">📝 بحث نصي</span>
                </div>
                <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
            </div>
            <p style="margin:0 0 12px;color:#64748b;font-size:14px;">نتائج البحث باستخدام النص الذي أدخلته:</p>
            <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a>
                <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a>
                <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${links.length})</button>
            </div>
            <div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;">
                <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span>📌 ${links.length} رابط بحث متقدم</span>
                    <span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(text)}</span>
                </div>
                <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">${linksHtml}</div>
            </div>
        </div>
    `;

    resultsDiv.innerHTML = card;
    countSpan.textContent = '1';
}

async function performSearch(query) {
    if (!query || query.trim() === '') {
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        return { cities: source.slice(0, 100), countries: [] };
    }

    const variants = await buildQueryVariants(query);
    const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
    const resultsList = source.filter(city => {
        const searchableText = [city.city, city.city_ar, city.country, city.country_ar,
            city.region, city.code, city.id, city.iso2, city.iso3, city.name]
            .filter(value => value !== undefined && value !== null).join(' ');
        return matchesAnyVariant(searchableText, variants);
    });

    const countryResults = countries.filter(country => {
        const searchableText = [country.name, country.name_ar, country.capital, country.capital_ar,
            country.code, country.iso2, country.iso3, country.id]
            .filter(value => value !== undefined && value !== null).join(' ');
        return matchesAnyVariant(searchableText, variants);
    });

    const uniqueResults = removeDuplicates(resultsList);
    const rankedResults = typeof sortCitiesByRelevance === 'function'
        ? sortCitiesByRelevance(uniqueResults, query) : uniqueResults;
    const queryText = normalizeText(query);
    const rankedCountries = countryResults.sort((a, b) => {
        const score = country => {
            const names = [country.name, country.name_ar, country.capital, country.capital_ar]
                .filter(Boolean).map(value => normalizeText(value));
            if (names.some(name => name === queryText)) return 3;
            if (names.some(name => name.startsWith(queryText))) return 2;
            return 1;
        };
        return score(b) - score(a);
    });

    return { cities: rankedResults.slice(0, 100), countries: rankedCountries.slice(0, 10) };
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
            language, size: item.size || 0, wordcount: item.wordcount || 0, timestamp: item.timestamp || ''
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
    const arabicResults = [...unique.values()].filter(item => item.language === 'ar');
    const englishResults = [...unique.values()].filter(item => item.language === 'en');
    const balanced = [];
    for (let index = 0; balanced.length < limit && (index < arabicResults.length || index < englishResults.length); index++) {
        if (arabicResults[index]) balanced.push(arabicResults[index]);
        if (englishResults[index] && balanced.length < limit) balanced.push(englishResults[index]);
    }
    return balanced.slice(0, limit);
}

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        renderResults({ cities: source.slice(0, 100), countries: [] });
        return;
    }

    const results = await performSearch(query);
    if (results.cities.length > 0 || results.countries.length > 0) {
        renderResults(results);
        countSpan.textContent = results.cities.length + results.countries.length;
        return;
    }

    // لا توجد مدينة أو دولة: ضع بطاقة النص أولاً، ثم أضف نتائج ويكيبيديا بعدها إن وجدت.
    allLinksData = [];
    renderTextQueryCard(query);
    updateStatus('🔍 جاري البحث في ويكيبيديا...', '#f59e0b');
    const wikiResults = await searchWikipediaMultilingual(query, 30);

    if (wikiResults.length > 0) {
        renderWikipediaResults(wikiResults, query);
        updateStatus(`📖 تم العثور على ${wikiResults.length} نتيجة في ويكيبيديا`, '#10b981');
        countSpan.textContent = wikiResults.length + 1;
        return;
    }

    resultsDiv.innerHTML += `
        <div class="card no-results" style="margin-top:16px;padding:20px;text-align:center;">
            <h3>لم يتم العثور على نتائج مطابقة</h3>
            <p style="color:#94a3b8;margin-top:8px;">تم إنشاء بطاقة للنص المدخل ويمكنك استخدام روابط البحث أعلاه.</p>
        </div>`;
    countSpan.textContent = '1';
    updateStatus('✅ تم إنشاء بطاقة للنص المدخل', '#10b981');
}

console.log('✅ 02-search.js تم تحميله بنجاح');
