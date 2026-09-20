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
            // لا نحجب استجابة Enter أثناء تحميل قاعدة المدن الكبيرة.
            // بطاقة البحث النصي تظهر فوراً، ثم نتحقق من المدن في الخلفية.
            if (!resultsDiv.querySelector('.text-query-card')) {
                prependTextQueryCard(query);
            }
            updateStatus('🔎 تم تنفيذ البحث — جاري التحقق من المدن...', '#f59e0b');

            loadGlobalCities()
                .then(() => {
                    if (String(searchInput?.value || '').trim() !== query) return;
                    const latest = performSearch(query);
                    if (latest.cities.length || latest.countries.length) {
                        renderResults(latest);
                        prependTextQueryCard(query);
                        countSpan.textContent = String(latest.cities.length + latest.countries.length + 1);
                        updateStatus('✅ ظهرت النتائج المحلية.', '#10b981');
                    } else {
                        if (!resultsDiv.querySelector('.text-query-card')) prependTextQueryCard(query);
                        countSpan.textContent = '1';
                        updateStatus('ℹ️ لا توجد نتائج محلية لهذه الكلمة.', '#64748b');
                    }
                })
                .catch(error => {
                    console.warn('تعذر تحميل قاعدة المدن:', error);
                    if (!resultsDiv.querySelector('.text-query-card')) prependTextQueryCard(query);
                    countSpan.textContent = '1';
                    updateStatus('ℹ️ بطاقة البحث النصي جاهزة؛ تعذر تحميل المدن.', '#64748b');
                });

            if (typeof loadWikipediaForCurrentSearch === 'function') {
                loadWikipediaForCurrentSearch(query, lastSearchRequestId)
                    .catch(error => console.warn('Wikipedia background search:', error));
            }
            return;
        }

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