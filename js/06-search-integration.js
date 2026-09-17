// 06-search-integration.js - مسار البحث الفوري والروابط الفورية
(() => {
    function getAllAdvancedLinks(query) {
        try {
            return typeof generateAllLinks === 'function' ? generateAllLinks(query) : [];
        } catch (error) {
            console.error('خطأ في إنشاء روابط البحث المتقدم:', error);
            return [];
        }
    }

    function renderLinksGrid(links) {
        return links.map(link => `
            <a class="advanced-result-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link.url)}" style="display:block;padding:7px 9px;border-radius:7px;background:#fff;border:1px solid #e2e8f0;text-decoration:none;color:#334155;font-size:12px;line-height:1.35;">
                <span style="font-weight:700;">${escapeHtml(String(link.id))}. ${escapeHtml(link.name)}</span>
            </a>`).join('');
    }

    // إعادة تعريف بطاقة البحث بحيث تُنشئ الروابط محليًا فورًا، بدون fetch أو await.
    window.prependTextQueryCard = function (query) {
        const text = String(query || '').trim();
        if (!text) return;

        const index = allLinksData.length;
        const links = getAllAdvancedLinks(text);
        const linkCount = links.length || (typeof getAdvancedLinksCount === 'function' ? getAdvancedLinksCount() : 48);
        allLinksData.push({ query: text, links, type: 'بحث نصي', name: text });

        const card = `
        <div class="card text-query-card" style="background:white;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 1px 5px rgba(0,0,0,.08);">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
                <div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(text)}</span>
                <span class="country-name" style="color:#64748b;margin-right:8px;">📝 بحث نصي</span></div>
                <span style="font-size:12px;color:#64748b;font-weight:700;">${linkCount} رابط جاهز</span>
            </div>
            <div class="btn-group" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px;">
                <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}">📍 خرائط</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}">🔍 Google</a>
                <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}">▶ YouTube</a>
                <button class="btn btn-secondary" type="button" onclick="toggleLinks(${index})">📋 الروابط (${linkCount})</button>
                <button class="btn btn-favorite favorite-toggle" data-favorite-index="${index}" onclick="toggleFavorite(${index})" type="button">⭐ المفضلة</button>
            </div>
            <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;padding:0;">
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في ' + text)}">🌍 السياحة</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق ' + text)}">🏨 فنادق</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم ' + text)}">🍽️ مطاعم</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('صور ' + text)}">📷 صور</a>
                <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فيديو ' + text)}">🎬 فيديو</a>
            </div>
            <div class="all-links-container" id="links-${index}" style="display:none;margin:0;padding:8px;background:#f8fafc;border-radius:8px;">
                <div class="links-stats" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;"><span>📌 ${linkCount} رابط بحث متقدم</span><span>للبحث عن: ${escapeHtml(text)}</span></div>
                <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">${renderLinksGrid(links)}</div>
            </div>
        </div>`;
        resultsDiv.insertAdjacentHTML('afterbegin', card);
    };

    // عرض الروابط الموجودة في الذاكرة فورًا. لا فتح نافذة جديدة ولا انتظار شبكة.
    window.toggleLinks = function (index) {
        const safeIndex = Number(index);
        const data = allLinksData[safeIndex];
        const container = document.getElementById(`links-${safeIndex}`);
        if (!data || !container) return;
        if (!Array.isArray(data.links) || !data.links.length) data.links = getAllAdvancedLinks(data.query);
        const grid = container.querySelector('.links-grid');
        if (grid && !grid.children.length) grid.innerHTML = renderLinksGrid(data.links);
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    };

    // إصلاح اختيار الاقتراحات بعد جعل البحث المحلي متزامنًا.
    window.selectCity = function (name) {
        searchInput.value = String(name || '');
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        handleSearch();
    };

    // البحث المحلي متزامن: تظهر البطاقة والروابط قبل أي خدمة خارجية.
    window.handleSearch = function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (!query) {
            const source = currentCountryCities.length ? currentCountryCities : allCities;
            renderResults({ cities: source.slice(0, 10), countries: [] });
            return;
        }

        lastSearchRequestId = (Number(lastSearchRequestId) || 0) + 1;
        const requestId = lastSearchRequestId;
        allLinksData = [];
        resultsDiv.innerHTML = '';
        prependTextQueryCard(query);
        countSpan.textContent = '1';
        updateStatus('🔎 بطاقة البحث و48 رابطًا جاهزة فورًا؛ جاري البحث المحلي...', '#f59e0b');

        try {
            const results = performSearch(query);
            if (requestId !== lastSearchRequestId || searchInput.value.trim() !== query) return;

            if (results.cities.length || results.countries.length) {
                renderResults(results);
                prependTextQueryCard(query);
                countSpan.textContent = String(results.cities.length + results.countries.length + 1);
                updateStatus('✅ النتائج المحلية ظهرت؛ ويكيبيديا تعمل في الخلفية.', '#10b981');
            }

            // لا تنتظر ويكيبيديا إطلاقًا.
            if (typeof loadWikipediaForCurrentSearch === 'function') {
                Promise.resolve().then(() => loadWikipediaForCurrentSearch(query, requestId))
                    .catch(error => console.warn('Wikipedia background search:', error));
            }
        } catch (error) {
            if (requestId !== lastSearchRequestId) return;
            console.error('خطأ في البحث:', error);
            updateStatus('⚠️ ظهرت بطاقة البحث، وتعذر إكمال النتائج المحلية.', '#ef4444');
        }
    };

    console.log('✅ البحث الفوري مفعل — الروابط المتقدمة تُنشأ محليًا بدون انتظار خارجي');
})();
