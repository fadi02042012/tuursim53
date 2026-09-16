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

        // JSON كبير؛ لا نحمّله أثناء فتح الصفحة، بل فقط عند أول بحث فعلي.
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

// يجعل البحث المحلي ينتظر تحميل المدن عند الحاجة فقط، وليس عند فتح الصفحة.
const originalPerformSearch = performSearch;
performSearch = async function lazyPerformSearch(query) {
    await loadCitiesOnDemand();
    return originalPerformSearch(query);
};

async function startApplication() {
    try {
        statusDiv.textContent = '⏳ جاري تحميل الدول...';
        statusDiv.style.color = '#f59e0b';

        const response = await fetch('output/countries.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error(`countries_http_${response.status}`);
        countries = await response.json();
        populateCountrySelect();

        // لا تستدعِ loadData هنا؛ لأنها كانت تحمّل cities.json الكبير مباشرة.
        // الواجهة تظهر الآن فورًا، والبيانات تُحمّل عند أول بحث فقط.
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
