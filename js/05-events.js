// ============================================================
// 05-events.js - أحداث المستخدم والأداء
// ============================================================

const SUGGESTIONS_DEBOUNCE_MS = 120;
const MAX_AUTO_OPEN_LINKS = 20;
const MAX_SUGGESTIONS = 12;
const RESULTS_PAGE_SIZE = 50;

let suggestionsTimeout = null;
let currentFullResults = [];
let currentDisplayLimit = RESULTS_PAGE_SIZE;
let showMoreBtn = null;
let countryLoadRequestId = 0;
const countryCitiesCache = new Map();

function updateStatus(message, color = '#64748b') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
}

function sortCitiesAlphabetically(cities) {
    return [...(cities || [])].sort((a, b) =>
        String(a.city || '').localeCompare(String(b.city || ''), 'en', { sensitivity: 'base' })
    );
}

function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateRelevanceScore(city, query) {
    const q = String(query || '').trim().toLowerCase();
    const qAr = normalizeText(query || '');
    if (!q) return 0;

    const nameEn = String(city.city || '').toLowerCase();
    const nameAr = normalizeText(city.city_ar || '');
    const searchableText = city._searchKey || buildSearchableText(city);
    let score = 0;

    if (nameEn === q || nameAr === qAr) score += 1000;
    if (nameEn.startsWith(q) || nameAr.startsWith(qAr)) score += 500;
    else if (new RegExp(`\\b${escapeRegex(q)}`, 'i').test(nameEn) || nameAr.split(' ').some(w => w.startsWith(qAr))) score += 250;
    else if (searchableText.includes(qAr) || nameEn.includes(q)) score += 100;

    const idx = nameEn.indexOf(q) >= 0 ? nameEn.indexOf(q) : nameAr.indexOf(qAr);
    if (idx >= 0) score += Math.max(0, 50 - idx * 5);
    score += Math.max(0, 20 - Math.abs(nameEn.length - q.length));
    if (city.population) score += Math.log10(Number(city.population) + 1) * 2;
    return score;
}

function sortCitiesByRelevance(cities, query) {
    if (!query || !query.trim()) return sortCitiesAlphabetically(cities);
    return [...cities]
        .map(city => ({ city, score: calculateRelevanceScore(city, query) }))
        .sort((a, b) => b.score - a.score || String(a.city.city || '').localeCompare(String(b.city.city || '')))
        .map(item => item.city);
}

function sortCountryDropdown() {
    if (!countrySelect) return;
    const options = Array.from(countrySelect.options);
    if (options.length <= 1) return;
    const selectedValue = countrySelect.value;
    const placeholder = options[0];
    options.slice(1).sort((a, b) => a.text.localeCompare(b.text, 'ar'));
    countrySelect.replaceChildren(placeholder, ...options.slice(1));
    countrySelect.value = selectedValue;
}

function renderLocalCityResults(sortedCities) {
    currentFullResults = Array.isArray(sortedCities) ? sortedCities : [];
    currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, currentFullResults.length || RESULTS_PAGE_SIZE);
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();
}

function showMoreLocalResults() {
    const oldLimit = currentDisplayLimit;
    currentDisplayLimit = Math.min(currentDisplayLimit + RESULTS_PAGE_SIZE, currentFullResults.length);
    if (currentDisplayLimit === oldLimit) return;
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();
    showMoreBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateShowMoreButton() {
    const remaining = Math.max(0, currentFullResults.length - currentDisplayLimit);
    if (!remaining) {
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }
    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.id = 'showMoreResultsBtn';
        showMoreBtn.type = 'button';
        showMoreBtn.style.cssText = 'display:block;width:100%;margin:15px 0;padding:12px 20px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;font-size:14px;cursor:pointer;';
        showMoreBtn.addEventListener('click', showMoreLocalResults);
        resultsDiv.insertAdjacentElement('afterend', showMoreBtn);
    }
    const nextBatch = Math.min(RESULTS_PAGE_SIZE, remaining);
    showMoreBtn.textContent = `⬇️ عرض المزيد (${nextBatch} من أصل ${remaining} متبقية)`;
    showMoreBtn.style.display = 'block';
}

function createSuggestionItem(city) {
    const cityName = city.city || '';
    return `<div class="suggestion" data-city="${escapeHtml(cityName)}" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;">🏙️ ${escapeHtml(cityName)} ${city.city_ar ? `(${escapeHtml(city.city_ar)})` : ''} ${city.country ? `- ${escapeHtml(city.country)}` : ''}</div>`;
}

function performLocalSearch(query) {
    const source = currentCountryCities.length ? currentCountryCities : allCities;
    const lower = String(query || '').toLowerCase();
    const arabic = normalizeText(query || '');
    const filtered = source.filter(city => {
        const text = city._searchKey || buildSearchableText(city);
        return text.includes(arabic) || String(city.city || '').toLowerCase().includes(lower) || String(city.city_ar || '').includes(arabic);
    });
    return sortCitiesByRelevance(filtered, query).slice(0, MAX_SUGGESTIONS);
}

function showSuggestions(results) {
    if (!suggestionsDiv) return;
    suggestionsDiv.innerHTML = results?.length ? results.map(createSuggestionItem).join('') : '';
    suggestionsDiv.style.display = results?.length ? 'block' : 'none';
}

if (suggestionsDiv) {
    suggestionsDiv.addEventListener('click', event => {
        const item = event.target.closest('.suggestion');
        if (item?.dataset.city) selectCity(item.dataset.city);
    });
}

function scheduleSuggestions(query) {
    clearTimeout(suggestionsTimeout);
    if (!query.trim()) {
        showSuggestions([]);
        return;
    }
    suggestionsTimeout = setTimeout(() => showSuggestions(performLocalSearch(query)), SUGGESTIONS_DEBOUNCE_MS);
}

async function searchWikipediaWithConfig(limit, message, extendedMessage) {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    updateStatus(message, '#f59e0b');
    wikipediaPage = 0;
    try {
        const results = await searchWikipediaMultilingual(query, limit);
        if (!results.length) {
            updateStatus('❌ لم يتم العثور على نتائج في ويكيبيديا', '#ef4444');
            return showToast('❌ لم يتم العثور على نتائج في ويكيبيديا');
        }
        resultsDiv.innerHTML = '';
        allLinksData = [];
        renderWikipediaResults(results, query);
        updateStatus(extendedMessage || `📖 تم العثور على ${results.length} نتيجة في ويكيبيديا`, '#10b981');
        countSpan.textContent = String(results.length);
        updateFavoriteButtons?.();
    } catch (error) {
        console.error('خطأ في ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء البحث في ويكيبيديا', '#ef4444');
    }
}

// ============================================================
// البحث: الاقتراحات فقط أثناء الكتابة، والبحث الكامل عند Enter/الزر
// ============================================================
searchInput.addEventListener('input', function () {
    scheduleSuggestions(this.value);
});

searchInput.addEventListener('keydown', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(suggestionsTimeout);
        showSuggestions([]);
        await handleSearch();
    } else if (event.key === 'Escape') {
        clearTimeout(suggestionsTimeout);
        this.value = '';
        showSuggestions([]);
        this.blur();
    }
});

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    clearTimeout(suggestionsTimeout);
    showSuggestions([]);
    await handleSearch();
});

// ============================================================
// النسخ: بناء النص فقط عند الضغط، بدون عمل إضافي أثناء العرض
// ============================================================
document.getElementById('copyAll')?.addEventListener('click', async () => {
    if (!allLinksData.length) return showToast('⚠️ لا توجد روابط للنسخ');

    const chunks = ['🔍 روابط البحث عن المدن والدول', '='.repeat(60), ''];
    allLinksData.forEach((data, i) => {
        chunks.push(`📌 ${i + 1}. ${data.name} (${data.type})`);
        chunks.push(`   كلمة البحث: ${data.query}`);
        (data.links || []).forEach(link => chunks.push(`   ${link.id}. ${link.name}: ${link.url}`));
        chunks.push('');
    });
    const text = chunks.join('\n');
    const totalLinks = allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0);

    try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else fallbackCopy(text, totalLinks);
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (_) {
        fallbackCopy(text, totalLinks);
    }
});

function fallbackCopy(text, totalLinks) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        if (!document.execCommand('copy')) throw new Error('copy_failed');
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (error) {
        console.error('فشل النسخ:', error);
        showToast('❌ فشل نسخ الروابط');
    } finally {
        textarea.remove();
    }
}

// ============================================================
// فتح الروابط: حد أقصى آمن بدل جدولة مئات/آلاف النوافذ
// ============================================================
document.getElementById('openAll')?.addEventListener('click', () => {
    const allUrls = allLinksData.flatMap(data => (data.links || []).map(link => link.url)).filter(Boolean);
    if (!allUrls.length) return showToast('⚠️ لا توجد روابط للفتح');

    const urlsToOpen = allUrls.slice(0, MAX_AUTO_OPEN_LINKS);
    if (allUrls.length > MAX_AUTO_OPEN_LINKS && !confirm(`لديك ${allUrls.length.toLocaleString()} رابطًا. سيتم فتح أول ${MAX_AUTO_OPEN_LINKS} فقط لتجنب تجميد المتصفح. هل تريد المتابعة؟`)) return;

    let opened = 0;
    urlsToOpen.forEach((url, index) => {
        setTimeout(() => {
            try {
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                if (win) opened++;
            } catch (error) {
                console.warn('فشل فتح الرابط:', error);
            }
            if (index === urlsToOpen.length - 1) {
                showToast(opened ? `🚀 تم طلب فتح ${opened} رابط` : '⚠️ المتصفح منع النوافذ المنبثقة');
            }
        }, index * 100);
    });
});

// ============================================================
// مسح النتائج
// ============================================================
document.getElementById('clearResults')?.addEventListener('click', () => {
    resultsDiv.innerHTML = '';
    countSpan.textContent = '0';
    allLinksData = [];
    currentFullResults = [];
    currentDisplayLimit = 0;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    searchInput.value = '';
    showSuggestions([]);
    searchInput.focus();
    showToast('🗑 تم مسح النتائج');
});

// ============================================================
// تغيير الدولة: إلغاء الطلب السابق ومنع سباق الطلبات
// ============================================================
countrySelect.addEventListener('change', async function () {
    const code = this.value;
    const requestId = ++countryLoadRequestId;
    searchInput.value = '';
    showSuggestions([]);

    if (!code) {
        currentCountryCities = [];
        updateStatus('🌐 بحث عالمي', '#64748b');
        if (allCities.length) renderLocalCityResults(sortCitiesAlphabetically(allCities));
        else {
            resultsDiv.innerHTML = '';
            countSpan.textContent = '0';
        }
        return;
    }

    const countryName = countryMap[code] || code;
    if (countryCitiesCache.has(code)) {
        currentCountryCities = countryCitiesCache.get(code);
        updateStatus(`✅ ${currentCountryCities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(sortCitiesAlphabetically(currentCountryCities));
        return;
    }

    updateStatus(`⏳ جاري تحميل مدن ${countryName}...`, '#f59e0b');
    try {
        const cities = await loadCountryCities(code);
        if (requestId !== countryLoadRequestId || countrySelect.value !== code) return;
        countryCitiesCache.set(code, cities);
        currentCountryCities = cities;
        updateStatus(`✅ ${cities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(sortCitiesAlphabetically(cities));
    } catch (error) {
        if (requestId !== countryLoadRequestId) return;
        console.error('خطأ في تحميل مدن الدولة:', error);
        updateStatus(`❌ فشل تحميل مدن ${countryName}`, '#ef4444');
        showToast('❌ حدث خطأ أثناء تحميل المدن');
    }
});

window.searchOnlyWikipedia = () => searchWikipediaWithConfig(30, '🔍 جاري البحث في ويكيبيديا...');
window.searchAllWikipedia = () => searchWikipediaWithConfig(100, '🔍 جاري البحث الموسع في ويكيبيديا...', '📖 تم تحميل نتائج البحث الموسع في ويكيبيديا');

window.loadMoreWikipedia = async function () {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    const nextPage = wikipediaPage + 1;
    const offset = nextPage * CONFIG.WIKIPEDIA_PAGE_SIZE;
    updateStatus(`⏳ جاري تحميل المزيد من ويكيبيديا...`, '#f59e0b');

    try {
        const results = await searchWikipediaMultilingual(query, CONFIG.WIKIPEDIA_PAGE_SIZE, offset);
        if (!results.length) {
            updateStatus('📖 تم عرض جميع النتائج المتاحة', '#94a3b8');
            return showToast('⚠️ لا توجد نتائج إضافية');
        }
        wikipediaPage = nextPage;
        renderWikipediaResults(results, query, true);
        updateStatus(`📖 تم تحميل ${results.length} نتيجة إضافية`, '#10b981');
    } catch (error) {
        console.error('خطأ في تحميل المزيد من ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء التحميل', '#ef4444');
    }
};

window.addEventListener('load', sortCountryDropdown);
countrySelect.addEventListener('focus', sortCountryDropdown);

console.log('✅ 05-events.js تم تحميله بنجاح — نسخة أداء محسّنة');
