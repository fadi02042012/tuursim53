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
let currentCountrySearchResult = null;
const countryCitiesCache = new Map();

async function trySearchExactCountry(query) {
    const q = String(query || '').trim();
    if (!q || !Array.isArray(countries) || !countries.length) return false;

    const norm = value => normalizeText(String(value || '').trim())
        .replace(/\\s+/g, ' ')
        .trim();
    const nq = norm(q);
    const country = countries.find(c => [c.name, c.name_ar, c.code, c.iso2, c.iso3]
        .filter(Boolean)
        .some(v => norm(v) === nq))
        || countries.find(c => {
            const code = String(c?.code || c?.iso2 || c?.iso3 || '').toUpperCase();
            return code && (
                norm(countryMap?.[code] || '') === nq ||
                norm(countryNames?.[code] || '') === nq
            );
        });

    if (!country) return false;

    const code = String(country.code || country.iso2 || country.iso3 || '').toUpperCase();
    if (!code || typeof loadCountryCities !== 'function') return false;

    updateStatus(`⏳ جاري ترتيب مدن ${country.name_ar || country.name || q}...`, '#f59e0b');

    try {
        let cities = countryCitiesCache.has(code)
            ? countryCitiesCache.get(code)
            : await loadCountryCities(code);

        if (!countryCitiesCache.has(code)) countryCitiesCache.set(code, cities);
        cities = typeof sortCitiesForCountry === 'function'
            ? sortCitiesForCountry(cities, code)
            : sortCitiesAlphabetically(cities);

        currentCountryCities = cities;
        currentFullResults = cities;
        currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, cities.length);
        currentCountrySearchResult = country;

        renderResults({
            countries: [country],
            cities: cities.slice(0, currentDisplayLimit)
        });
        updateShowMoreButton();
        updateStatus(`🌍 ${country.name_ar || country.name || q} — العاصمة ← الأشهر ← الأكبر سكاناً ← A-Z`, '#10b981');

        // بيانات المدن المحلية لا تحتوي دائماً على السكان، لذلك نحاول تحديث
        // الترتيب من Wikidata بعد العرض الأول. إذا تعذر المصدر تبقى القائمة المحلية.
        if (typeof window.sortCitiesFromWeb === 'function') {
            void window.sortCitiesFromWeb(code, { silent: true });
        }

        if (typeof window.refreshResultsPagination === 'function') window.refreshResultsPagination();
        return true;
    } catch (error) {
        console.error('تعذر تحميل مدن الدولة:', error);
        currentCountrySearchResult = null;
        updateStatus('❌ تعذر تحميل مدن الدولة', '#ef4444');
        return false;
    }
}

function updateStatus(message, color = '#64748b') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
}

// عواصم احتياطية: بعض نسخ بيانات الدول لا تحتوي على حقل capital،
// لذلك لا يجوز أن يسقط ترتيب الدولة إلى A-Z لمجرد غياب هذا الحقل.
const CAPITAL_BY_COUNTRY = {
    AF:'Kabul', AL:'Tirana', DZ:'Algiers', AD:'Andorra la Vella', AO:'Luanda',
    AR:'Buenos Aires', AM:'Yerevan', AU:'Canberra', AT:'Vienna', AZ:'Baku',
    BH:'Manama', BD:'Dhaka', BY:'Minsk', BE:'Brussels', BZ:'Belmopan', BJ:'Porto-Novo',
    BT:'Thimphu', BO:'Sucre', BA:'Sarajevo', BW:'Gaborone', BR:'Brasilia',
    BN:'Bandar Seri Begawan', BG:'Sofia', BF:'Ouagadougou', BI:'Gitega', KH:'Phnom Penh',
    CM:'Yaounde', CA:'Ottawa', CV:'Praia', CF:'Bangui', TD:'N\'Djamena', CL:'Santiago',
    CN:'Beijing', CO:'Bogota', KM:'Moroni', CG:'Brazzaville', CD:'Kinshasa',
    CR:'San Jose', CI:'Yamoussoukro', HR:'Zagreb', CU:'Havana', CY:'Nicosia',
    CZ:'Prague', DK:'Copenhagen', DJ:'Djibouti', DM:'Roseau', DO:'Santo Domingo',
    EC:'Quito', EG:'Cairo', SV:'San Salvador', GQ:'Malabo', ER:'Asmara', EE:'Tallinn',
    SZ:'Mbabane', ET:'Addis Ababa', FJ:'Suva', FI:'Helsinki', FR:'Paris',
    GA:'Libreville', GM:'Banjul', GE:'Tbilisi', DE:'Berlin', GH:'Accra', GR:'Athens',
    GD:'Saint George\'s', GT:'Guatemala City', GN:'Conakry', GW:'Bissau', GY:'Georgetown',
    HT:'Port-au-Prince', HN:'Tegucigalpa', HU:'Budapest', IS:'Reykjavik', IN:'New Delhi',
    ID:'Jakarta', IR:'Tehran', IQ:'Baghdad', IE:'Dublin', IL:'Jerusalem', IT:'Rome',
    JM:'Kingston', JP:'Tokyo', JO:'Amman', KZ:'Astana', KE:'Nairobi', KI:'South Tarawa',
    KP:'Pyongyang', KR:'Seoul', KW:'Kuwait City', KG:'Bishkek', LA:'Vientiane',
    LV:'Riga', LB:'Beirut', LS:'Maseru', LR:'Monrovia', LY:'Tripoli', LI:'Vaduz',
    LT:'Vilnius', LU:'Luxembourg', MG:'Antananarivo', MW:'Lilongwe', MY:'Kuala Lumpur',
    MV:'Male', ML:'Bamako', MT:'Valletta', MH:'Majuro', MR:'Nouakchott', MU:'Port Louis',
    MX:'Mexico City', FM:'Palikir', MD:'Chisinau', MC:'Monaco', MN:'Ulaanbaatar',
    ME:'Podgorica', MA:'Rabat', MZ:'Maputo', MM:'Naypyidaw', NA:'Windhoek', NR:'Yaren',
    NP:'Kathmandu', NL:'Amsterdam', NZ:'Wellington', NI:'Managua', NE:'Niamey',
    NG:'Abuja', MK:'Skopje', NO:'Oslo', OM:'Muscat', PK:'Islamabad', PW:'Ngerulmud',
    PA:'Panama City', PG:'Port Moresby', PY:'Asuncion', PE:'Lima', PH:'Manila',
    PL:'Warsaw', PT:'Lisbon', QA:'Doha', RO:'Bucharest', RU:'Moscow', RW:'Kigali',
    KN:'Basseterre', LC:'Castries', VC:'Kingstown', WS:'Apia', SM:'San Marino',
    ST:'Sao Tome', SA:'Riyadh', SN:'Dakar', RS:'Belgrade', SC:'Victoria', SL:'Freetown',
    SG:'Singapore', SK:'Bratislava', SI:'Ljubljana', SB:'Honiara', SO:'Mogadishu',
    ZA:'Pretoria', SS:'Juba', ES:'Madrid', LK:'Sri Jayawardenepura Kotte', SD:'Khartoum',
    SR:'Paramaribo', SE:'Stockholm', CH:'Bern', SY:'Damascus', TJ:'Dushanbe',
    TZ:'Dodoma', TH:'Bangkok', TL:'Dili', TG:'Lome', TO:'Nuku\'alofa', TT:'Port of Spain',
    TN:'Tunis', TR:'Ankara', TM:'Ashgabat', TV:'Funafuti', UG:'Kampala', UA:'Kyiv',
    AE:'Abu Dhabi', GB:'London', US:'Washington', UY:'Montevideo', UZ:'Tashkent',
    VU:'Port Vila', VA:'Vatican City', VE:'Caracas', VN:'Hanoi', YE:'Sanaa',
    ZM:'Lusaka', ZW:'Harare'
};

function getCountryCapital(countryCode) {
    const code = String(countryCode || '').toUpperCase();
    const list = Array.isArray(countries) ? countries : [];
    const country = list.find(item => String(item?.code || item?.iso2 || '').toUpperCase() === code);
    const fromData = String(country?.capital || country?.capital_en || country?.capital_ar || '').trim();
    return fromData || String(CAPITAL_BY_COUNTRY[code] || '').trim();
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
    CZ: ['Prague','براغ','Brno','برنو','Karlovy Vary','كارلوفي فاري','Cesky Krumlov','تشيسكي كروملوف'],
    ML: ['Bamako','باماكو','Timbuktu','تمبكتو','Sikasso','سيكاسو','Mopti','موبتي','Ségou','سيغو','Gao','جاو','Kayes','كايس','Koulikoro','كوليكورو']
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
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/[’'\`,.-]/g, ' ')
        .replace(/\s+/g, ' ')
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
        name === capitalName
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
    const largestCandidates = source.filter(city =>
        !used.has(keyOf(city)) && Number(city?.population) > 0
    );

    const largestCities = [...largestCandidates]
        .sort((a, b) =>
            Number(b.population || 0) - Number(a.population || 0) ||
            String(a.city || '').localeCompare(String(b.city || ''), 'en', { sensitivity: 'base', numeric: true })
        )
        .slice(0, 5);

    largestCities.forEach(city => used.add(keyOf(city)));

    // 4) بقية المدن A-Z.
    const remaining = source.filter(city => !used.has(keyOf(city)));
    return [...capitalCities, ...featuredCities, ...largestCities, ...sortCitiesAlphabetically(remaining)];
}
window.sortCitiesFromWeb = async function sortCitiesFromWeb(countryCode, options = {}) {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code || !Array.isArray(currentCountryCities) || !currentCountryCities.length) {
        showToast('⚠️ اختر دولة أولاً');
        return;
    }

    const button = document.getElementById('webCitySortBtn');
    if (button) button.disabled = true;
    if (!options.silent) updateStatus('🌐 جاري جلب ترتيب المدن من الويب...', '#f59e0b');

    try {
        // WDQS يدعم JSON عبر GET، ويُستخدم هنا فقط عند ضغط الزر.
        const query = [
            'SELECT ?city ?cityLabel ?population ?capitalLabel WHERE {',
            '  ?country wdt:P297 "' + code + '".',
            '  OPTIONAL {',
            '    ?country wdt:P36 ?capital.',
            '    ?capital rdfs:label ?capitalLabel.',
            '    FILTER(LANG(?capitalLabel) = "en")',
            '  }',
            '  ?city wdt:P17 ?country; wdt:P1082 ?population.',
            '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
            '}',
            'ORDER BY DESC(?population)',
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
            const old = webCities.get(key);

            if (!old || population > old.population) {
                webCities.set(key, { population });
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
            webCapital && cityNames(city).some(name => name === webCapital)
        );

        // 2) المدن الأشهر: القائمة المحلية الموثوقة للدولة، مع مطابقة أسماء الويب.
        const featuredNames = (FEATURED_CITIES_BY_COUNTRY[code] || [])
            .map(normalizeCityNameForMatch)
            .filter(Boolean);
        const featuredRank = new Map();
        featuredNames.forEach((name, index) => {
            if (!featuredRank.has(name)) featuredRank.set(name, index);
        });

        const famous = currentCountryCities
            .filter(city => !used.has(keyOf(city)))
            .filter(city => cityNames(city).some(name => featuredRank.has(name)))
            .sort((a, b) => {
                const ar = Math.min(...cityNames(a).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
                const br = Math.min(...cityNames(b).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
                return ar - br;
            })
            .slice(0, 5);

        famous.forEach(city => used.add(keyOf(city)));

        // 3) أكبر المدن حسب عدد السكان.
        const largest = currentCountryCities
            .filter(city => !used.has(keyOf(city)) && populationOf(city) > 0)
            .sort((a, b) =>
                populationOf(b) - populationOf(a) ||
                String(a?.city || '').localeCompare(String(b?.city || ''), 'en', { sensitivity: 'base' })
            )
            .slice(0, 5);

        largest.forEach(city => used.add(keyOf(city)));

        // 4) كل ما تبقى أبجديًا A-Z، بدون فقدان أو تكرار أي مدينة.
        const remaining = currentCountryCities.filter(city => !used.has(keyOf(city)));

        const ordered = [
            ...capital,
            ...famous,
            ...largest,
            ...sortCitiesAlphabetically(remaining)
        ];
        currentCountryCities = ordered;
        currentFullResults = ordered;
        currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, ordered.length);
        currentCountrySearchResult = Array.isArray(countries)
            ? countries.find(item => String(item?.code || '').toUpperCase() === code) || currentCountrySearchResult
            : currentCountrySearchResult;
        renderResults({
            countries: currentCountrySearchResult ? [currentCountrySearchResult] : [],
            cities: ordered.slice(0, currentDisplayLimit)
        });
        updateShowMoreButton();

        if (!options.silent) {
            updateStatus('✅ تم ترتيب المدن: العاصمة ← الأشهر ← الأكبر سكاناً ← A-Z', '#10b981');
        }
    } catch (error) {
        console.error('خطأ في ترتيب المدن من الويب:', error);
        renderLocalCityResults(currentCountryCities);
        if (!options.silent) {
            updateStatus('❌ تعذر جلب بيانات الويب، عُرضت المدن كما هي', '#ef4444');
            showToast('❌ تعذر الاتصال بمصدر الويب');
        }
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
    currentCountrySearchResult = null;
    currentFullResults = Array.isArray(sortedCities) ? sortedCities : [];
    currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, currentFullResults.length || RESULTS_PAGE_SIZE);
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: currentCountrySearchResult ? [currentCountrySearchResult] : [] });
    updateShowMoreButton();

    // مزامنة زر الدفعة التالية في الشريط الجانبي مع القائمة الجديدة.
    // مهم خصوصاً بعد اختيار دولة أو تحميل مدنها من الملف المحلي.
    if (typeof window.refreshResultsPagination === 'function') {
        window.refreshResultsPagination();
    }
}

function showMoreLocalResults() {
    const oldLimit = currentDisplayLimit;
    currentDisplayLimit = Math.min(currentDisplayLimit + RESULTS_PAGE_SIZE, currentFullResults.length);
    if (currentDisplayLimit === oldLimit) return;
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: currentCountrySearchResult ? [currentCountrySearchResult] : [] });
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

function createSuggestionItem(item) {
    if (item.type === 'country') {
        return '<div class="suggestion" data-country-code="' + escapeHtml(item.code || '') + '" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;">🌍 ' + escapeHtml(item.name_ar || item.name || '') + (item.name_ar && item.name ? ' (' + escapeHtml(item.name) + ')' : '') + '</div>';
    }
    const city = item.city || {};
    const cityName = city.city || '';
    return '<div class="suggestion" data-city="' + escapeHtml(cityName) + '" data-city-country="' + escapeHtml(city.country || '') + '" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;">🏙️ ' + escapeHtml(cityName) + (city.city_ar ? ' (' + escapeHtml(city.city_ar) + ')' : '') + (city.country ? ' - ' + escapeHtml(city.country) : '') + '</div>';
}

function performLocalSearch(query) {
    const source = allCities;
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
        if (item?.dataset.countryCode) {
            const country = (Array.isArray(countries) ? countries : []).find(c => String(c?.code || '').toUpperCase() === String(item.dataset.countryCode).toUpperCase());
            if (country) {
                searchInput.value = country.name_ar || country.name || '';
                if (countrySelect) countrySelect.value = country.code || '';
                showSuggestions([]);
            }
            return;
        }
        if (item?.dataset.city) selectCity(item.dataset.city);
    });
}

async function scheduleSuggestions(query) {
    clearTimeout(suggestionsTimeout);
    const text = String(query || '').trim();
    if (!text) {
        showSuggestions([]);
        return;
    }
    suggestionsTimeout = setTimeout(async () => {
        try {
            if (!allCities.length && typeof loadGlobalCities === 'function') {
                await loadGlobalCities({ silent: true });
            }
            const cityResults = performLocalSearch(text).map(city => ({ type: 'city', city }));
            const nq = normalizeText(text);
            const countryResults = (Array.isArray(countries) ? countries : [])
                .filter(country => {
                    const en = String(country?.name || '').toLowerCase();
                    const ar = normalizeText(country?.name_ar || '');
                    const code = String(country?.code || '').toLowerCase();
                    return en.includes(text.toLowerCase()) || ar.includes(nq) || code === text.toLowerCase();
                })
                .sort((a, b) => {
                    const score = country => {
                        const en = String(country?.name || '').toLowerCase();
                        const ar = normalizeText(country?.name_ar || '');
                        return (en === text.toLowerCase() || ar === nq ? 1000 : 0) +
                            (en.startsWith(text.toLowerCase()) || ar.startsWith(nq) ? 500 : 0);
                    };
                    return score(b) - score(a);
                })
                .slice(0, 4)
                .map(country => ({ type: 'country', ...country }));
            showSuggestions([...countryResults, ...cityResults].slice(0, MAX_SUGGESTIONS));
        } catch (error) {
            console.warn('تعذر تحميل اقتراحات البحث:', error);
            showSuggestions([]);
        }
    }, SUGGESTIONS_DEBOUNCE_MS);
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

searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearTimeout(suggestionsTimeout);
        showSuggestions([]);
        if (this.dataset.searching === '1') return;
        this.dataset.searching = '1';
        Promise.resolve(trySearchExactCountry(this.value).then(found=>found||handleSearch()))
            .catch(error=>console.error('Enter search error:',error))
            .finally(()=>{this.dataset.searching='0';});
    } else if (event.key === 'Escape') {
        clearTimeout(suggestionsTimeout);
        this.value = '';
        showSuggestions([]);
        this.blur();
    }
});

const searchAdvancedButton = document.getElementById('searchAdvancedBtn');



searchAdvancedButton?.addEventListener('click', event => {
    // التقاط الحدث في مرحلة capture على نفس الزر يمنع أي مستمع لاحق
    // من تنفيذ البحث العادي في نفس النقرة.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    clearTimeout(suggestionsTimeout);
    showSuggestions([]);
    const query=String(searchInput.value||'').trim();
    const selectedCountryCode=String(countrySelect?.value||'').trim().toUpperCase();

    // عند اختيار دولة من القائمة، افتح الفلترة مباشرة حتى لو كان مربع البحث فارغًا.
    // التغيير ينعكس فورًا على أزرار بطاقات المدن الحالية.
    if(selectedCountryCode){
        // اجعل اختيار الدولة من القائمة يتصرف تمامًا مثل كتابة اسم الدولة في مربع البحث.
        const selectedCountry = Array.isArray(countries)
            ? countries.find(c => String(c?.code || c?.iso2 || '').toUpperCase() === selectedCountryCode)
            : null;
        const countryQuery = String(selectedCountry?.name || selectedCountry?.name_ar || countryMap[selectedCountryCode] || selectedCountryCode).trim();
        if(countryQuery) searchInput.value = countryQuery;

        if(typeof window.showSearchAdvancedPrompt==='function'){
            window.showSearchAdvancedPrompt((mode)=>{
                if(mode==='advanced' && typeof window.showCountryCityPrompt==='function'){
                    window.showCountryCityPrompt(countryQuery,(fromCity)=>{
                        if(fromCity && typeof window.getSavedAdvancedSearchUrl==='function'){
                            window.location.assign(window.getSavedAdvancedSearchUrl(countryQuery));
                        }
                    });
                }
            });
        }
        return;
    }

    if(!query) return searchInput.focus();
    if(typeof window.showSearchAdvancedPrompt==='function'){
        window.showSearchAdvancedPrompt((mode)=>{
            if(mode==='advanced' && typeof window.showCountryCityPrompt==='function'){
                window.showCountryCityPrompt(query,(fromCity)=>{
                    if(fromCity&&typeof window.getSavedAdvancedSearchUrl==='function') window.location.assign(window.getSavedAdvancedSearchUrl(searchInput.value.trim()));
                    else if(typeof window.applyAdvancedCategoryToResults==='function') window.applyAdvancedCategoryToResults();
                });
            }
        });
    }
});

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    clearTimeout(suggestionsTimeout);
    showSuggestions([]);
    if (searchInput.dataset.searching === '1') return;
    searchInput.dataset.searching = '1';
    Promise.resolve(trySearchExactCountry(searchInput.value).then(found=>found||handleSearch()))
        .catch(error=>console.error('Button search error:',error))
        .finally(()=>{searchInput.dataset.searching='0';});
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
        updateStatus('جاهز للبحث', '#64748b');
        const ordered = sortCitiesForCountry(currentCountryCities, code);
        currentCountryCities = ordered;
        renderLocalCityResults(ordered);
        if (typeof window.sortCitiesFromWeb === 'function') {
            void window.sortCitiesFromWeb(code, { silent: true });
        }
        return;
    }

    updateStatus('⏳ جاري تحميل المدن...', '#f59e0b');
    try {
        const cities = await loadCountryCities(code);
        if (requestId !== countryLoadRequestId || countrySelect.value !== code) return;
        countryCitiesCache.set(code, cities);
        currentCountryCities = sortCitiesForCountry(cities, code);
        updateStatus('جاهز للبحث', '#64748b');
        renderLocalCityResults(currentCountryCities);
        if (typeof window.sortCitiesFromWeb === 'function') {
            void window.sortCitiesFromWeb(code, { silent: true });
        }
    } catch (error) {
        if (requestId !== countryLoadRequestId) return;
        console.error('خطأ في تحميل مدن الدولة:', error);
        updateStatus('تعذر التحميل', '#ef4444');
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

window.addEventListener('load', () => {
    sortCountryDropdown();
    // اجعل المؤشر في مربع البحث تلقائياً بعد اكتمال تحميل الصفحة.
    setTimeout(() => {
        try {
            searchInput.focus({ preventScroll: true });
            searchInput.select();
        } catch (_) {
            searchInput.focus();
        }
    }, 0);
});
countrySelect.addEventListener('focus', sortCountryDropdown);

console.log('✅ 05-events.js تم تحميله بنجاح — 10 نتائج لكل دفعة');
