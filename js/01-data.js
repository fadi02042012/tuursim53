// ============================================================
// 01-data.js - تحميل البيانات بطريقة غير حاجبة للواجهة
// ============================================================

const INITIAL_RESULTS_LIMIT = 20;

async function loadData() {
    try {
        statusDiv.textContent = '⏳ جاري تحميل الدول...';
        statusDiv.style.color = '#f59e0b';

        const countriesRes = await fetch('output/countries.json', { cache: 'force-cache' });
        if (!countriesRes.ok) throw new Error(`countries_http_${countriesRes.status}`);
        countries = await countriesRes.json();
        populateCountrySelect();

        // اعرض الواجهة مباشرة بدل انتظار تحليل ملف المدن الكبير.
        resultsDiv.innerHTML = `
            <div class="card no-results">
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;">🌍</div>
                    <h3>جاهز للبحث</h3>
                    <p style="color:#94a3b8;margin-top:8px;">يمكنك كتابة أي نص في مربع البحث.</p>
                    <p style="color:#94a3b8;font-size:12px;margin-top:4px;">جاري تجهيز بيانات المدن في الخلفية...</p>
                </div>
            </div>`;
        countSpan.textContent = '0';

        // اترك للمتصفح فرصة رسم الواجهة قبل تحليل ملف المدن الكبير.
        await new Promise(resolve => {
            if ('requestIdleCallback' in window) requestIdleCallback(resolve, { timeout: 100 });
            else setTimeout(resolve, 0);
        });

        statusDiv.textContent = '⏳ جاري تحميل بيانات المدن...';
        const citiesRes = await fetch('output/cities.json', { cache: 'force-cache' });
        if (!citiesRes.ok) throw new Error(`cities_http_${citiesRes.status}`);
        const rawCities = await citiesRes.json();

        // لا ننسخ كل سجل باستخدام spread؛ ذلك يضاعف الذاكرة ويبطئ أول دخول.
        allCities = rawCities.map(city => {
            city._searchKey = buildSearchableText(city);
            return city;
        });

        statusDiv.textContent = `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة`;
        statusDiv.style.color = '#10b981';
        renderResults({ cities: allCities.slice(0, INITIAL_RESULTS_LIMIT), countries: [] });
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        statusDiv.textContent = '⚠️ تعذر تحميل البيانات. يمكنك المحاولة مرة أخرى.';
        statusDiv.style.color = '#ef4444';
        resultsDiv.innerHTML = `
            <div class="card no-results"><div style="text-align:center;padding:40px;">
                <div style="font-size:48px;">⚠️</div><h3>تعذر تحميل بيانات المدن</h3>
                <p style="color:#94a3b8;margin-top:8px;">تحقق من الاتصال ثم أعد تحميل الصفحة.</p>
            </div></div>`;
    }
}

async function loadAllCountryCities() {
    const allCitiesTemp = [];
    let loaded = 0;
    for (const country of countries) {
        try {
            const res = await fetch(`output/by_country/${country.code}.json`, { cache: 'force-cache' });
            if (!res.ok) continue;
            const data = await res.json();
            const countryName = countryNames[country.code] || country.code;
            data.forEach(city => {
                city.country = countryName;
                city.country_ar = country.name_ar || countryName;
                city._searchKey = buildSearchableText(city);
                allCitiesTemp.push(city);
            });
            loaded++;
            if (loaded % 10 === 0) statusDiv.textContent = `⏳ جاري تحميل المدن... ${loaded}/${countries.length}`;
            await new Promise(resolve => setTimeout(resolve, 0));
        } catch (error) { console.warn(`فشل تحميل ${country.code}:`, error); }
    }
    allCities = allCitiesTemp;
    statusDiv.textContent = `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة`;
    statusDiv.style.color = '#10b981';
    renderResults({ cities: allCities.slice(0, INITIAL_RESULTS_LIMIT), countries: [] });
}

async function loadCountryCities(code) {
    if (!code) return [];
    const res = await fetch(`output/by_country/${code}.json`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`country_http_${res.status}`);
    const data = await res.json();
    const countryName = countryMap[code] || code;
    const countryNameAr = countries.find(c => c.code === code)?.name_ar || countryName;
    return data.map(city => {
        city.country = countryName;
        city.country_ar = countryNameAr;
        city._searchKey = buildSearchableText(city);
        return city;
    });
}

function showDemoData() {
    allCities = [
        { city: 'القاهرة', city_ar: 'القاهرة', country: 'مصر', country_ar: 'مصر' },
        { city: 'الرياض', city_ar: 'الرياض', country: 'السعودية', country_ar: 'السعودية' },
        { city: 'دبي', city_ar: 'دبي', country: 'الإمارات', country_ar: 'الإمارات' }
    ];
    allCities.forEach(city => city._searchKey = buildSearchableText(city));
    renderResults({ cities: allCities, countries: [] });
}

console.log('✅ 01-data.js تم تحميله بنجاح');
