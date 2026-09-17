// ============================================================
// 04-ui.js - واجهة المستخدم وعرض النتائج (معدل)
// ============================================================

function buildAdvancedLinksPlaceholder(index, query) {
    const count = typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48;
    return `
        <div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;">
            <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>📌 ${count} رابط بحث متقدم</span><span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(query)}</span></div>
            <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;"></div>
        </div>`;
}

function linkCount() {
    return typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48;
}

function renderAdvancedLinksOnOpen(index) {
    const container = document.getElementById(`links-${index}`);
    const data = allLinksData[index];
    if (!container || !data) return;
    const grid = container.querySelector('.links-grid');
    if (!grid || container.dataset.rendered === 'true') return;

    if (!Array.isArray(data.links)) data.links = generateAllLinks(data.query);
    grid.innerHTML = data.links.map(link => `
        <a class="link-item" target="_blank" rel="noopener noreferrer" href="${link.url}" style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:inherit;">
            <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
            <span class="link-name" style="margin-right:4px;">${escapeHtml(link.name)}</span>
        </a>`).join('');
    container.dataset.rendered = 'true';
}

function renderResults({ cities, countries }) {
    resultsDiv.innerHTML = "";
    allLinksData = [];

    if ((cities && cities.length > 0) || (countries && countries.length > 0)) {
        let html = '';
        let totalResults = 0;

        html += `
            <div style="display:flex;justify-content:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
                <button onclick="searchOnlyWikipedia()" style="padding:12px 28px;background:#3b82f6;color:white;border:none;border-radius:10px;cursor:pointer;font-size:16px;">📖 بحث في ويكيبيديا</button>
                <button onclick="searchAllWikipedia()" style="padding:12px 28px;background:#8b5cf6;color:white;border:none;border-radius:10px;cursor:pointer;font-size:16px;">🔍 بحث موسع (100 نتيجة)</button>
            </div>`;

        if (countries && countries.length > 0) {
            html += `<div style="margin:16px 0 8px;padding:8px 16px;background:#f1f5f9;border-radius:12px;"><h3 style="font-size:16px;color:#1e293b;">🌍 دول (${countries.length})</h3></div>`;
            totalResults += countries.length;
            for (const c of countries) {
                const name = c.name || "";
                const nameAr = c.name_ar || "";
                const capital = c.capital || "";
                const query = [name, nameAr].filter(Boolean).join(" ");
                const index = allLinksData.length;
                allLinksData.push({ query, links: null, type: 'دولة', name });
                html += `
                <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span><span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr || name)}</span></div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div>
                    ${capital ? `<div style="font-size:14px;color:#475569;margin-bottom:8px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>` : ''}
                    <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}" style="padding:6px 12px;background:#10b981;color:white;border-radius:8px;text-decoration:none;">📍 خرائط</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a>
                        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a>
                        <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${linkCount()})</button>
                        <button class="btn btn-favorite favorite-toggle" data-favorite-index="${index}" onclick="toggleFavorite(${index})" type="button" aria-label="إضافة ${escapeHtml(name)} إلى المفضلة" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">☆ مفضلة</button>
                    </div>
                    ${buildAdvancedLinksPlaceholder(index, query)}
                </div>`;
            }
        }

        if (cities && cities.length > 0) {
            html += `<div style="margin:16px 0 8px;padding:8px 16px;background:#f1f5f9;border-radius:12px;"><h3 style="font-size:16px;color:#1e293b;">🏙️ مدن (${cities.length})</h3></div>`;
            totalResults += cities.length;
            for (const c of cities) {
                const city = c.city || "";
                const cityAr = c.city_ar || "";
                const country = c.country || "";
                const countryAr = c.country_ar || "";
                const population = c.population || "";
                const query = [city, cityAr, country, countryAr].filter(Boolean).join(" ");
                const index = allLinksData.length;
                allLinksData.push({ query, links: null, type: 'مدينة', name: city });
                html += `
                <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>${cityAr ? `<span class="city-name" style="color:#64748b;font-size:16px;margin-right:4px;">(${escapeHtml(cityAr)})</span>` : ''}<span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>${countryAr ? `<span class="country-name" style="color:#64748b;">(${escapeHtml(countryAr)})</span>` : ''}</div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div>
                    ${population ? `<div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">👥 ${Number(population).toLocaleString()}</div>` : ''}
                    <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}" style="padding:6px 12px;background:#10b981;color:white;border-radius:8px;text-decoration:none;">📍 خرائط</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a>
                        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a>
                        <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${linkCount()})</button>
                        <button class="btn btn-favorite favorite-toggle" data-favorite-index="${index}" onclick="toggleFavorite(${index})" type="button" aria-label="إضافة ${escapeHtml(city)} إلى المفضلة" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">☆ مفضلة</button>
                    </div>
                    <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في ' + city + ' ' + country)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🌍 السياحة</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق ' + city + ' ' + country)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🏨 فنادق</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم ' + city + ' ' + country)}" style="padding:4px 10px;background:#eef2ff;color:#4338bf;border-radius:8px;text-decoration:none;font-size:12px;">🍽️ مطاعم</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية ' + city + ' ' + country)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">🏛️ معالم</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى ' + city + ' ' + country)}" style="padding:4px 10px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-size:12px;">✈️ السفر</a>
                    </div>
                    ${buildAdvancedLinksPlaceholder(index, query)}
                </div>`;
            }
        }

        resultsDiv.innerHTML = html;
        countSpan.textContent = totalResults;
        return;
    }

    const query = searchInput.value.trim();
    if (query) {
        statusDiv.textContent = '🔍 جاري البحث في ويكيبيديا...';
        statusDiv.style.color = '#f59e0b';
        searchWikipediaMultilingual(query, 30).then(wikiResults => {
            if (wikiResults.length > 0) {
                resultsDiv.innerHTML = '';
                allLinksData = [];
                renderWikipediaResults(wikiResults, query);
                statusDiv.textContent = `📖 تم العثور على ${wikiResults.length} نتيجة في ويكيبيديا`;
                statusDiv.style.color = '#10b981';
                countSpan.textContent = wikiResults.length;
            } else {
                resultsDiv.innerHTML = `<div class="card no-results"><div style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:16px;">🔍</div><h3>لا توجد نتائج</h3><p style="color:#94a3b8;margin-top:8px;">جرب البحث بكلمات مختلفة</p></div></div>`;
                countSpan.textContent = '0';
                statusDiv.textContent = '❌ لم يتم العثور على نتائج';
                statusDiv.style.color = '#ef4444';
            }
        });
    } else {
        resultsDiv.innerHTML = `<div class="card no-results"><div style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:16px;">🔍</div><h3>ابحث عن مدينة أو دولة</h3><p style="color:#94a3b8;margin-top:8px;">سيتم البحث في JSON أولاً، ثم ويكيبيديا</p><p style="color:#94a3b8;font-size:12px;margin-top:4px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p></div></div>`;
        countSpan.textContent = '0';
    }
}

function renderWikipediaResults(results, query, isMore = false) {
    if (!results || results.length === 0) return;
    let html = '';
    if (!isMore) {
        html = `<div style="margin:16px 0 8px;padding:8px 16px;background:#f1f5f9;border-radius:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;"><h3 style="font-size:16px;color:#1e293b;">📖 نتائج ويكيبيديا (${results.length})</h3><div style="display:flex;gap:10px;flex-wrap:wrap;"><button onclick="loadMoreWikipedia()" style="padding:6px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">📚 تحميل المزيد</button><button onclick="searchAllWikipedia()" style="padding:6px 16px;background:#8b5cf6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🔍 بحث موسع</button></div></div>`;
    }
    results.forEach(item => {
        const searchQuery = item.title;
        const index = allLinksData.length;
        allLinksData.push({ query: searchQuery, links: null, type: 'ويكيبيديا', name: item.title });
        const wordCount = item.wordcount ? `📝 ${Number(item.wordcount).toLocaleString()} كلمة` : '';
        const date = item.timestamp ? new Date(item.timestamp).toDateString('ar-EG') : '';
        html += `<div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span><span class="country-name" style="color:#64748b;margin-right:8px;font-size:14px;">📖 ويكيبيديا</span>${wordCount ? `<span style="color:#94a3b8;font-size:12px;margin-right:6px;">${wordCount}</span>` : ''}${date ? `<span style="color:#94a3b8;font-size:12px;">📅 ${date}</span>` : ''}</div><span style="font-size:12px;color:#94a3b8;">${linkCount()} رابط</span></div><p style="margin:0 0 12px;color:#64748b;font-size:14px;line-height:1.6;">${escapeHtml(item.snippet)}</p><div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#10b981;color:white;border-radius:8px;text-decoration:none;">📍 خرائط</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a><a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a><a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${item.url}" style="padding:6px 12px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;">📖 Wiki</a><button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${linkCount()})</button></div>${buildAdvancedLinksPlaceholder(index, searchQuery)}</div>`;
    });
    if (!isMore) html += `<div style="text-align:center;margin:20px 0;padding:15px;background:#f8fafc;border-radius:12px;"><button onclick="loadMoreWikipedia()" style="padding:12px 30px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;">📚 تحميل المزيد من نتائج ويكيبيديا</button><button onclick="searchAllWikipedia()" style="margin-right:10px;padding:12px 30px;background:#8b5cf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;">🔍 بحث موسع (100 نتيجة)</button></div>`;
    resultsDiv.innerHTML += html;
}

window.toggleLinks = function(index) {
    const container = document.getElementById(`links-${index}`);
    if (!container) return;
    const data = allLinksData[index];
    if (!data) return;
    const willExpand = container.style.display === 'none';
    if (willExpand) renderAdvancedLinksOnOpen(index);
    const card = container.closest('.card');
    const linksGrid = container.querySelector('.links-grid');
    if (card) {
        if (willExpand) {
            card.style.setProperty('height', 'auto', 'important');
            card.style.setProperty('min-height', '0', 'important');
            card.style.setProperty('overflow', 'visible', 'important');
            card.classList.add('links-expanded');
        } else {
            card.style.removeProperty('height'); card.style.removeProperty('min-height'); card.style.removeProperty('overflow'); card.classList.remove('links-expanded');
        }
    }
    if (linksGrid && willExpand) {
        linksGrid.style.setProperty('grid-template-columns', 'repeat(5, minmax(0, 1fr))', 'important');
        linksGrid.style.setProperty('max-height', 'none', 'important');
        linksGrid.style.setProperty('overflow', 'visible', 'important');
        linksGrid.style.setProperty('width', '100%', 'important');
    }
    if (linksGrid && !willExpand) {
        linksGrid.style.removeProperty('grid-template-columns'); linksGrid.style.removeProperty('max-height'); linksGrid.style.removeProperty('overflow'); linksGrid.style.removeProperty('width');
    }
    container.style.display = willExpand ? 'block' : 'none';
    const btn = document.querySelector(`[onclick="toggleLinks(${index})"]`);
    if (btn) btn.textContent = willExpand ? `📋 إخفاء الروابط (${linkCount()})` : `📋 عرض الروابط (${linkCount()})`;
};

window.selectCity = function(name) {
    searchInput.value = name;
    suggestionsDiv.style.display = 'none';
    performSearch(name).then(results => renderResults(results));
};

function populateCountrySelect() {
    countrySelect.innerHTML = '<option value="">🌐 كل الدول</option>';
    countries.forEach(c => {
        const displayName = c.name_ar || c.name || c.code;
        countryMap[c.code] = displayName;
        countryNames[c.code] = c.name || c.code;
        const option = document.createElement('option');
        option.value = c.code;
        option.textContent = displayName;
        countrySelect.appendChild(option);
    });
}

console.log('✅ 04-ui.js تم تحميله بنجاح');