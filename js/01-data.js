// ============================================================
// 01-data.js - تحميل البيانات بطريقة غير حاجبة للواجهة
// ============================================================

const INITIAL_RESULTS_LIMIT = 20;
let globalCitiesLoaded = false;
let globalCitiesLoading = null;

function showReadyState(message = 'الواجهة جاهزة للبحث') {
    resultsDiv.innerHTML = `
        <div class="card no-results">
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:16px;">🌍</div>
                <h3>${escapeHtml(message)}</h3>
                <p style="color:#94a3b8;margin-top:8px;">اكتب اسم مدينة أو دولة، أو اختر دولة من القائمة.</p>
                <p style="color:#94a3b8;font-size:12px;margin-top:4px;">يتم تحميل بيانات المدن حسب الحاجة لتجنب تجمّد الصفحة عند إعادة التحميل.</p>
            </div>
        </div>`;
    countSpan.textContent = '0';
}

async function loadData() {
    try {
        statusDiv.textContent = '⏳ جاري تحميل الدول...';
        statusDiv.style.color = '#f59e0b';

        // استخدم مسارًا مبنيًا على عنوان الصفحة حتى يعمل الموقع أيضًا داخل GitHub Pages /tuursim53/
        const dataUrl = new URL('output/countries.json', document.baseURI).href;
        const countriesRes = await fetch(dataUrl + '?v=20260918-data2', { cache: 'no-store' });
        if (!countriesRes.ok) throw new Error(`countries_http_${countriesRes.status}`);
        const rawCountries = (await countriesRes.text()).replace(/^\uFEFF/, '');
        try {
            countries = JSON.parse(rawCountries);
        } catch (parseError) {
            throw new Error('countries_invalid_json');
        }
        if (!Array.isArray(countries)) throw new Error('countries_not_array');

        const countryCollator = new Intl.Collator('ar', { sensitivity: 'base', numeric: false });
        countries.sort((a, b) => countryCollator.compare(
            String(a.name_ar || a.name || ''),
            String(b.name_ar || b.name || '')
        ));
        if (typeof populateCountrySelect === 'function') populateCountrySelect();
        else {
            countrySelect.innerHTML = '<option value="">🌐 كل الدول</option>';
            countries.forEach(c => {
                countryMap[c.code] = c.name_ar || c.name || c.code;
                countryNames[c.code] = c.name || c.code;
                const option = document.createElement('option');
                option.value = c.code;
                option.textContent = c.name_ar || c.name || c.code;
                countrySelect.appendChild(option);
            });
        }

        // مهم: لا نحمّل output/cities.json عند بدء التشغيل.
        // الملف الحالي حجمه ~40MB، وقراءته ثم JSON.parse ثم بناء _searchKey
        // دفعة واحدة كان يجمّد الخيط الرئيسي ويجعل إعادة التحميل تبدو معلّقة.
        // اعرض الدول فورًا بدل ترك منطقة النتائج فارغة.
        renderResults({ cities: [], countries: countries.slice(0, INITIAL_RESULTS_LIMIT) });
        statusDiv.textContent = `✅ تم تحميل ${countries.length.toLocaleString()} دولة — اختر دولة أو ابدأ البحث`;
        statusDiv.style.color = '#10b981';
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        statusDiv.textContent = '⚠️ تعذر تحميل بيانات الدول.';
        statusDiv.style.color = '#ef4444';
        resultsDiv.innerHTML = `
            <div class="card no-results"><div style="text-align:center;padding:40px;">
                <div style="font-size:48px;">⚠️</div><h3>تعذر تحميل البيانات</h3>
                <p style="color:#94a3b8;margin-top:8px;">تحقق من الاتصال ثم أعد تحميل الصفحة.</p>
            </div></div>`;
    }
}

// تحميل قاعدة المدن العالمية عند الطلب فقط، وليس أثناء بدء الصفحة.
// هذه الدالة متاحة للتوافق ويمكن استدعاؤها لاحقاً من زر "تحميل جميع المدن".
async function loadGlobalCities(options = {}) {
    if (globalCitiesLoaded) return allCities;
    if (globalCitiesLoading) return globalCitiesLoading;

    globalCitiesLoading = (async () => {
        try {
            if (!options.silent) updateStatus('⏳ جاري تحميل قاعدة المدن العالمية... قد يستغرق ذلك وقتاً على الأجهزة الضعيفة.', '#f59e0b');
            const citiesUrl = new URL('output/cities.json', document.baseURI).href;
            const citiesRes = await fetch(citiesUrl + '?v=20260918-data2', { cache: 'no-store' });
            if (!citiesRes.ok) throw new Error(`cities_http_${citiesRes.status}`);
            const rawCities = JSON.parse((await citiesRes.text()).replace(/^\uFEFF/, ''));

            allCities = rawCities.map(city => {
                city._searchKey = buildSearchableText(city);
                return city;
            });
            globalCitiesLoaded = true;
            if (!options.silent) updateStatus(`✅ تم تحميل ${allCities.length.toLocaleString()} مدينة`, '#10b981');
            if (!options.silent) renderResults({ cities: allCities.slice(0, INITIAL_RESULTS_LIMIT), countries: [] });
            return allCities;
        } catch (error) {
            console.error('خطأ في تحميل قاعدة المدن العالمية:', error);
            if (!options.silent) updateStatus('❌ تعذر تحميل قاعدة المدن العالمية', '#ef4444');
            throw error;
        } finally {
            globalCitiesLoading = null;
        }
    })();

    return globalCitiesLoading;
}

async function loadAllCountryCities() {
    const allCitiesTemp = [];
    let loaded = 0;
    for (const country of countries) {
        try {
            const countryUrl = new URL(`output/by_country/${country.code}.json`, document.baseURI).href;
            const res = await fetch(countryUrl + '?v=20260918-data2', { cache: 'no-store' });
            if (!res.ok) continue;
            const data = JSON.parse((await res.text()).replace(/^\uFEFF/, ''));
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
    globalCitiesLoaded = true;
    statusDiv.textContent = `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة`;
    statusDiv.style.color = '#10b981';
    renderResults({ cities: allCities.slice(0, INITIAL_RESULTS_LIMIT), countries: [] });
}

async function loadCountryCities(code) {
    if (!code) return [];
    const countryUrl = new URL(`output/by_country/${code}.json`, document.baseURI).href;
    const res = await fetch(countryUrl + '?v=20260918-data2', { cache: 'no-store' });
    if (!res.ok) throw new Error(`country_http_${res.status}`);
    let data = await res.json();
    if (!Array.isArray(data)) data = [];

    const countryName = countryMap[code] || code;
    const countryRecord = countries.find(c =>
        String(c?.code || c?.iso2 || c?.iso3 || '').toUpperCase() === String(code).toUpperCase()
    );
    const countryNameEn = String(countryRecord?.name || countryNames?.[code] || '').trim();
    const countryNameAr = countryRecord?.name_ar || countryName;

    // بعض ملفات by_country القديمة/المولدة قد تكون فارغة (مثل FR.json).
    // في هذه الحالة استخدم قاعدة المدن العالمية كاحتياط حتى لا تظهر الدولة بلا مدن.
    if (!data.length && typeof loadGlobalCities === 'function') {
        try {
            const global = await loadGlobalCities({ silent: true });
            const wantedCode = String(code).toUpperCase();
            const en = normalizeText(countryNameEn);
            const ar = normalizeText(countryNameAr);
            data = global.filter(city => {
                const cityCode = String(city?.country_code || city?.countryCode || city?.code_country || city?.iso2 || city?.iso3 || '').toUpperCase();
                const cityCountry = normalizeText(city?.country || '');
                const cityCountryAr = normalizeText(city?.country_ar || '');
                return cityCode === wantedCode ||
                    (en && cityCountry === en) ||
                    (ar && cityCountryAr === ar);
            });
        } catch (fallbackError) {
            console.warn('تعذر استخدام قاعدة المدن العالمية كاحتياط:', fallbackError);
        }
    }

    const cities = data.map(city => {
        city.country = countryNameEn || countryName;
        city.country_ar = countryNameAr;
        city._searchKey = buildSearchableText(city);
        return city;
    });

    // رتّب الدولة قبل إعادتها لأول مرة، وليس فقط بعد اكتمال العرض.
    // هذا يمنع ظهور ترتيب الملف الخام في أول اختيار للدولة.
    return typeof sortCitiesForCountry === 'function'
        ? sortCitiesForCountry(cities, code)
        : cities;
}

function showDemoData() {
    allCities = [
        { city: 'القاهرة', city_ar: 'القاهرة', country: 'مصر', country_ar: 'مصر' },
        { city: 'الرياض', city_ar: 'الرياض', country: 'السعودية', country_ar: 'السعودية' },
        { city: 'دبي', city_ar: 'دبي', country: 'الإمارات', country_ar: 'الإمارات' }
    ];
    allCities.forEach(city => city._searchKey = buildSearchableText(city));
    globalCitiesLoaded = true;
    renderResults({ cities: allCities, countries: [] });
}

console.log('✅ 01-data.js تم تحميله بنجاح — قاعدة المدن العالمية أصبحت lazy-loaded');
