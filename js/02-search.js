    if (advancedPanel) {
        advancedPanel.insertAdjacentHTML('afterend', card);
    } else {
        resultsDiv.insertAdjacentHTML('afterbegin', card);
    }
}
// مسار احتياطي إذا استُخدمت هذه الدالة مباشرة من ملفات أخرى.
async function handleSearch() {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (!query) {
        // الضغط على زر "بحث" بدون نص يجب ألا يعيد ترتيب مدن الدولة
        // إلى ترتيب الملف الخام. حافظ على الترتيب المطلوب: العاصمة،
        // المدن الأشهر، الأكبر سكاناً، ثم A-Z.
        const source = currentCountryCities.length
            ? (typeof sortCitiesForCountry === 'function'
                ? sortCitiesForCountry(currentCountryCities, countrySelect?.value || '')
                : currentCountryCities.slice())
            : (typeof sortCitiesAlphabetically === 'function'
                ? sortCitiesAlphabetically(allCities)
                : allCities.slice());

        if (currentCountryCities.length) {
            currentFullResults = source;
            currentDisplayLimit = Math.min(RESULTS_PER_BATCH, source.length);
            renderResults({ cities: source.slice(0, currentDisplayLimit), countries: [] });
            if (typeof updateShowMoreButton === 'function') updateShowMoreButton();
            if (typeof window.refreshResultsPagination === 'function') {
                window.refreshResultsPagination();
            }
        } else if (source.length) {
            renderResults({ cities: source.slice(0, RESULTS_PER_BATCH), countries: [] });
        } else {
            renderResults({ cities: [], countries: countries.slice(0, RESULTS_PER_BATCH) });
        }
        return;
    }

    allLinksData = [];
    prependTextQueryCard(query);
    countSpan.textContent = '1';
    updateStatus('🔎 جاري تجهيز البيانات المحلية...', '#f59e0b');

    try {
        // عند اختيار دولة، يجب أن يعمل البحث داخل مدن الدولة فقط.
        // لا نستخدم قاعدة المدن العالمية كبديل قبل اكتمال تحميل ملف الدولة.
        const selectedCountryCode = typeof countrySelect !== 'undefined'
            ? String(countrySelect?.value || '').trim()
            : '';

        if (selectedCountryCode) {
            // إذا ضغط المستخدم Enter أثناء تحميل الدولة، يجب حفظ نتيجة التحميل
            // في currentCountryCities فوراً. عدم فعل ذلك كان يجعل أول Enter
            // ينتهي قبل أن يرى البحث مدن الدولة، ثم يعمل فقط عند Enter ثانٍ.
            if (!currentCountryCities.length || String(countrySelect?.value || '').trim() !== selectedCountryCode) {
                const loadedCities = await loadCountryCities(selectedCountryCode);
                currentCountryCities = Array.isArray(loadedCities) ? loadedCities : [];
                if (typeof countryCitiesCache !== 'undefined' && countryCitiesCache instanceof Map) {
                    countryCitiesCache.set(selectedCountryCode, currentCountryCities);
                }
            }
        } else if (!currentCountryCities.length && !allCities.length) {
            // البحث العالمي يحتاج قاعدة المدن عند عدم اختيار دولة.
            // اعرض بطاقة الاستعلام قبل انتظار ملف المدن الكبير حتى يرى المستخدم
            // نتيجة الضغط الأولى فوراً، ثم حدّثها بعد اكتمال التحميل.
            await loadGlobalCities();
        }

        // loadGlobalCities/loadCountryCities قد يعيدان رسم النتائج أثناء التحميل
        // ويمسحان بطاقة البحث التي أُنشئت في بداية Enter. أعدها هنا قبل
        // حساب النتائج حتى لا يبدو للمستخدم أن أول Enter لم يعمل.
        if (!resultsDiv.querySelector('.text-query-card')) {
            prependTextQueryCard(query);
        }

        const results = performSearch(query);
        if (results.cities.length || results.countries.length) {
            renderResults(results);
            prependTextQueryCard(query);
            countSpan.textContent = String(results.cities.length + results.countries.length + 1);
            updateStatus('✅ النتائج المحلية ظهرت؛ ويكيبيديا تعمل في الخلفية.', '#10b981');
        }

        if (typeof loadWikipediaForCurrentSearch === 'function') {
            loadWikipediaForCurrentSearch(query, lastSearchRequestId)
                .catch(error => console.warn('Wikipedia background search:', error));
        }
    } catch (error) {
        console.error('خطأ في البحث المحلي:', error);
        updateStatus('⚠️ ظهرت بطاقة البحث، وتعذر إكمال النتائج المحلية.', '#ef4444');
    }
}

console.log('✅ 02-search.js تم تحميله بنجاح — البحث المحلي فوري وبدون انتظار خارجي');