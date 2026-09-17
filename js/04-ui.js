// ============================================================
// 04-ui.js - واجهة البحث المتقدم السريعة
// الفكرة: يختار المستخدم تصنيفاً واحداً ثم يبحث عن دولة/مدينة،
// وكل نتيجة تعرض رابط التصنيف المختار فقط بدلاً من إنشاء 48 رابطاً.
// ============================================================
let selectedAdvancedCategory = 0;

function cardStyle() {
    return 'background:white;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);contain:content;content-visibility:auto;';
}

function linkCount() {
    return typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48;
}

function getCategoryName(index = selectedAdvancedCategory) {
    return typeof getAdvancedLinkName === 'function' ? getAdvancedLinkName(index) : '📺 البحث العادي';
}

function getCategoryUrl(query, index = selectedAdvancedCategory) {
    return typeof generateAdvancedLink === 'function'
        ? generateAdvancedLink(query, index)
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(query || '')}`;
}

function buildAdvancedCategoryPanel() {
    const categories = typeof getAdvancedSearches === 'function' ? getAdvancedSearches() : [];
    return `<div class="advanced-category-panel" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;contain:content;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <strong style="color:#1e293b;">⚡ البحث المتقدم السريع</strong>
            <span style="font-size:12px;color:#64748b;">اختر تصنيفاً واحداً، ثم ابحث عن دولة أو مدينة من مربع البحث.</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="advanced-category-select" onchange="changeAdvancedCategory(this.value)" style="flex:1;min-width:230px;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#1e293b;">
                ${categories.map(item => `<option value="${item.index}" ${item.index === selectedAdvancedCategory ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
            </select>
            <span id="advanced-category-label" style="font-size:12px;color:#64748b;">التصنيف الحالي: ${escapeHtml(getCategoryName())}</span>
        </div>
    </div>`;
}

window.changeAdvancedCategory = function(value) {
    selectedAdvancedCategory = Number(value) || 0;
    const label = document.getElementById('advanced-category-label');
    if (label) label.textContent = `التصنيف الحالي: ${getCategoryName()}`;

    document.querySelectorAll('.advanced-category-link').forEach(link => {
        const query = link.dataset.query || '';
        link.href = getCategoryUrl(query, selectedAdvancedCategory);
        const text = link.querySelector('.advanced-category-link-text');
        if (text) text.textContent = `⚡ ${getCategoryName()}`;
    });
};

function buttonsHtml(query, index, mapsQuery = query, wikiUrl = '') {
    const advancedUrl = getCategoryUrl(query);
    return `<div class="btn-group" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}">📍 خرائط</a>
        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}">🔍 Google</a>
        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ YouTube</a>
        ${wikiUrl ? `<a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${wikiUrl}">📖 Wiki</a>` : ''}
        <a class="btn btn-secondary advanced-category-link" data-query="${escapeHtml(query)}" target="_blank" rel="noopener noreferrer" href="${advancedUrl}"><span class="advanced-category-link-text">⚡ ${escapeHtml(getCategoryName())}</span></a>
    </div>`;
}

function renderResults({ cities = [], countries = [] }) {
    resultsDiv.innerHTML = '';
    allLinksData = [];
    if (!cities.length && !countries.length) return renderEmptySearch();

    const parts = [buildAdvancedCategoryPanel()];
    parts.push(`<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button type="button" onclick="searchOnlyWikipedia()" style="padding:10px 20px;background:#3b82f6;color:white;border:0;border-radius:9px;cursor:pointer;">📖 بحث في ويكيبيديا</button>
        <button type="button" onclick="searchAllWikipedia()" style="padding:10px 20px;background:#8b5cf6;color:white;border:0;border-radius:9px;cursor:pointer;">🔍 بحث موسع</button>
    </div>`);
    let total = 0;

    if (countries.length) {
        parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🌍 دول (${countries.length})</h3></div>`);
        total += countries.length;
        countries.forEach(c => {
            const name = c.name || '', nameAr = c.name_ar || '', capital = c.capital || '';
            const query = [name, nameAr].filter(Boolean).join(' ');
            const index = allLinksData.length;
            allLinksData.push({ query, links: null, type: 'دولة', name });
            parts.push(`<div class="card" style="${cardStyle()}">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span><span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr || name)}</span></div></div>
                ${capital ? `<div style="font-size:13px;color:#475569;margin-bottom:7px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>` : ''}
                ${buttonsHtml(query, index, name)}
            </div>`);
        });
    }

    if (cities.length) {
        parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🏙️ مدن (${cities.length})</h3></div>`);
        total += cities.length;
        cities.forEach(c => {
            const city = c.city || '', cityAr = c.city_ar || '', country = c.country || '', countryAr = c.country_ar || '';
            const population = c.population || '';
            const query = [city, cityAr, country, countryAr].filter(Boolean).join(' ');
            const index = allLinksData.length;
            allLinksData.push({ query, links: null, type: 'مدينة', name: city });
            parts.push(`<div class="card" style="${cardStyle()}">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>${cityAr ? `<span style="color:#64748b;font-size:15px;margin-right:4px;">(${escapeHtml(cityAr)})</span>` : ''}<span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>${countryAr ? `<span style="color:#64748b;">(${escapeHtml(countryAr)})</span>` : ''}</div></div>
                ${population ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:7px;">👥 ${Number(population).toLocaleString()}</div>` : ''}
                ${buttonsHtml(query, index, city)}
                <div class="seo-tags" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في '+city+' '+country)}">🌍 السياحة</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق '+city+' '+country)}">🏨 فنادق</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم '+city+' '+country)}">🍽️ مطاعم</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية '+city+' '+country)}">🏛️ معالم</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى '+city+' '+country)}">✈️ السفر</a>
                </div>
            </div>`);
        });
    }
    resultsDiv.innerHTML = parts.join('');
    countSpan.textContent = total;
}

function renderEmptySearch() {
    const query = searchInput.value.trim();
    if (!query) {
        resultsDiv.innerHTML = `<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;margin-bottom:12px;">🔍</div><h3>ابحث عن مدينة أو دولة</h3><p style="color:#94a3b8;margin-top:7px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p></div></div>`;
        countSpan.textContent = '0';
        return;
    }
    updateStatus('🔍 جاري البحث في ويكيبيديا...', '#f59e0b');
    searchWikipediaMultilingual(query, 10, 0).then(wikiResults => {
        if (wikiResults.length) renderWikipediaResults(wikiResults, query);
        else { resultsDiv.innerHTML = `<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;">🔍</div><h3>لا توجد نتائج</h3><p style="color:#94a3b8;">جرب كلمات مختلفة</p></div></div>`; countSpan.textContent = '0'; }
    });
}

function renderWikipediaResults(results, query, isMore = false) {
    if (!results?.length) return;
    let html = '';
    if (!isMore) html += buildAdvancedCategoryPanel();
    results.forEach(item => {
        const index = allLinksData.length;
        allLinksData.push({ query: item.title, links: null, type: 'ويكيبيديا', name: item.title });
        const wc = item.wordcount ? `📝 ${Number(item.wordcount).toLocaleString()} كلمة` : '';
        html += `<div class="card" style="${cardStyle()}"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:17px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span><span style="color:#64748b;margin-right:7px;font-size:13px;">📖 ويكيبيديا</span>${wc ? `<span style="color:#94a3b8;font-size:11px;margin-right:5px;">${wc}</span>` : ''}</div></div><p style="margin:0 0 9px;color:#64748b;font-size:13px;line-height:1.5;">${escapeHtml(item.snippet || '')}</p>${buttonsHtml(item.title, index, item.title, item.url)}</div>`;
    });
    if (!isMore) html += `<div style="text-align:center;margin:14px 0;"><button type="button" onclick="loadMoreWikipedia()" style="padding:10px 24px;background:#3b82f6;color:white;border:0;border-radius:8px;cursor:pointer;">📚 تحميل 10 نتائج إضافية</button></div>`;
    resultsDiv.insertAdjacentHTML('beforeend', html);
}

// توافق مع أي كود قديم يستدعي toggleLinks: لا ننشئ 48 رابطاً عند الضغط.
window.toggleLinks = function(index) {
    const data = allLinksData[index];
    if (!data) return;
    window.open(getCategoryUrl(data.query), '_blank', 'noopener');
};

window.selectCity = function(name) {
    searchInput.value = name;
    suggestionsDiv.style.display = 'none';
    performSearch(name).then(renderResults);
};

function populateCountrySelect() {
    countrySelect.innerHTML = '<option value="">🌐 كل الدول</option>';
    countries.forEach(c => {
        const displayName = c.name_ar || c.name || c.code;
        countryMap[c.code] = displayName;
        countryNames[c.code] = c.name || c.code;
        const option = document.createElement('option');
        option.value = c.code; option.textContent = displayName;
        countrySelect.appendChild(option);
    });
}

console.log('✅ 04-ui.js تم تحميله بنجاح — اختيار تصنيف واحد سريع بدلاً من 48 رابطاً');