// ============================================================
// 05-events.js - أحداث المستخدم والأداء
// ============================================================

const SUGGESTIONS_DEBOUNCE_MS = 120;
const MAX_AUTO_OPEN_LINKS = 20;
const MAX_SUGGESTIONS = 12;
const RESULTS_PAGE_SIZE = 10;

let suggestionsTimeout = null;
let currentFullResults = [];
let currentDisplayLimit = RESULTS_PAGE_SIZE;
let showMoreBtn = null;
let countryLoadRequestId = 0;
const countryCitiesCache = new Map();

function updateStatus(message, color = '#64748b') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
}

function getCountryCapital(countryCode) {
    const code = String(countryCode || '').toUpperCase();
    const country = countries.find(item => String(item?.code || '').toUpperCase() === code);
    return String(country?.capital || country?.capital_en || country?.capital_ar || '').trim();
}
function updateStatus(message, color = '#64748b') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
}

function sortCitiesAlphabetically(cities) {
    // بقية المدن تُرتب حسب الاسم الإنجليزي فقط من A إلى Z.
    return [...(cities || [])].sort((a, b) => {
        const nameA = String(a?.city || '').trim();
        const nameB = String(b?.city || '').trim();

        return nameA.localeCompare(nameB, 'en', {
            sensitivity: 'base',
            numeric: true,
            ignorePunctuation: true
        }) || nameA.localeCompare(nameB, 'en');
    });
}

// المدن الأشهر تظهر أولاً عند اختيار الدولة، ثم بقية المدن أبجدياً.
const FEATURED_CITIES_BY_COUNTRY = {
    AE: ['Dubai','دبي','Abu Dhabi','أبو ظبي','Sharjah','الشارقة','Ajman','عجمان'],
    SA: ['Riyadh','الرياض','Jeddah','جدة','Mecca','Makkah','مكة','Medina','Madinah','المدينة المنورة','Dammam','الدمام','Taif','الطائف'],
    YE: ['Sanaa','صنعاء','Aden','عدن','Taiz','تعز','Al Hudaydah','Hodeidah','الحديدة','Mukalla','المكلا','Ibb','إب','Marib','مأرب','Shibam','شبام','Zabid','زبيد'],
    EG: ['Cairo','القاهرة','Alexandria','الإسكندرية','Giza','الجيزة','Luxor','الأقصر','Aswan','أسوان','Sharm El Sheikh','شرم الشيخ','Hurghada','الغردقة'],
    ET: ['Addis Ababa','أديس أبابا','Dire Dawa','دير داوا','Mekelle','Mek\'ele','Mekele','مكلي','Adama','Nazret','Bahir Dar','Hawassa','Gondar'],
    TR: ['Istanbul','إسطنبول','Ankara','أنقرة','Izmir','إزمير','Antalya','أنطاليا','Bursa','بورصة','Cappadocia','كابادوكيا'],
    US: ['New York','New York City','نيويورك','Los Angeles','لوس أنجلوس','Chicago','شيكاغو','Miami','ميامي','San Francisco','سان فرانسيسكو','Las Vegas','لاس فيغاس','Washington','واشنطن'],
    GB: ['London','لندن','Edinburgh','إدنبرة','Manchester','مانشستر','Liverpool','ليفربول','Birmingham','برمنغهام','Oxford','أكسفورد','Cambridge','كامبريدج'],
    FR: ['Paris','باريس','Nice','نيس','Lyon','ليون','Marseille','مرسيليا','Bordeaux','بوردو','Strasbourg','ستراسبورغ','Cannes','كان'],
    IT: ['Rome','روما','Milan','ميلانو','Venice','البندقية','Florence','فلورنسا','Naples','نابولي','Turin','تورينو','Bologna','بولونيا'],
    ES: ['Madrid','مدريد','Barcelona','برشلونة','Seville','إشبيلية','Valencia','فالنسيا','Granada','غرناطة','Malaga','مالقة','Bilbao','بلباو'],
    DE: ['Berlin','برلين','Munich','ميونخ','Hamburg','هامبورغ','Frankfurt','فرانكفورت','Cologne','كولونيا','Dresden','دريسدن'],
    MA: ['Marrakesh','Marrakech','مراكش','Casablanca','الدار البيضاء','Rabat','الرباط','Fes','فاس','Tangier','طنجة','Chefchaouen','شفشاون','Agadir','أكادير'],
    JO: ['Amman','عمان','Petra','البتراء','Aqaba','العقبة','Jerash','جرش','Madaba','مادبا'],
    OM: ['Muscat','مسقط','Salalah','صلالة','Nizwa','نزوى','Sur','صور','Sohar','صحار'],
    QA: ['Doha','الدوحة','Al Wakrah','الوكرة','Al Khor','الخور'],
    BH: ['Manama','المنامة','Muharraq','المحرق','Riffa','الرفاع'],
    KW: ['Kuwait City','مدينة الكويت','Salmiya','السالمية','Hawally','حولي'],
    IQ: ['Baghdad','بغداد','Erbil','أربيل','Basra','البصرة','Najaf','النجف','Karbala','كربلاء','Mosul','الموصل'],
    IR: ['Tehran','طهران','Isfahan','أصفهان','Shiraz','شيراز','Mashhad','مشهد','Tabriz','تبريز','Yazd','يزد'],
    IN: ['Mumbai','مومباي','Delhi','دلهي','New Delhi','نيودلهي','Agra','أغرا','Jaipur','جايبور','Bengaluru','بنغالور','Varanasi','فاراناسي','Kolkata','كولكاتا'],
    JP: ['Tokyo','طوكيو','Kyoto','كيوتو','Osaka','أوساكا','Hiroshima','هيروشيما','Nara','نارا','Sapporo','سابورو'],
    TH: ['Bangkok','بانكوك','Phuket','بوكيت','Chiang Mai','شيانغ ماي','Pattaya','باتايا','Krabi','كرابي'],
    MY: ['Kuala Lumpur','كوالالمبور','George Town','جورج تاون','Malacca','ملاكا','Langkawi','لنكاوي','Johor Bahru','جوهور باهرو'],
    ID: ['Jakarta','جاكرتا','Bali','بالي','Denpasar','دينباسار','Bandung','باندونغ','Yogyakarta','يوغياكارتا','Surabaya','سورابايا'],
    AU: ['Sydney','سيدني','Melbourne','ملبورن','Brisbane','بريزبن','Perth','بيرث','Gold Coast','غولد كوست','Canberra','كانبيرا'],
    CA: ['Toronto','تورونتو','Vancouver','فانكوفر','Montreal','مونتريال','Quebec City','مدينة كيبيك','Calgary','كالغاري','Ottawa','أوتاوا'],
    BR: ['Rio de Janeiro','ريو دي جانيرو','São Paulo','Sao Paulo','ساو باولو','Brasília','برازيليا','Salvador','سلفادور','Fortaleza','فورتاليزا'],
    MX: ['Mexico City','مكسيكو سيتي','Cancun','كانكون','Guadalajara','غوادالاخارا','Playa del Carmen','بلايا ديل كارمن','Tulum','تولوم'],
    ZA: ['Cape Town','كيب تاون','Johannesburg','جوهانسبرغ','Durban','ديربان','Pretoria','بريتوريا'],
    RU: ['Moscow','موسكو','Saint Petersburg','سانت بطرسبورغ','Kazan','قازان','Sochi','سوتشي','Novosibirsk','نوفوسيبيرسك'],
    PL: ['Warsaw','وارسو','Krakow','كراكوف','Gdansk','غدانسك','Wroclaw','فروتسواف','Poznan','بوزنان'],
    CZ: ['Prague','براغ','Brno','برنو','Karlovy Vary','كارلوفي فاري','Cesky Krumlov','تشيسكي كروملوف']
    ,IS: ['Reykjavik','Reykjavík','ريكيافيك','Kopavogur','Kópavogur','كوبافوغور','Hafnarfjordur','Hafnarfjörður','هافنارفيوردور','Akureyri','أكوريري','Keflavik','Keflavík','كيفلافيك','Reykjanesbaer','Reykjanesbær','Selfoss','Vestmannaeyjar']
};

// جميع رموز الدول مفعّلة: الدول ذات القائمة المخصصة تستخدمها،
// وبقية الدول تختار تلقائياً أكبر 5 مدن حسب عدد السكان.
const ALL_COUNTRY_CODES = new Set(["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","XK","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SS","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW","CS","AN"]);
Object.keys(FEATURED_CITIES_BY_COUNTRY).forEach(code => ALL_COUNTRY_CODES.add(code));
ALL_COUNTRY_CODES.forEach(code => {
    if (!Object.prototype.hasOwnProperty.call(FEATURED_CITIES_BY_COUNTRY, code)) {
        FEATURED_CITIES_BY_COUNTRY[code] = [];
    }
});

function normalizeCityNameForMatch(value) {
    return String(value || '').toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/[’'\`,.-]/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();
}

function sortCitiesForCountry(cities, countryCode) {
    const source = Array.isArray(cities) ? [...cities] : [];
    const code = String(countryCode || '').toUpperCase();

    const cityNames = city => [
        city?.city, city?.name, city?.city_name,
        city?.city_ar, city?.name_ar, city?.city_name_ar
    ].filter(Boolean).map(normalizeCityNameForMatch);

    const featuredNames = (FEATURED_CITIES_BY_COUNTRY[code] || [])
        .map(normalizeCityNameForMatch)
        .filter(Boolean);

    const used = new Set();
    const keyOf = city => cityNames(city)[0] || String(city?.id ?? city?.city_id ?? '');
    const take = predicate => source.filter(city => {
        const key = keyOf(city);
        if (used.has(key) || !predicate(city)) return false;
        used.add(key);
        return true;
    });

    // 1) العاصمة أولاً.
    const capitalName = normalizeCityNameForMatch(getCountryCapital(code));
    const capitalCities = take(city => capitalName && cityNames(city).some(name =>
        name === capitalName || name.includes(capitalName) || capitalName.includes(name)
    ));

    // 2) المدن الأشهر حسب القائمة المعتمدة للدولة.
    const featuredRank = new Map();
    featuredNames.forEach((name, index) => {
        if (!featuredRank.has(name)) featuredRank.set(name, index);
    });
    const featuredCities = take(city =>
        !capitalCities.includes(city) && cityNames(city).some(name => featuredRank.has(name))
    ).sort((a, b) => {
        const ar = Math.min(...cityNames(a).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
        const br = Math.min(...cityNames(b).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
        return ar - br;
    });

    // 3) أكبر المدن سكاناً، بعد استبعاد العاصمة والمدن الأشهر.
    const largestCities = take(city => Number(city?.population) > 0)
        .sort((a, b) =>
            Number(b.population || 0) - Number(a.population || 0) ||
            String(a.city || '').localeCompare(String(b.city || ''), 'en', { sensitivity: 'base', numeric: true })
        )
        .slice(0, 5);

    // 4) بقية المدن A-Z.
    const remaining = source.filter(city => !used.has(keyOf(city)));
    return [...capitalCities, ...featuredCities, ...largestCities, ...sortCitiesAlphabetically(remaining)];
}
window.sortCitiesFromWeb = async function sortCitiesFromWeb(countryCode) {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code || !Array.isArray(currentCountryCities) || !currentCountryCities.length) {
        showToast('⚠️ اختر دولة أولاً');
        return;
    }

    const button = document.getElementById('webCitySortBtn');
    if (button) button.disabled = true;
    updateStatus('🌐 جاري جلب ترتيب المدن من الويب...', '#f59e0b');

    try {
        // WDQS يدعم JSON عبر GET، ويُستخدم هنا فقط عند ضغط الزر.
        const query = [
            'SELECT ?city ?cityLabel ?population ?sitelinks ?capitalLabel WHERE {',
            '  ?country wdt:P297 "' + code + '".',
            '  OPTIONAL {',
            '    ?country wdt:P36 ?capital.',
            '    ?capital rdfs:label ?capitalLabel.',
            '    FILTER(LANG(?capitalLabel) = "en")',
            '  }',
            '  ?city wdt:P17 ?country; wdt:P1082 ?population.',
            '  OPTIONAL { ?city wikibase:sitelinks ?sitelinks. }',
            '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
            '}',
            'ORDER BY DESC(?sitelinks) DESC(?population)',
            'LIMIT 1000'
        ].join(' ');

        const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/sparql-results+json' }
        });
        if (!response.ok) throw new Error('wikidata_http_' + response.status);

        const data = await response.json();
        const rows = Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
        if (!rows.length) throw new Error('wikidata_empty');

        const webCities = new Map();
        let webCapital = '';

        for (const row of rows) {
            const name = row?.cityLabel?.value || '';
            const key = normalizeCityNameForMatch(name);
            if (!key) continue;

            if (row?.capitalLabel?.value) {
                webCapital = normalizeCityNameForMatch(row.capitalLabel.value);
            }

            const population = Number(row?.population?.value || 0);
            const sitelinks = Number(row?.sitelinks?.value || 0);
            const old = webCities.get(key);

            if (!old || population > old.population || sitelinks > old.sitelinks) {
                webCities.set(key, { population, sitelinks });
            }
        }

        const cityNames = city => [
            city?.city, city?.name, city?.city_name,
            city?.city_ar, city?.name_ar, city?.city_name_ar
        ].filter(Boolean).map(normalizeCityNameForMatch);

        const keyOf = city =>
            cityNames(city)[0] ||
            String(city?.id ?? city?.city_id ?? '');

        const webInfo = city => cityNames(city)
            .map(name => webCities.get(name))
            .filter(Boolean);

        const populationOf = city =>
            Math.max(0, ...webInfo(city).map(info => info.population || 0));

        const fameOf = city =>
            Math.max(0, ...webInfo(city).map(info => info.sitelinks || 0));

        const used = new Set();

        const takeFirst = predicate => {
            const city = currentCountryCities.find(item => {
                const key = keyOf(item);
                return !used.has(key) && predicate(item);
            });
            if (city) used.add(keyOf(city));
            return city ? [city] : [];
        };

        // 1) العاصمة.
        const capital = takeFirst(city =>
            webCapital && cityNames(city).some(name =>
                name === webCapital ||
                name.includes(webCapital) ||
                webCapital.includes(name)
            )
        );

        // 2) أشهر المدن: أعلى حضور في بيانات الويب (عدد روابط ويكيبيديا).
        const candidates = currentCountryCities.filter(city =>
            !used.has(keyOf(city)) && webInfo(city).length > 0
        );

        const famous = [...candidates]
            .sort((a, b) =>
                fameOf(b) - fameOf(a) ||
                populationOf(b) - populationOf(a) ||
                String(a?.city || '').localeCompare(String(b?.city || ''), 'en', { sensitivity: 'base' })
            )
            .slice(0, 5);

        famous.forEach(city => used.add(keyOf(city)));

        // 3) أكبر المدن حسب عدد السكان.
        const largest = candidates
            .filter(city => !used.has(keyOf(city)) && populationOf(city) > 0)
            .sort((a, b) =>
                populationOf(b) - populationOf(a) ||
                String(a?.city || '').localeCompare(String(b?.city || ''), 'en', { sensitivity: 'base' })
            )
            .slice(0, 5);

        largest.forEach(city => used.add(keyOf(city)));

        // 4) كل ما تبقى أبجديًا A-Z، بدون فقدان أو تكرار أي مدينة.
        const remaining = currentCountryCities.filter(city => !used.has(keyOf(city)));

        renderLocalCityResults([
            ...capital,
            ...famous,
            ...largest,
            ...sortCitiesAlphabetically(remaining)
        ]);

        updateStatus('✅ تم ترتيب المدن: العاصمة ← الأشهر ← الأكبر سكاناً ← A-Z', '#10b981');
    } catch (error) {
        console.error('خطأ في ترتيب المدن من الويب:', error);
        renderLocalCityResults(currentCountryCities);
        updateStatus('❌ تعذر جلب بيانات الويب، عُرضت المدن كما هي', '#ef4444');
        showToast('❌ تعذر الاتصال بمصدر الويب');
    } finally {
        if (button) button.disabled = false;
    }
}

function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateRelevanceScore(city, query) {
    const q = String(query || '').trim().toLowerCase();
    const qAr = normalizeText(query || '');
    if (!q) return 0;

    const nameEn = String(city.city || '').toLowerCase();
    const nameAr = normalizeText(city.city_ar || '');
    const searchableText = city._searchKey || buildSearchableText(city);
    let score = 0;

    if (nameEn === q || nameAr === qAr) score += 1000;
    if (nameEn.startsWith(q) || nameAr.startsWith(qAr)) score += 500;
    else if (new RegExp(`\\b${escapeRegex(q)}`, 'i').test(nameEn) || nameAr.split(' ').some(w => w.startsWith(qAr))) score += 250;
    else if (searchableText.includes(qAr) || nameEn.includes(q)) score += 100;

    const idx = nameEn.indexOf(q) >= 0 ? nameEn.indexOf(q) : nameAr.indexOf(qAr);
    if (idx >= 0) score += Math.max(0, 50 - idx * 5);
    score += Math.max(0, 20 - Math.abs(nameEn.length - q.length));
    if (city.population) score += Math.log10(Number(city.population) + 1) * 2;
    return score;
}

function sortCitiesByRelevance(cities, query) {
    if (!query || !query.trim()) return sortCitiesAlphabetically(cities);
    return [...cities]
        .map(city => ({ city, score: calculateRelevanceScore(city, query) }))
        .sort((a, b) => b.score - a.score || String(a.city.city || '').localeCompare(String(b.city.city || '')))
        .map(item => item.city);
}

function sortCountryDropdown() {
    if (!countrySelect) return;
    const options = Array.from(countrySelect.options);
    if (options.length <= 1) return;
    const selectedValue = countrySelect.value;
    const placeholder = options[0];
    options.slice(1).sort((a, b) => a.text.localeCompare(b.text, 'ar'));
    countrySelect.replaceChildren(placeholder, ...options.slice(1));
    countrySelect.value = selectedValue;
}

function renderLocalCityResults(sortedCities) {
    currentFullResults = Array.isArray(sortedCities) ? sortedCities : [];
    currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, currentFullResults.length || RESULTS_PAGE_SIZE);
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();
}

function showMoreLocalResults() {
    const oldLimit = currentDisplayLimit;
    currentDisplayLimit = Math.min(currentDisplayLimit + RESULTS_PAGE_SIZE, currentFullResults.length);
    if (currentDisplayLimit === oldLimit) return;
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();
    showMoreBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateShowMoreButton() {
    const remaining = Math.max(0, currentFullResults.length - currentDisplayLimit);
    if (!remaining) {
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }
    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.id = 'showMoreResultsBtn';
        showMoreBtn.type = 'button';
        showMoreBtn.style.cssText = 'display:block;width:100%;margin:15px 0;padding:12px 20px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;font-size:14px;cursor:pointer;';
        showMoreBtn.addEventListener('click', showMoreLocalResults);
        resultsDiv.insertAdjacentElement('afterend', showMoreBtn);
    }
    const nextBatch = Math.min(RESULTS_PAGE_SIZE, remaining);
    showMoreBtn.textContent = `⬇️ عرض المزيد (${nextBatch} من أصل ${remaining} متبقية)`;
    showMoreBtn.style.display = 'block';
}

function createSuggestionItem(city) {
    const cityName = city.city || '';
    return `<div class="suggestion" data-city="${escapeHtml(cityName)}" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;">🏙️ ${escapeHtml(cityName)} ${city.city_ar ? `(${escapeHtml(city.city_ar)})` : ''} ${city.country ? `- ${escapeHtml(city.country)}` : ''}</div>`;
}

function performLocalSearch(query) {
    const source = currentCountryCities.length ? currentCountryCities : allCities;
    const lower = String(query || '').toLowerCase();
    const arabic = normalizeText(query || '');
    const filtered = source.filter(city => {
        const text = city._searchKey || buildSearchableText(city);
        return text.includes(arabic) || String(city.city || '').toLowerCase().includes(lower) || String(city.city_ar || '').includes(arabic);
    });
    return sortCitiesByRelevance(filtered, query).slice(0, MAX_SUGGESTIONS);
}

function showSuggestions(results) {
    if (!suggestionsDiv) return;
    suggestionsDiv.innerHTML = results?.length ? results.map(createSuggestionItem).join('') : '';
    suggestionsDiv.style.display = results?.length ? 'block' : 'none';
}

if (suggestionsDiv) {
    suggestionsDiv.addEventListener('click', event => {
        const item = event.target.closest('.suggestion');
        if (item?.dataset.city) selectCity(item.dataset.city);
    });
}

function scheduleSuggestions(query) {
    clearTimeout(suggestionsTimeout);
    if (!query.trim()) {
        showSuggestions([]);
        return;
    }
    suggestionsTimeout = setTimeout(() => showSuggestions(performLocalSearch(query)), SUGGESTIONS_DEBOUNCE_MS);
}

async function searchWikipediaWithConfig(limit, message, extendedMessage) {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    updateStatus(message, '#f59e0b');
    wikipediaPage = 0;
    try {
        const results = await searchWikipediaMultilingual(query, Math.min(limit, RESULTS_PAGE_SIZE));
        if (!results.length) {
            updateStatus('❌ لم يتم العثور على نتائج في ويكيبيديا', '#ef4444');
            return showToast('❌ لم يتم العثور على نتائج في ويكيبيديا');
        }
        resultsDiv.innerHTML = '';
        allLinksData = [];
        renderWikipediaResults(results, query);
        updateStatus(extendedMessage || `📖 تم العثور على ${results.length} نتيجة في ويكيبيديا`, '#10b981');
        countSpan.textContent = String(results.length);
        updateFavoriteButtons?.();
    } catch (error) {
        console.error('خطأ في ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء البحث في ويكيبيديا', '#ef4444');
    }
}

// ============================================================
// البحث: الاقتراحات فقط أثناء الكتابة، والبحث الكامل عند Enter/الزر
// ============================================================
searchInput.addEventListener('input', function () {
    scheduleSuggestions(this.value);
});

searchInput.addEventListener('keydown', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(suggestionsTimeout);
        showSuggestions([]);
        await handleSearch();
    } else if (event.key === 'Escape') {
        clearTimeout(suggestionsTimeout);
        this.value = '';
        showSuggestions([]);
        this.blur();
    }
});

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    clearTimeout(suggestionsTimeout);
    showSuggestions([]);
    await handleSearch();
});

// ============================================================
// النسخ: بناء النص فقط عند الضغط، بدون عمل إضافي أثناء العرض
// ============================================================
document.getElementById('copyAll')?.addEventListener('click', async () => {
    if (!allLinksData.length) return showToast('⚠️ لا توجد روابط للنسخ');

    const chunks = ['🔍 روابط البحث عن المدن والدول', '='.repeat(60), ''];
    allLinksData.forEach((data, i) => {
        chunks.push(`📌 ${i + 1}. ${data.name} (${data.type})`);
        chunks.push(`   كلمة البحث: ${data.query}`);
        (data.links || []).forEach(link => chunks.push(`   ${link.id}. ${link.name}: ${link.url}`));
        chunks.push('');
    });
    const text = chunks.join('\n');
    const totalLinks = allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0);

    try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else fallbackCopy(text, totalLinks);
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (_) {
        fallbackCopy(text, totalLinks);
    }
});

function fallbackCopy(text, totalLinks) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        if (!document.execCommand('copy')) throw new Error('copy_failed');
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (error) {
        console.error('فشل النسخ:', error);
        showToast('❌ فشل نسخ الروابط');
    } finally {
        textarea.remove();
    }
}

// ============================================================
// فتح الروابط: حد أقصى آمن بدل جدولة مئات/آلاف النوافذ
// ============================================================
document.getElementById('openAll')?.addEventListener('click', () => {
    const allUrls = allLinksData.flatMap(data => (data.links || []).map(link => link.url)).filter(Boolean);
    if (!allUrls.length) return showToast('⚠️ لا توجد روابط للفتح');

    const urlsToOpen = allUrls.slice(0, MAX_AUTO_OPEN_LINKS);
    if (allUrls.length > MAX_AUTO_OPEN_LINKS && !confirm(`لديك ${allUrls.length.toLocaleString()} رابطًا. سيتم فتح أول ${MAX_AUTO_OPEN_LINKS} فقط لتجنب تجميد المتصفح. هل تريد المتابعة؟`)) return;

    let opened = 0;
    urlsToOpen.forEach((url, index) => {
        setTimeout(() => {
            try {
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                if (win) opened++;
            } catch (error) {
                console.warn('فشل فتح الرابط:', error);
            }
            if (index === urlsToOpen.length - 1) {
                showToast(opened ? `🚀 تم طلب فتح ${opened} رابط` : '⚠️ المتصفح منع النوافذ المنبثقة');
            }
        }, index * 100);
    });
});

// ============================================================
// مسح النتائج
// ============================================================
document.getElementById('clearResults')?.addEventListener('click', () => {
    resultsDiv.innerHTML = '';
    countSpan.textContent = '0';
    allLinksData = [];
    currentFullResults = [];
    currentDisplayLimit = 0;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    searchInput.value = '';
    showSuggestions([]);
    searchInput.focus();
    showToast('🗑 تم مسح النتائج');
});

// ============================================================
// تغيير الدولة: إلغاء الطلب السابق ومنع سباق الطلبات
// ============================================================
document.getElementById('webCitySortBtn')?.addEventListener('click', () => window.sortCitiesFromWeb(countrySelect?.value || ''));

countrySelect.addEventListener('change', async function () {
    const code = this.value;
    const requestId = ++countryLoadRequestId;
    searchInput.value = '';
    showSuggestions([]);

    if (!code) {
        currentCountryCities = [];
        updateStatus('🌐 بحث عالمي', '#64748b');
        if (allCities.length) renderLocalCityResults(sortCitiesAlphabetically(allCities));
        else {
            resultsDiv.innerHTML = '';
            countSpan.textContent = '0';
        }
        return;
    }

    const countryName = countryMap[code] || code;
    if (countryCitiesCache.has(code)) {
        currentCountryCities = countryCitiesCache.get(code);
        updateStatus(`✅ ${currentCountryCities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(currentCountryCities);
        return;
    }

    updateStatus(`⏳ جاري تحميل مدن ${countryName}...`, '#f59e0b');
    try {
        const cities = await loadCountryCities(code);
        if (requestId !== countryLoadRequestId || countrySelect.value !== code) return;
        countryCitiesCache.set(code, cities);
        currentCountryCities = cities;
        updateStatus(`✅ ${cities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(cities);
    } catch (error) {
        if (requestId !== countryLoadRequestId) return;
        console.error('خطأ في تحميل مدن الدولة:', error);
        updateStatus(`❌ فشل تحميل مدن ${countryName}`, '#ef4444');
        showToast('❌ حدث خطأ أثناء تحميل المدن');
    }
});

// جميع عمليات ويكيبيديا تبدأ الآن بحد أقصى 10 نتائج في الدفعة الأولى.
window.searchOnlyWikipedia = () => searchWikipediaWithConfig(RESULTS_PAGE_SIZE, '🔍 جاري البحث في ويكيبيديا...');
window.searchAllWikipedia = () => searchWikipediaWithConfig(RESULTS_PAGE_SIZE, '🔍 جاري البحث في ويكيبيديا...', '📖 تم تحميل 10 نتائج في الدفعة الأولى');

window.loadMoreWikipedia = async function () {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    const nextPage = wikipediaPage + 1;
    const offset = nextPage * RESULTS_PAGE_SIZE;
    updateStatus('⏳ جاري تحميل 10 نتائج إضافية من ويكيبيديا...', '#f59e0b');

    try {
        const results = await searchWikipediaMultilingual(query, RESULTS_PAGE_SIZE, offset);
        if (!results.length) {
            updateStatus('📖 تم عرض جميع النتائج المتاحة', '#94a3b8');
            return showToast('⚠️ لا توجد نتائج إضافية');
        }
        wikipediaPage = nextPage;
        renderWikipediaResults(results, query, true);
        updateStatus(`📖 تم تحميل ${results.length} نتيجة إضافية`, '#10b981');
    } catch (error) {
        console.error('خطأ في تحميل المزيد من ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء التحميل', '#ef4444');
    }
};

window.addEventListener('load', sortCountryDropdown);
countrySelect.addEventListener('focus', sortCountryDropdown);

console.log('✅ 05-events.js تم تحميله بنجاح — 10 نتائج لكل دفعة');
