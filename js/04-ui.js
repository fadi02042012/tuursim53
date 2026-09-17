// ============================================================
// 04-ui.js - واجهة سريعة: لا نبني روابط 48 إلا عند الطلب
// ============================================================
const LINK_RENDER_CHUNK = 8;

function buildAdvancedLinksPlaceholder(index, query) {
    const count = typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48;
    return `<div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:8px;background:#f8fafc;border-radius:8px;contain:content;">
        <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>📌 ${count} رابط بحث متقدم</span><span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(query)}</span></div>
        <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:5px;"></div>
    </div>`;
}

function linkCount() { return typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48; }

function createLinkNode(link) {
    const a = document.createElement('a');
    a.className = 'link-item';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = link.url;
    a.style.cssText = 'padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:inherit;contain:layout paint;';
    const n = document.createElement('span');
    n.className = 'link-number'; n.style.color = '#94a3b8'; n.textContent = `#${link.id}`;
    const name = document.createElement('span');
    name.className = 'link-name'; name.style.marginRight = '4px'; name.textContent = link.name;
    a.append(n, name);
    return a;
}

function renderAdvancedLinksOnOpen(index) {
    const container = document.getElementById(`links-${index}`);
    const data = allLinksData[index];
    if (!container || !data || container.dataset.rendering === 'true' || container.dataset.rendered === 'true') return;
    const grid = container.querySelector('.links-grid');
    if (!grid) return;

    container.dataset.rendering = 'true';
    if (!Array.isArray(data.links)) data.links = generateAllLinks(data.query);
    const links = data.links;
    let cursor = 0;

    const renderChunk = () => {
        const fragment = document.createDocumentFragment();
        const end = Math.min(cursor + LINK_RENDER_CHUNK, links.length);
        for (; cursor < end; cursor++) fragment.appendChild(createLinkNode(links[cursor]));
        grid.appendChild(fragment);
        if (cursor < links.length) {
            (window.requestAnimationFrame || window.setTimeout)(renderChunk, 0);
        } else {
            container.dataset.rendering = 'false';
            container.dataset.rendered = 'true';
        }
    };
    renderChunk();
}

function cardStyle() { return 'background:white;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);contain:content;content-visibility:auto;'; }
function buttonsHtml(query, index, mapsQuery = query, wikiUrl = '') {
    return `<div class="btn-group" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}">📍 خرائط</a>
        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}">🔍 Google</a>
        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ YouTube</a>
        ${wikiUrl ? `<a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${wikiUrl}">📖 Wiki</a>` : ''}
        <button type="button" class="btn btn-secondary advanced-links-btn" data-links-index="${index}" onclick="toggleLinks(${index})">📋 عرض الروابط (${linkCount()})</button>
    </div>`;
}

function renderResults({ cities = [], countries = [] }) {
    resultsDiv.innerHTML = '';
    allLinksData = [];
    if (!cities.length && !countries.length) return renderEmptySearch();

    const parts = [`<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button type="button" onclick="searchOnlyWikipedia()" style="padding:10px 20px;background:#3b82f6;color:white;border:0;border-radius:9px;cursor:pointer;">📖 بحث في ويكيبيديا</button>
        <button type="button" onclick="searchAllWikipedia()" style="padding:10px 20px;background:#8b5cf6;color:white;border:0;border-radius:9px;cursor:pointer;">🔍 بحث موسع</button>
    </div>`];
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
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span><span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr || name)}</span></div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div>
                ${capital ? `<div style="font-size:13px;color:#475569;margin-bottom:7px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>` : ''}
                ${buttonsHtml(query, index, name)}
                ${buildAdvancedLinksPlaceholder(index, query)}
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
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>${cityAr ? `<span style="color:#64748b;font-size:15px;margin-right:4px;">(${escapeHtml(cityAr)})</span>` : ''}<span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>${countryAr ? `<span style="color:#64748b;">(${escapeHtml(countryAr)})</span>` : ''}</div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div>
                ${population ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:7px;">👥 ${Number(population).toLocaleString()}</div>` : ''}
                ${buttonsHtml(query, index, city)}
                <div class="seo-tags" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في '+city+' '+country)}">🌍 السياحة</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق '+city+' '+country)}">🏨 فنادق</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم '+city+' '+country)}">🍽️ مطاعم</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية '+city+' '+country)}">🏛️ معالم</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى '+city+' '+country)}">✈️ السفر</a>
                </div>
                ${buildAdvancedLinksPlaceholder(index, query)}
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
    if (!isMore) html += `<div class="wiki-toolbar" style="margin:10px 0 8px;padding:8px 12px;background:#f1f5f9;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><h3 style="font-size:15px;color:#1e293b;margin:0;">📖 نتائج ويكيبيديا</h3><button type="button" onclick="loadMoreWikipedia()" style="padding:6px 14px;background:#3b82f6;color:white;border:0;border-radius:6px;cursor:pointer;">📚 تحميل 10 أخرى</button></div>`;
    results.forEach(item => {
        const index = allLinksData.length;
        allLinksData.push({ query: item.title, links: null, type: 'ويكيبيديا', name: item.title });
        const wc = item.wordcount ? `📝 ${Number(item.wordcount).toLocaleString()} كلمة` : '';
        html += `<div class="card" style="${cardStyle()}"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:17px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span><span style="color:#64748b;margin-right:7px;font-size:13px;">📖 ويكيبيديا</span>${wc ? `<span style="color:#94a3b8;font-size:11px;margin-right:5px;">${wc}</span>` : ''}</div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div><p style="margin:0 0 9px;color:#64748b;font-size:13px;line-height:1.5;">${escapeHtml(item.snippet || '')}</p>${buttonsHtml(item.title, index, item.title, item.url)}${buildAdvancedLinksPlaceholder(index, item.title)}</div>`;
    });
    if (!isMore) html += `<div style="text-align:center;margin:14px 0;"><button type="button" onclick="loadMoreWikipedia()" style="padding:10px 24px;background:#3b82f6;color:white;border:0;border-radius:8px;cursor:pointer;">📚 تحميل 10 نتائج إضافية</button></div>`;
    resultsDiv.insertAdjacentHTML('beforeend', html);
}

window.toggleLinks = function(index) {
    const container = document.getElementById(`links-${index}`);
    if (!container || !allLinksData[index]) return;
    const open = container.style.display === 'none';
    if (open) {
        container.style.display = 'block';
        renderAdvancedLinksOnOpen(index);
    } else container.style.display = 'none';
    const btn = document.querySelector(`.advanced-links-btn[data-links-index="${index}"]`);
    if (btn) btn.textContent = open ? `📋 إخفاء الروابط (${linkCount()})` : `📋 عرض الروابط (${linkCount()})`;
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

console.log('✅ 04-ui.js تم تحميله بنجاح — واجهة روابط سريعة');