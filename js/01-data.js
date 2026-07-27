// ============================================================
// 01-data.js - تحميل ومعالجة البيانات
// ============================================================

// ============================================================
// 1. تحميل البيانات من JSON
// ============================================================
async function loadData() {
    try {
        statusDiv.textContent = '⏳ جاري تحميل الدول من countries.json...';
        
        const countriesRes = await fetch('output/countries.json');
        countries = await countriesRes.json();
        
        // ✅ استخدام populateCountrySelect() (معرّفة في 04-ui.js) بدل تكرار نفس
        // منطق ملء القائمة هنا مرة أخرى (كان مكرراً بالكامل في الملفين)
        populateCountrySelect();
        
        statusDiv.textContent = `✅ تم تحميل ${countries.length} دولة`;
        
        try {
            statusDiv.textContent = '⏳ جاري تحميل المدن من cities.json...';
            const citiesRes = await fetch('output/cities.json');
            const rawCities = await citiesRes.json();
            // ✅ حساب _searchKey مرة واحدة عند التحميل بدل إعادة حسابه (normalize + regex)
            // لكل مدينة عند كل ضغطة مفتاح أثناء البحث — فرق كبير على 200K+ مدينة
            allCities = rawCities.map(c => ({ ...c, _searchKey: buildSearchableText(c) }));
            statusDiv.textContent = `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة من ${countries.length} دولة`;
            statusDiv.style.color = '#10b981';
            renderResults({ cities: allCities.slice(0, 100), countries: [] });
        } catch (e) {
            statusDiv.textContent = '⏳ جاري تحميل المدن من ملفات الدول الفردية...';
            await loadAllCountryCities();
        }
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        statusDiv.textContent = '⚠️ فشل تحميل البيانات. تأكد من وجود الملفات في مجلد output/';
        statusDiv.style.color = '#ef4444';
        showDemoData();
    }
}

// ============================================================
// 2. تحميل مدن جميع الدول من الملفات الفردية
// ============================================================
async function loadAllCountryCities() {
    const allCitiesTemp = [];
    let loaded = 0;
    
    for (const country of countries) {
        try {
            const res = await fetch(`output/by_country/${country.code}.json`);
            const data = await res.json();
            const countryName = countryNames[country.code] || country.code;
            const cities = data.map(c => ({
                ...c,
                country: countryName,
                country_ar: country.name_ar || countryName,
                _searchKey: buildSearchableText({ ...c, country: countryName })
            }));
            allCitiesTemp.push(...cities);
            loaded++;
            
            if (loaded % 10 === 0) {
                statusDiv.textContent = `⏳ جاري تحميل المدن... ${loaded}/${countries.length} دولة`;
            }
        } catch (e) {
            console.warn(`⚠️ فشل تحميل ${country.code}:`, e);
        }
    }
    
    allCities = allCitiesTemp;
    statusDiv.textContent = `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة من ${loaded} دولة`;
    statusDiv.style.color = '#10b981';
    renderResults({ cities: allCities.slice(0, 100), countries: [] });
}

// ============================================================
// 3. تحميل مدن دولة معينة
// ============================================================
async function loadCountryCities(code) {
    if (!code) return [];
    try {
        const res = await fetch(`output/by_country/${code}.json`);
        const data = await res.json();
        const countryName = countryMap[code] || code;
        const countryNameAr = countries.find(c => c.code === code)?.name_ar || countryName;
        return data.map(c => ({
            ...c,
            country: countryName,
            country_ar: countryNameAr,
            _searchKey: buildSearchableText({ ...c, country: countryName })
        }));
    } catch (error) {
        console.warn(`⚠️ فشل تحميل مدن ${code}:`, error);
        return [];
    }
}

// ============================================================
// 4. بيانات تجريبية
// ============================================================
function showDemoData() {
    const demoCities = [
        { city: "القاهرة", city_ar: "القاهرة", country: "مصر", country_ar: "مصر", population: "20000000" },
        { city: "الرياض", city_ar: "الرياض", country: "السعودية", country_ar: "السعودية", population: "7000000" },
        { city: "دبي", city_ar: "دبي", country: "الإمارات", country_ar: "الإمارات", population: "3300000" },
        { city: "بيروت", city_ar: "بيروت", country: "لبنان", country_ar: "لبنان", population: "2200000" },
        { city: "عمان", city_ar: "عمان", country: "الأردن", country_ar: "الأردن", population: "4000000" },
        { city: "الكويت", city_ar: "الكويت", country: "الكويت", country_ar: "الكويت", population: "3000000" },
        { city: "الدوحة", city_ar: "الدوحة", country: "قطر", country_ar: "قطر", population: "2500000" },
        { city: "المنامة", city_ar: "المنامة", country: "البحرين", country_ar: "البحرين", population: "1500000" },
        { city: "مسقط", city_ar: "مسقط", country: "عمان", country_ar: "عمان", population: "1200000" },
        { city: "صنعاء", city_ar: "صنعاء", country: "اليمن", country_ar: "اليمن", population: "3000000" }
    ];
    allCities = demoCities;
    statusDiv.textContent = `⚠️ تم استخدام بيانات تجريبية (${allCities.length} مدينة)`;
    statusDiv.style.color = '#f59e0b';
    renderResults({ cities: allCities, countries: [] });
}

console.log('✅ 01-data.js تم تحميله بنجاح');