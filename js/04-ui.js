// ============================================================
// 04-ui.js - واجهة المستخدم وعرض النتائج (معدل)
// ============================================================

// ============================================================
// 1. عرض النتائج الرئيسية
// ============================================================
function renderResults({ cities, countries }) {
    resultsDiv.innerHTML = "";
    allLinksData = [];

    // ✅ إذا كان هناك نتائج من JSON (مدن أو دول) اعرضها مباشرة
    if ((cities && cities.length > 0) || (countries && countries.length > 0)) {
        let html = '';
        let totalResults = 0;

        // عرض أزرار ويكيبيديا في الأعلى
        html += `
            <div style="display:flex;justify-content:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
                <button onclick="searchOnlyWikipedia()" style="padding:12px 28px;background:#3b82f6;color:white;border:none;border-radius:10px;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">
                    📖 بحث في ويكيبيديا
                </button>
                <button onclick="searchAllWikipedia()" style="padding:12px 28px;background:#8b5cf6;color:white;border:none;border-radius:10px;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(139,92,246,0.3);">
                    🔍 بحث موسع (100 نتيجة)
                </button>
            </div>
        `;

        // عرض الدول
        if (countries && countries.length > 0) {
            html += 
                `<div style="margin: 16px 0 8px; padding: 8px 16px; background: #f1f5f9; border-radius: 12px;">
                    <h3 style="font-size: 16px; color: #1e293b;">🌍 دول (${countries.length})</h3>
                </div>`;
            totalResults += countries.length;

            for (const c of countries) {
                const name = c.name || "";
                const nameAr = c.name_ar || "";
                const capital = c.capital || "";
                const query = [name, nameAr].filter(Boolean).join(" ");
                const links = generateAllLinks(query);
                const index = allLinksData.length;
                allLinksData.push({ query, links, type: 'دولة', name });

                html += `
                <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                        <div>
                            <span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span>
                            <span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr || name)}</span>
                        </div>
                        <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
                    </div>
                    ${capital ? `<div style="font-size:14px;color:#475569;margin-bottom:8px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>` : ''}
                    
                    <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}" style="padding:6px 12px;background:#34a853;color:white;border-radius:8px;text-decoration:none;font-size:13px;">📍 خريطة</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;font-size:13px;">🔎 جوجل</a>
                        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;font-size:13px;">▶ يوتيوب</a>
                        <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${links.length})</button>
                    </div>
                    
                    <div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;">
                        <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span>📌 ${links.length} رابط بحث متقدم</span>
                            <span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(query)}</span>
                        </div>
                        <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">
                            ${links.map(link => `
                                <a class="link-item" target="_blank" rel="noopener noreferrer" href="${link.url}" style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:#1e293b;font-size:12px;border:1px solid #e2e8f0;">
                                    <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
                                    <span class="link-name" style="margin-right:4px;">${link.name}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
            }
        }

        // عرض المدن
        if (cities && cities.length > 0) {
            html += 
                `<div style="margin: 16px 0 8px; padding: 8px 16px; background: #f1f5f9; border-radius: 12px;">
                    <h3 style="font-size: 16px; color: #1e293b;">🏙️ مدن (${cities.length})</h3>
                </div>`;
            totalResults += cities.length;

            for (const c of cities) {
                const city = c.city || "";
                const cityAr = c.city_ar || "";
                const country = c.country || "";
                const countryAr = c.country_ar || "";
                const population = c.population || "";
                const query = [city, cityAr, country, countryAr].filter(Boolean).join(" ");
                const links = generateAllLinks(query);
                const index = allLinksData.length;
                allLinksData.push({ query, links, type: 'مدينة', name: city });

                html += `
                <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                        <div>
                            <span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>
                            ${cityAr ? `<span class="city-name" style="color:#64748b;font-size:16px;margin-right:4px;">(${escapeHtml(cityAr)})</span>` : ''}
                            <span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>
                            ${countryAr ? `<span class="country-name" style="color:#64748b;">(${escapeHtml(countryAr)})</span>` : ''}
                        </div>
                        <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
                    </div>
                    ${population ? `<div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">👥 ${Number(population).toLocaleString()}</div>` : ''}
                    
                    <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}" style="padding:6px 12px;background:#34a853;color:white;border-radius:8px;text-decoration:none;font-size:13px;">📍 خريطة</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;font-size:13px;">🔎 جوجل</a>
                        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;font-size:13px;">▶ يوتيوب</a>
                        <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${links.length})</button>
                    </div>

                    <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في ' + city + ' ' + country)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🌍 سياحة</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق ' + city + ' ' + country)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🏨 فنادق</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم ' + city + ' ' + country)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🍽️ مطاعم</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية ' + city + ' ' + country)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🏛️ معالم</a>
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى ' + city + ' ' + country)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">✈️ سفر</a>
                    </div>
                    
                    <div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;">
                        <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span>📌 ${links.length} رابط بحث متقدم</span>
                            <span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(query)}</span>
                        </div>
                        <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">
                            ${links.map(link => `
                                <a class="link-item" target="_blank" rel="noopener noreferrer" href="${link.url}" style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:#1e293b;font-size:12px;border:1px solid #e2e8f0;">
                                    <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
                                    <span class="link-name" style="margin-right:4px;">${link.name}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
            }
        }

        resultsDiv.innerHTML = html;
        countSpan.textContent = totalResults;
        return;
    }

    // ============================================================
    // ✅ إذا لم يجد نتائج في JSON → ابحث في ويكيبيديا مباشرة
    // ============================================================
    const query = searchInput.value.trim();
    
    if (query) {
        statusDiv.textContent = "🔍 جاري البحث في ويكيبيديا...";
        statusDiv.style.color = '#f59e0b';
        
        searchWikipedia(query, 30).then(wikiResults => {
            if (wikiResults.length > 0) {
                resultsDiv.innerHTML = '';
                allLinksData = [];
                renderWikipediaResults(wikiResults, query);
                statusDiv.textContent = `📖 تم العثور على ${wikiResults.length} نتيجة في ويكيبيديا`;
                statusDiv.style.color = '#10b981';
                countSpan.textContent = wikiResults.length;
            } else {
                // ✅ إذا لم يجد في ويكيبيديا أيضاً → عرض رسالة "لا توجد نتائج"
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
                statusDiv.textContent = "❌ لم يتم العثور على نتائج";
                statusDiv.style.color = '#ef4444';
            }
        });
    } else {
        // ✅ إذا كان البحث فارغاً → عرض رسالة ترحيبية
        resultsDiv.innerHTML = `
            <div class="card no-results">
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;">🔍</div>
                    <h3>ابحث عن مدينة أو دولة</h3>
                    <p style="color:#94a3b8;margin-top:8px;">سيتم البحث في JSON أولاً، ثم ويكيبيديا</p>
                    <p style="color:#94a3b8;font-size:12px;margin-top:4px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p>
                </div>
            </div>
        `;
        countSpan.textContent = '0';
    }
}

// ============================================================
// 2. عرض نتائج ويكيبيديا
// ============================================================
function renderWikipediaResults(results, query, isMore = false) {
    if (!results || results.length === 0) return;
    
    let html = '';
    
    if (!isMore) {
        html = `
            <div style="margin: 16px 0 8px; padding: 8px 16px; background: #f1f5f9; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <h3 style="font-size: 16px; color: #1e293b;">📖 نتائج ويكيبيديا (${results.length})</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="loadMoreWikipedia()" style="padding: 6px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                        📚 تحميل المزيد
                    </button>
                    <button onclick="searchAllWikipedia()" style="padding: 6px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                        🔍 بحث موسع
                    </button>
                </div>
            </div>
        `;
    }
    
    results.forEach(item => {
        const searchQuery = item.title;
        const links = generateAllLinks(searchQuery);
        const index = allLinksData.length;
        allLinksData.push({ query: searchQuery, links, type: 'ويكيبيديا', name: item.title });
        
        const wordCount = item.wordcount ? `📝 ${Number(item.wordcount).toLocaleString()} كلمة` : '';
        const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString('ar-EG') : '';
        
        html += `
            <div class="card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                    <div>
                        <span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span>
                        <span class="country-name" style="color:#64748b;margin-right:8px;font-size:14px;">📖 ويكيبيديا</span>
                        ${wordCount ? `<span style="color:#94a3b8;font-size:12px;margin-right:6px;">${wordCount}</span>` : ''}
                        ${date ? `<span style="color:#94a3b8;font-size:12px;">📅 ${date}</span>` : ''}
                    </div>
                    <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
                </div>
                
                <p style="margin:0 0 12px 0;color:#64748b;font-size:14px;line-height:1.6;">${escapeHtml(item.snippet)}</p>
                
                <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                    <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#34a853;color:white;border-radius:8px;text-decoration:none;font-size:13px;">📍 خريطة</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;font-size:13px;">🔎 جوجل</a>
                    <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;font-size:13px;">▶ يوتيوب</a>
                    <a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${item.url}" style="padding:6px 12px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;font-size:13px;">📖 فتح المقال</a>
                    <button class="btn btn-secondary" onclick="toggleLinks(${index})" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-size:13px;">📋 عرض الروابط (${links.length})</button>
                </div>

                <div class="seo-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('تاريخ ' + searchQuery)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">📜 تاريخ</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معلومات عن ' + searchQuery)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">ℹ️ معلومات</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('صور ' + searchQuery)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🖼️ صور</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فيديو ' + searchQuery)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🎬 فيديو</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/${encodeURIComponent(searchQuery)}" style="padding:4px 10px;background:#4285f4;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🌐 English</a>
                    <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('site:ar.wikipedia.org ' + searchQuery)}" style="padding:4px 10px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:12px;">🔍 بحث</a>
                </div>
                
                <div class="all-links-container" id="links-${index}" style="display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;">
                    <div class="links-stats" style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span>📌 ${links.length} رابط بحث متقدم</span>
                        <span style="font-size:12px;color:#94a3b8;">للبحث عن: ${escapeHtml(searchQuery)}</span>
                    </div>
                    <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">
                        ${links.map(link => `
                            <a class="link-item" target="_blank" rel="noopener noreferrer" href="${link.url}" style="padding:4px 8px;background:white;border-radius:4px;text-decoration:none;color:#1e293b;font-size:12px;border:1px solid #e2e8f0;">
                                <span class="link-number" style="color:#94a3b8;">#${link.id}</span>
                                <span class="link-name" style="margin-right:4px;">${link.name}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    if (!isMore) {
        html += `
            <div style="text-align:center;margin:20px 0;padding:15px;background:#f8fafc;border-radius:12px;">
                <button onclick="loadMoreWikipedia()" style="padding:12px 30px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">
                    📚 تحميل المزيد من نتائج ويكيبيديا
                </button>
                <button onclick="searchAllWikipedia()" style="margin-right:10px;padding:12px 30px;background:#8b5cf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;box-shadow:0 2px 8px rgba(139,92,246,0.3);">
                    🔍 بحث موسع (100 نتيجة)
                </button>
            </div>
        `;
    }
    
    resultsDiv.innerHTML += html;
}

// ============================================================
// 3. Toast notifications
// ============================================================
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        max-width: 90%;
        direction: rtl;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// 4. اختيار مدينة من الاقتراحات
// ============================================================
window.selectCity = function(name) {
    searchInput.value = name;
    suggestionsDiv.style.display = 'none';
    performSearch(name).then(results => {
        renderResults(results);
    });
};

// ============================================================
// 5. ملء قائمة الدول
// ============================================================
function populateCountrySelect() {
    countrySelect.innerHTML = '<option value="">🌐 كل الدول</option>';
    countries.forEach(c => {
        const displayName = c.name_ar || c.name || c.code;
        countryMap[c.code] = displayName;
        countryNames[c.code] = c.name || c.code;
        // ✅ إنشاء العنصر عبر DOM بدل innerHTML += (أسرع: لا يعيد تحليل كل القائمة
        // في كل تكرار، وأأمن: لا حاجة لتهريب يدوي داخل نص HTML)
        const option = document.createElement('option');
        option.value = c.code;
        option.textContent = displayName;
        countrySelect.appendChild(option);
    });
}

console.log('✅ 04-ui.js تم تحميله بنجاح');