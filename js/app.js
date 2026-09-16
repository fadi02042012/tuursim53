// ============================================================
// app.js - تشغيل التطبيق بدون تجميد الصفحة عند الدخول
// ============================================================

let citiesLoadPromise = null;

function waitForIdle() {
    return new Promise(resolve => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(resolve, { timeout: 150 });
        } else {
            setTimeout(resolve, 0);
        }
    });
}

async function loadCitiesOnDemand() {
    if (Array.isArray(allCities) && allCities.length > 0) return allCities;
    if (citiesLoadPromise) return citiesLoadPromise;

    citiesLoadPromise = (async () => {
        statusDiv.textContent = '⏳ جاري تجهيز بيانات المدن...';
        statusDiv.style.color = '#f59e0b';
        await waitForIdle();

        const response = await fetch('output/cities.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error(`cities_http_${response.status}`);

        const rawCities = await response.json();
        allCities = rawCities.map(city => {
            city._searchKey = buildSearchableText(city);
            return city;
        });

        statusDiv.textContent = `✅ تم تجهيز ${allCities.length.toLocaleString()} مدينة`;
        statusDiv.style.color = '#10b981';
        return allCities;
    })().catch(error => {
        citiesLoadPromise = null;
        console.error('فشل تحميل المدن:', error);
        statusDiv.textContent = '⚠️ تعذر تحميل بيانات المدن';
        statusDiv.style.color = '#ef4444';
        throw error;
    });

    return citiesLoadPromise;
}

// لا يتم تحميل المدن إلا عند البحث الفعلي.
const originalPerformSearch = performSearch;
performSearch = async function lazyPerformSearch(query) {
    await loadCitiesOnDemand();
    return originalPerformSearch(query);
};

function createTextSearchCard(query) {
    const text = String(query || '').trim();
    if (!text) return '';

    const links = typeof generateAllLinks === 'function' ? generateAllLinks(text) : [];
    const index = allLinksData.length;
    allLinksData.push({ query: text, name: text, type: 'بحث نصي', links });

    return `
        <div class="card text-query-card" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border-right:4px solid #6366f1;">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                <div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(text)}</span>
                <span class="country-name" style="color:#64748b;margin-right:8px;">📝 بحث نصي</span></div>
                <span style="font-size:12px;color:#94a3b8;">${links.length} رابط</span>
            </div>
            <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <a target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}" style="padding:6px 12px;background:#4285f4;color:white;border-radius:8px;text-decoration:none;">🔍 Google</a>
                <a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}" style="padding:6px 12px;background:#ff0000;color:white;border-radius:8px;text-decoration:none;">▶ YouTube</a>
                <button class="btn btn-favorite favorite-toggle" data-favorite-index="${index}" onclick="toggleFavorite(${index})" type="button" aria-label="إضافة ${escapeHtml(text)} إلى المفضلة" style="padding:6px 12px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;">☆ مفضلة</button>
            </div>
        </div>`;
}

// البحث النصي لا يعتمد على تطابق مدينة؛ النص نفسه نتيجة صالحة دائمًا.
handleSearch = async function handleSearchWithoutBlocking() {
    const query = searchInput.value.trim();
    if (!query) {
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        renderResults({ cities: source.slice(0, 20), countries: [] });
        return;
    }

    const results = await performSearch(query);
    const hasLocalResults = results.cities.length > 0 || results.countries.length > 0;

    if (hasLocalResults) {
        renderResults(results);
        const card = createTextSearchCard(query);
        resultsDiv.insertAdjacentHTML('afterbegin', card);
        countSpan.textContent = String(results.cities.length + results.countries.length + 1);
        return;
    }

    // لا توجد مطابقة محلية: اعرض بطاقة النص فورًا، ثم ويكيبيديا اختياريًا.
    allLinksData = [];
    resultsDiv.innerHTML = createTextSearchCard(query);
    countSpan.textContent = '1';
    updateStatus('✅ تم إنشاء بطاقة للنص المدخل — جاري البحث في ويكيبيديا...', '#f59e0b');

    try {
        const wikiResults = await searchWikipediaMultilingual(query, 30);
        if (wikiResults.length > 0) {
            renderWikipediaResults(wikiResults, query, true);
            countSpan.textContent = String(wikiResults.length + 1);
            updateStatus(`📖 تم العثور على ${wikiResults.length} نتيجة في ويكيبيديا`, '#10b981');
        } else {
            updateStatus('✅ تم إنشاء بطاقة للنص المدخل', '#10b981');
        }
    } catch (error) {
        console.warn('تعذر البحث في ويكيبيديا:', error);
        updateStatus('✅ تم إنشاء بطاقة للنص المدخل', '#10b981');
    }
};

async function startApplication() {
    try {
        statusDiv.textContent = '⏳ جاري تحميل الدول...';
        statusDiv.style.color = '#f59e0b';

        const response = await fetch('output/countries.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error(`countries_http_${response.status}`);
        countries = await response.json();
        populateCountrySelect();

        // مهم: لا تستدعِ loadData ولا cities.json عند الدخول.
        resultsDiv.innerHTML = `
            <div class="card no-results">
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;">🔎</div>
                    <h3>جاهز للبحث</h3>
                    <p style="color:#94a3b8;margin-top:8px;">اكتب أي نص ثم اضغط زر البحث.</p>
                    <p style="color:#94a3b8;font-size:12px;margin-top:4px;">سيتم تحميل بيانات المدن عند الحاجة فقط.</p>
                </div>
            </div>`;
        countSpan.textContent = '0';
        statusDiv.textContent = `✅ تم تحميل ${countries.length} دولة — جاهز للبحث`;
        statusDiv.style.color = '#10b981';
    } catch (error) {
        console.error('خطأ في تشغيل التطبيق:', error);
        statusDiv.textContent = '⚠️ فشل تحميل الدول. تحقق من الاتصال ثم أعد المحاولة.';
        statusDiv.style.color = '#ef4444';
    }
}

startApplication();
console.log('✅ تم تشغيل التطبيق بدون تحميل المدن عند الدخول');
console.log('📁 سيتم تحميل cities.json عند أول بحث فقط');
