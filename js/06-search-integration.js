// 06-search-integration.js - ربط البحث النصي بالبحث المتقدم وويكيبيديا
(() => {
    const originalHandleSearch = window.handleSearch;
    const originalPrependTextQueryCard = window.prependTextQueryCard;

    function addAdvancedButtonToTextCard(query) {
        const card = document.querySelector('#results .text-query-card');
        if (!card || card.querySelector('.text-query-advanced-link')) return;
        const links = card.querySelector('.btn-group');
        if (!links) return;

        const advanced = document.createElement('a');
        advanced.className = 'btn btn-secondary advanced-category-link text-query-advanced-link';
        advanced.target = '_blank';
        advanced.rel = 'noopener noreferrer';
        advanced.dataset.query = query;
        advanced.href = typeof generateAdvancedLink === 'function'
            ? generateAdvancedLink(query, Number(window.selectedAdvancedCategory || 0))
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        advanced.innerHTML = '<span class="advanced-category-link-text">⚡ البحث المتقدم</span>';
        links.insertBefore(advanced, links.querySelector('.btn-favorite') || null);

        if (typeof window.changeAdvancedCategory === 'function' && typeof getCategoryName === 'function') {
            advanced.querySelector('.advanced-category-link-text').textContent = `⚡ ${getCategoryName()}`;
        }
    }

    window.prependTextQueryCard = function(query) {
        const result = originalPrependTextQueryCard ? originalPrependTextQueryCard(query) : undefined;
        addAdvancedButtonToTextCard(String(query || '').trim());
        return result;
    };

    window.handleSearch = async function() {
        const query = typeof searchInput !== 'undefined' && searchInput ? searchInput.value.trim() : '';
        if (!query) {
            return originalHandleSearch ? originalHandleSearch() : undefined;
        }

        const result = originalHandleSearch ? await originalHandleSearch() : undefined;
        addAdvancedButtonToTextCard(query);

        // البحث في ويكيبيديا يكون بعد الدول والمدن حتى مع وجود نتائج محلية.
        const requestKey = query;
        try {
            updateStatus('🔎 جاري البحث النصي ثم ويكيبيديا...', '#f59e0b');
            const wikiResults = await searchWikipediaMultilingual(query, RESULTS_PER_BATCH, 0);
            if (searchInput.value.trim() !== requestKey) return;
            if (wikiResults.length && typeof renderWikipediaResults === 'function') {
                renderWikipediaResults(wikiResults, query, true);
                updateStatus(`✅ النتائج: البحث النصي ← الدول ← المدن ← ويكيبيديا (${wikiResults.length})`, '#10b981');
                const localCount = document.querySelectorAll('#results .card:not(.text-query-card)').length;
                if (typeof countSpan !== 'undefined' && countSpan) countSpan.textContent = String(localCount + 1 + wikiResults.length);
            } else {
                updateStatus('✅ تم تنفيذ البحث النصي وعرض النتائج المتاحة', '#10b981');
            }
        } catch (error) {
            console.warn('تعذر إضافة نتائج ويكيبيديا:', error);
            updateStatus('✅ تم تنفيذ البحث النصي والنتائج المحلية', '#10b981');
        }
        return result;
    };

    // عند تغيير التصنيف، حدّث رابط بطاقة البحث النصي أيضًا.
    const originalChange = window.changeAdvancedCategory;
    if (typeof originalChange === 'function') {
        window.changeAdvancedCategory = function(value) {
            const result = originalChange.call(this, value);
            const card = document.querySelector('#results .text-query-card');
            const link = card?.querySelector('.text-query-advanced-link');
            if (link) {
                const query = link.dataset.query || '';
                link.href = typeof generateAdvancedLink === 'function'
                    ? generateAdvancedLink(query, Number(value) || 0)
                    : link.href;
                const label = link.querySelector('.advanced-category-link-text');
                if (label && typeof getCategoryName === 'function') label.textContent = `⚡ ${getCategoryName(Number(value) || 0)}`;
            }
            return result;
        };
    }

    console.log('✅ تم ربط البحث النصي بالبحث المتقدم وويكيبيديا');
})();
