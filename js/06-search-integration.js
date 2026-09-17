// 06-search-integration.js - مسار البحث الفوري بدون تكرار
(() => {
    window.handleSearch = async function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (!query) {
            const source = currentCountryCities.length ? currentCountryCities : allCities;
            renderResults({ cities: source.slice(0, 10), countries: [] });
            return;
        }

        // البطاقة وروابط البحث الـ48 تظهر فورًا، قبل أي ترجمة أو خدمة خارجية.
        lastSearchRequestId = (Number(lastSearchRequestId) || 0) + 1;
        const requestId = lastSearchRequestId;
        allLinksData = [];
        resultsDiv.innerHTML = '';
        prependTextQueryCard(query);
        countSpan.textContent = '1';
        updateStatus('🔎 بطاقة البحث جاهزة؛ جاري جلب النتائج المحلية...', '#f59e0b');

        try {
            const results = await performSearch(query);
            if (requestId !== lastSearchRequestId || searchInput.value.trim() !== query) return;

            if (results.cities.length || results.countries.length) {
                renderResults(results);
                prependTextQueryCard(query);
                countSpan.textContent = String(results.cities.length + results.countries.length + 1);
                updateStatus('✅ النتائج المحلية ظهرت؛ ويكيبيديا تعمل في الخلفية.', '#10b981');
            }

            // ويكيبيديا لا تمنع البطاقة أو النتائج المحلية من الظهور.
            if (typeof loadWikipediaForCurrentSearch === 'function') {
                loadWikipediaForCurrentSearch(query, requestId).catch(error => console.warn('Wikipedia background search:', error));
            }
        } catch (error) {
            if (requestId !== lastSearchRequestId) return;
            console.error('خطأ في البحث:', error);
            updateStatus('⚠️ ظهرت بطاقة البحث، وتعذر إكمال النتائج المحلية.', '#ef4444');
        }
    };

    console.log('✅ البحث الفوري مفعل — لا انتظار للروابط ولا تكرار لويكيبيديا');
})();
