// ============================================================
// 05-events.js - أحداث المستخدم (نسخة محسّنة + ترتيب بالصلة + عرض المزيد)
// ============================================================

// ثوابت للتحكم بالأداء (بدل الأرقام السحرية المتفرقة في الكود)
const SUGGESTIONS_DEBOUNCE_MS = 150;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_AUTO_OPEN_LINKS = 20;
const MAX_SUGGESTIONS = 20;
const RESULTS_PAGE_SIZE = 100; // عدد النتائج المعروضة في كل "دفعة"

// مؤقت مستقل لاقتراحات البحث المحلي (منفصل عن searchTimeout الخاص بالبحث الموسّع)
let suggestionsTimeout = null;

// كاش لمدن كل دولة كي لا يُعاد تحميلها من الشبكة عند التبديل بين الدول
const countryCitiesCache = new Map();

// حالة عرض النتائج المحلية على دفعات (Show More)
let currentFullResults = [];          // القائمة الكاملة المفروزة (بدون قص)
let currentDisplayLimit = RESULTS_PAGE_SIZE;
let showMoreBtn = null;

// ============================================================
// 1. دوال مساعدة مشتركة
// ============================================================

/**
 * تحديث شريط الحالة مع رسالة ولون
 */
function updateStatus(message, color = '#64748b') {
    statusDiv.textContent = message;
    statusDiv.style.color = color;
}

/**
 * ترتيب المدن أبجدياً (يُستخدم كحالة افتراضية عند عدم وجود نص بحث)
 */
function sortCitiesAlphabetically(cities) {
    return [...cities].sort((a, b) => {
        const nameA = (a.city || "").toLowerCase();
        const nameB = (b.city || "").toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

/**
 * هروب الأحرف الخاصة قبل استخدامها داخل تعبير نمطي (RegExp)
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * حساب نقاط الصلة بين استعلام المستخدم ومدينة معيّنة
 * كلما زادت النقاط، زادت أهمية النتيجة وتصدّرت أعلى القائمة
 */
function calculateRelevanceScore(city, query) {
    const q = (query || "").trim().toLowerCase();
    const qAr = normalizeText(query || "");
    if (!q) return 0;

    const nameEn = (city.city || "").toLowerCase();
    const nameAr = normalizeText(city.city_ar || "");
    const searchableText = buildSearchableText(city);

    let score = 0;

    // 1) تطابق كامل = أعلى نقاط ممكنة
    if (nameEn === q || nameAr === qAr) {
        score += 1000;
    }

    // 2) تطابق في بداية الاسم (الأكثر شيوعًا أثناء الطباعة التدريجية)
    if (nameEn.startsWith(q) || nameAr.startsWith(qAr)) {
        score += 500;
    }
    // 3) تطابق في بداية كلمة داخل اسم مركّب، مثل "نيويورك" / "New York"
    else if (new RegExp(`\\b${escapeRegex(q)}`, 'i').test(nameEn) ||
             nameAr.split(' ').some(w => w.startsWith(qAr))) {
        score += 250;
    }
    // 4) تطابق جزئي في أي مكان
    else if (searchableText.includes(qAr) || nameEn.includes(q)) {
        score += 100;
    }

    // 5) كلما بكّر موقع التطابق داخل النص، زادت النقاط (حتى 50 نقطة إضافية)
    const idx = nameEn.indexOf(q) >= 0 ? nameEn.indexOf(q) : nameAr.indexOf(qAr);
    if (idx >= 0) {
        score += Math.max(0, 50 - idx * 5);
    }

    // 6) تقارب الطول: تفضيل الأسماء الأقرب لطول الاستعلام
    const lengthDiff = Math.abs(nameEn.length - q.length);
    score += Math.max(0, 20 - lengthDiff);

    // 7) الشعبية (عدد السكان) كعامل ترجيح ثانوي فقط، بمقياس لوغاريتمي
    //    كي لا تطغى المدن الكبرى على التطابقات الأدق
    if (city.population) {
        score += Math.log10(Number(city.population) + 1) * 2;
    }

    return score;
}

/**
 * ترتيب المدن حسب الصلة بالاستعلام. بلا استعلام: نعود للترتيب الأبجدي
 */
function sortCitiesByRelevance(cities, query) {
    if (!query || !query.trim()) {
        return sortCitiesAlphabetically(cities);
    }

    return [...cities]
        .map(city => ({ city, score: calculateRelevanceScore(city, query) }))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // عند تساوي النقاط تمامًا: أبجديًا كحسم نهائي للثبات (stable UX)
            return (a.city.city || "").localeCompare(b.city.city || "");
        })
        .map(item => item.city);
}

/**
 * فرز خيارات قائمة اختيار الدولة (countrySelect) أبجديًا حسب اسم الدولة الظاهر،
 * مع إبقاء أول خيار (عادة "-- اختر دولة --" الفارغ) في مكانه بلا تغيير.
 */
function sortCountryDropdown() {
    const options = Array.from(countrySelect.options);
    if (options.length <= 2) return; // لا داعي للفرز إن كان هناك خيار واحد أو خياران فقط

    const placeholder = options[0];      // الخيار الأول (عادة الفارغ/الافتراضي) يبقى ثابتًا في القمة
    const countryOptions = options.slice(1);

    countryOptions.sort((a, b) => a.text.localeCompare(b.text, 'ar'));

    const selectedValue = countrySelect.value; // حفظ القيمة المختارة حاليًا كي لا تُفقد بعد إعادة الترتيب

    countrySelect.innerHTML = '';
    countrySelect.appendChild(placeholder);
    countryOptions.forEach(opt => countrySelect.appendChild(opt));

    countrySelect.value = selectedValue;
}

// تنفيذ الفرز فور تحميل الملف (في حال كانت القائمة قد مُلئت بالفعل)
sortCountryDropdown();

// نقطة أمان: قد تُملأ قائمة الدول لاحقًا (بعد جلبها من الشبكة من ملف آخر)،
// فمجرد الفرز مرة واحدة عند تحميل هذا السكربت قد لا يكفي.
// لذا نُعيد الفرز أيضًا عند اكتمال تحميل الصفحة بالكامل...
window.addEventListener('load', sortCountryDropdown);

// ...وعند أي محاولة فتح للقائمة (نقرة أو تركيز عبر لوحة المفاتيح)،
// كي تظهر مفروزة دائمًا مهما كان توقيت امتلائها بالخيارات
countrySelect.addEventListener('mousedown', sortCountryDropdown);
countrySelect.addEventListener('focus', sortCountryDropdown);

/**
 * عرض دفعة من نتائج المدن المحلية (بحث نصي / تصفح دولة / تصفح عالمي)
 * تُخزّن القائمة الكاملة المفروزة، وتُعرض منها أول "دفعة" فقط،
 * مع إظهار/إخفاء زر "عرض المزيد" حسب وجود نتائج متبقية.
 * استبدلت كل نداءات renderResults({cities: X.slice(0, MAX_LOCAL_RESULTS)}) القديمة.
 */
function renderLocalCityResults(sortedCities) {
    currentFullResults = sortedCities;
    currentDisplayLimit = RESULTS_PAGE_SIZE;

    const visible = currentFullResults.slice(0, currentDisplayLimit);
    renderResults({ cities: visible, countries: [] });
    updateShowMoreButton();
}

/**
 * عرض دفعة إضافية من نفس القائمة المخزّنة (بدون إعادة فرز، فهي مفروزة مسبقًا)
 */
function showMoreLocalResults() {
    currentDisplayLimit += RESULTS_PAGE_SIZE;
    const visible = currentFullResults.slice(0, currentDisplayLimit);
    renderResults({ cities: visible, countries: [] });
    updateShowMoreButton();

    // إبقاء الزر ضمن مجال الرؤية بدل قفز الصفحة لأعلى بعد إعادة الرسم
    if (showMoreBtn) {
        showMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * إنشاء/تحديث/إخفاء زر "عرض المزيد" أسفل النتائج حسب عدد النتائج المتبقية
 */
function updateShowMoreButton() {
    const remaining = currentFullResults.length - currentDisplayLimit;

    if (remaining <= 0) {
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }

    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.id = 'showMoreResultsBtn';
        showMoreBtn.type = 'button';
        showMoreBtn.style.cssText = `
            display:block; width:100%; margin:15px 0; padding:12px 20px;
            border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc;
            color:#334155; font-size:14px; cursor:pointer; transition:background 0.2s;
        `;
        showMoreBtn.onmouseover = () => showMoreBtn.style.background = '#eef2f7';
        showMoreBtn.onmouseout = () => showMoreBtn.style.background = '#f8fafc';
        showMoreBtn.addEventListener('click', showMoreLocalResults);
        resultsDiv.insertAdjacentElement('afterend', showMoreBtn);
    }

    const nextBatch = Math.min(remaining, RESULTS_PAGE_SIZE);
    showMoreBtn.textContent = `⬇️ عرض المزيد (${nextBatch} من أصل ${remaining} نتيجة متبقية)`;
    showMoreBtn.style.display = 'block';
}

/**
 * إنشاء عنصر اقتراح واحد
 * (لا نستخدم onclick بسلسلة نصية مهرّبة يدوياً؛ نستخدم data-attribute + تفويض حدث
 *  في showSuggestions لتفادي أي كسر أو ثغرة عند وجود رموز خاصة في اسم المدينة)
 */
function createSuggestionItem(city) {
    const cityName = city.city || "";
    const cityAr = city.city_ar ? `(${escapeHtml(city.city_ar)})` : "";
    const country = city.country ? `- ${escapeHtml(city.country)}` : "";
    const population = city.population ? `👥 ${Number(city.population).toLocaleString()}` : "";

    return `
        <div class="suggestion" data-city="${escapeHtml(cityName)}"
             style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;transition:background 0.2s;"
             onmouseover="this.style.background='#f1f5f9'"
             onmouseout="this.style.background='white'">
            🏙️ ${escapeHtml(cityName)} ${cityAr} ${country} ${population}
        </div>
    `;
}

/**
 * تنفيذ البحث المحلي وعرض الاقتراحات
 * (مُرتّبة الآن بالصلة بدل ترتيب filter العشوائي، فأقرب النتائج لما يكتبه المستخدم تظهر أولاً)
 */
function performLocalSearch(query) {
    const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
    const lowerQuery = query.toLowerCase();
    const arabicQuery = normalizeText(query);

    const filtered = source.filter(c => {
        // ✅ استخدام _searchKey المحسوب مسبقاً إن وُجد بدل إعادة حسابه في كل اقتراح
        const searchText = c._searchKey || buildSearchableText(c);
        return searchText.includes(arabicQuery) ||
               (c.city || "").toLowerCase().includes(lowerQuery) ||
               (c.city_ar || "").includes(arabicQuery);
    });

    return sortCitiesByRelevance(filtered, query).slice(0, MAX_SUGGESTIONS);
}

/**
 * عرض الاقتراحات في القائمة المنسدلة
 * (تفويض النقر مرة واحدة بدل onclick مضمّن في كل عنصر)
 */
function showSuggestions(results) {
    if (results.length > 0) {
        suggestionsDiv.innerHTML = results.map(createSuggestionItem).join('');
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
}

// تفويض حدث النقر على الاقتراحات (يُسجَّل مرة واحدة فقط)
suggestionsDiv.addEventListener('click', function(e) {
    const item = e.target.closest('.suggestion');
    if (item && item.dataset.city) {
        selectCity(item.dataset.city);
    }
});

/**
 * تنفيذ البحث الموسع
 */
async function executeSearch(query) {
    clearTimeout(searchTimeout);

    if (query.length >= 2) {
        searchTimeout = setTimeout(async () => {
            try {
                updateStatus('⏳ جاري البحث...', '#64748b');
                const results = await performSearch(query);
                renderResults(results);
            } catch (error) {
                console.error('خطأ في البحث:', error);
                updateStatus('❌ حدث خطأ أثناء البحث', '#ef4444');
                showToast('❌ حدث خطأ أثناء البحث');
            }
        }, SEARCH_DEBOUNCE_MS);
    } else if (query.length === 0) {
        // بلا نص بحث: الترتيب الأبجدي هو الأنسب لتصفح القائمة كاملة، مع زر عرض المزيد
        const source = currentCountryCities.length > 0 ? currentCountryCities : allCities;
        const sortedCities = sortCitiesAlphabetically(source);
        renderLocalCityResults(sortedCities);
        suggestionsDiv.style.display = 'none';
    }
}

/**
 * البحث في ويكيبيديا (دالة مشتركة)
 */
async function searchWikipediaWithConfig(limit, message, extendedMessage) {
    const query = searchInput.value.trim();

    if (!query) {
        showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');
        return;
    }

    updateStatus(message, '#f59e0b');
    wikipediaPage = 0;

    try {
        const results = await searchWikipedia(query, limit);

        if (results.length > 0) {
            resultsDiv.innerHTML = '';
            allLinksData = [];
            renderWikipediaResults(results, query);
            const finalMessage = extendedMessage || `📖 تم العثور على ${results.length} نتيجة في ويكيبيديا`;
            updateStatus(finalMessage, '#10b981');
            countSpan.textContent = results.length;
            showToast(`✅ تم العثور على ${results.length} نتيجة في ويكيبيديا`);
        } else {
            updateStatus("❌ لم يتم العثور على نتائج في ويكيبيديا", '#ef4444');
            showToast('❌ لم يتم العثور على نتائج في ويكيبيديا');
        }
    } catch (error) {
        console.error('خطأ في البحث بويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء البحث في ويكيبيديا', '#ef4444');
        showToast('❌ حدث خطأ أثناء البحث');
    }
}

// ============================================================
// 2. أحداث البحث
// ============================================================

// البحث عند الكتابة (اقتراحات محلية مرتّبة بالصلة بديباونس خفيف + بحث موسّع بديباونس أطول)
searchInput.addEventListener('input', function() {
    clearTimeout(suggestionsTimeout);
    const query = this.value;

    if (query.length >= 2) {
        suggestionsTimeout = setTimeout(() => {
            const results = performLocalSearch(query);
            showSuggestions(results);
        }, SUGGESTIONS_DEBOUNCE_MS);
        executeSearch(query);
    } else {
        suggestionsDiv.style.display = 'none';
        if (query.length === 0) {
            executeSearch(query);
        }
    }
});

// البحث عند الضغط على Enter
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        suggestionsDiv.style.display = 'none';
        handleSearch();
    }
    if (e.key === 'Escape') {
        suggestionsDiv.style.display = 'none';
        this.blur();
    }
});

// زر البحث
document.getElementById('searchBtn').addEventListener('click', async function() {
    suggestionsDiv.style.display = 'none';
    await handleSearch();
});

// ============================================================
// 3. أزرار التحكم
// ============================================================

// نسخ جميع الروابط
document.getElementById('copyAll').addEventListener('click', function() {
    if (allLinksData.length === 0) {
        showToast('⚠️ لا توجد روابط للنسخ');
        return;
    }

    let text = '🔍 روابط البحث عن المدن والدول\n';
    text += '='.repeat(60) + '\n\n';

    allLinksData.forEach((data, i) => {
        text += `📌 ${i + 1}. ${data.name} (${data.type})\n`;
        text += `   كلمة البحث: ${data.query}\n`;
        data.links.forEach(link => {
            text += `   ${link.id}. ${link.name}: ${link.url}\n`;
        });
        text += '\n';
    });

    const totalLinks = allLinksData.reduce((sum, d) => sum + d.links.length, 0);

    // استخدام Clipboard API الحديث مع fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(`✅ تم نسخ ${totalLinks} رابط`))
            .catch(() => fallbackCopy(text, totalLinks));
    } else {
        fallbackCopy(text, totalLinks);
    }
});

/**
 * دالة بديلة للنسخ (لأنظمة/متصفحات لا تدعم Clipboard API)
 */
function fallbackCopy(text, totalLinks) {
    let textarea = null;
    try {
        textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length); // دعم أفضل على iOS
        const ok = document.execCommand('copy');
        if (!ok) throw new Error('execCommand copy failed');
        showToast(`✅ تم نسخ ${totalLinks} رابط`);
    } catch (error) {
        console.error('فشل النسخ:', error);
        showToast('❌ فشل نسخ الروابط');
    } finally {
        if (textarea) document.body.removeChild(textarea);
    }
}

// فتح جميع الروابط
document.getElementById('openAll').addEventListener('click', function() {
    if (allLinksData.length === 0) {
        showToast('⚠️ لا توجد روابط لفتحها');
        return;
    }

    const allUrls = allLinksData.flatMap(data =>
        data.links.map(link => link.url)
    );

    if (allUrls.length > MAX_AUTO_OPEN_LINKS) {
        if (!confirm(`سيتم فتح ${allUrls.length} رابط. هل أنت متأكد؟`)) {
            return;
        }
    }

    let blocked = 0;
    allUrls.forEach((url, i) => {
        setTimeout(() => {
            try {
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                if (!win) blocked++;
                if (blocked === 1) {
                    showToast('⚠️ يبدو أن المتصفح يمنع النوافذ المنبثقة');
                }
            } catch (error) {
                console.error(`فشل فتح الرابط: ${url}`, error);
            }
        }, i * 150);
    });

    showToast(`🚀 جاري فتح ${allUrls.length} رابط`);
});

// مسح النتائج
document.getElementById('clearResults').addEventListener('click', function() {
    resultsDiv.innerHTML = '';
    countSpan.textContent = '0';
    allLinksData = [];
    currentFullResults = [];
    currentDisplayLimit = RESULTS_PAGE_SIZE;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    searchInput.value = '';
    suggestionsDiv.style.display = 'none';
    searchInput.focus();
    showToast('🗑 تم مسح النتائج');
});

// ============================================================
// 4. تغيير الدولة
// ============================================================
countrySelect.addEventListener('change', async function() {
    const code = this.value;
    searchInput.value = '';
    suggestionsDiv.style.display = 'none';

    if (!code) {
        currentCountryCities = [];
        updateStatus('🌐 بحث عالمي - جميع المدن', '#64748b');

        const sortedCities = sortCitiesAlphabetically(allCities);
        renderLocalCityResults(sortedCities);
        return;
    }

    const countryName = countryMap[code] || code;

    // استخدام الكاش إن وُجد لتفادي إعادة التحميل من الشبكة
    if (countryCitiesCache.has(code)) {
        currentCountryCities = countryCitiesCache.get(code);
        updateStatus(`✅ ${currentCountryCities.length} مدينة في ${countryName}`, '#10b981');
        const sortedCities = sortCitiesAlphabetically(currentCountryCities);
        renderLocalCityResults(sortedCities);
        return;
    }

    updateStatus(`⏳ جاري تحميل مدن ${countryName}...`, '#64748b');

    try {
        const cities = await loadCountryCities(code);
        currentCountryCities = cities;
        countryCitiesCache.set(code, cities);
        updateStatus(`✅ ${cities.length} مدينة في ${countryName}`, '#10b981');

        const sortedCities = sortCitiesAlphabetically(cities);
        renderLocalCityResults(sortedCities);
    } catch (error) {
        console.error('خطأ في تحميل مدن الدولة:', error);
        updateStatus(`❌ فشل تحميل مدن ${countryName}`, '#ef4444');
        showToast('❌ حدث خطأ أثناء تحميل المدن');
    }
});

// ============================================================
// 5. إغلاق الاقتراحات عند النقر خارجها
// ============================================================
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) {
        suggestionsDiv.style.display = 'none';
    }
});

// ============================================================
// 6. وظائف ويكيبيديا
// ============================================================

window.searchOnlyWikipedia = async function() {
    await searchWikipediaWithConfig(
        30,
        "🔍 جاري البحث في ويكيبيديا...",
        null
    );
};

window.searchAllWikipedia = async function() {
    await searchWikipediaWithConfig(
        100,
        "🔍 جاري البحث الموسع في ويكيبيديا...",
        "📖 تم العثور على 100 نتيجة في ويكيبيديا (بحث موسع)"
    );
};

window.loadMoreWikipedia = async function() {
    const query = searchInput.value.trim();

    if (!query) {
        showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');
        return;
    }

    wikipediaPage++;
    const offset = wikipediaPage * CONFIG.WIKIPEDIA_PAGE_SIZE;

    updateStatus(`⏳ جاري تحميل المزيد من نتائج ويكيبيديا (الصفحة ${wikipediaPage + 1})...`, '#f59e0b');

    try {
        const results = await searchWikipedia(query, CONFIG.WIKIPEDIA_PAGE_SIZE, offset);

        if (results.length > 0) {
            renderWikipediaResults(results, query, true);
            updateStatus(`📖 تم تحميل ${results.length} نتيجة إضافية (الصفحة ${wikipediaPage + 1})`, '#10b981');
            showToast(`✅ تم تحميل ${results.length} نتيجة إضافية`);
        } else {
            wikipediaPage--; // تراجع عن الترقيم لأنه لا توجد نتائج جديدة فعلياً
            updateStatus('📖 تم عرض جميع النتائج المتاحة', '#94a3b8');
            showToast('⚠️ لا توجد المزيد من النتائج');
        }
    } catch (error) {
        wikipediaPage--; // تراجع عن الترقيم عند فشل الطلب حتى تُتاح إعادة المحاولة بنفس الصفحة
        console.error('خطأ في تحميل المزيد من نتائج ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء تحميل النتائج', '#ef4444');
        showToast('❌ حدث خطأ أثناء التحميل');
    }
};

console.log('✅ 05-events.js تم تحميله بنجاح (بحث بالصلة + عرض المزيد مفعّلان)');