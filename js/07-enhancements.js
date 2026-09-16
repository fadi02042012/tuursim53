// ============================================================
// 07-enhancements.js - المفضلة بشكل موحد لجميع أنواع النتائج
// ============================================================

(() => {
    const FAVORITES_KEY = 'tourist-smart-search-favorites-v1';
    const THEME_KEY = 'tourist-smart-search-theme-v1';

    function readFavorites() {
        try {
            const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.warn('تعذر قراءة المفضلة:', error);
            return [];
        }
    }

    function writeFavorites(items) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    }

    // نستخدم النوع والنص معاً حتى لا تختلط بطاقة النص بنتيجة ويكيبيديا.
    function favoriteKey(item) {
        return `${String(item?.type || '').trim()}:${String(item?.query || item?.name || '').trim()}`;
    }

    function updateFavoriteButtons() {
        const savedKeys = new Set(readFavorites().map(favoriteKey));

        document.querySelectorAll('#results .favorite-toggle').forEach(button => {
            const index = Number.parseInt(button.dataset.favoriteIndex, 10);
            const item = Number.isInteger(index) ? allLinksData?.[index] : null;
            const active = Boolean(item && savedKeys.has(favoriteKey(item)));

            button.classList.toggle('is-favorite', active);
            button.textContent = active ? '★ محفوظة' : '☆ مفضلة';
            button.setAttribute('aria-pressed', String(active));
        });
    }

    window.toggleFavorite = function toggleFavorite(index) {
        const numericIndex = Number.parseInt(index, 10);
        const item = Number.isInteger(numericIndex) ? allLinksData?.[numericIndex] : null;

        if (!item || !item.type || !(item.query || item.name)) {
            console.warn('تعذر حفظ المفضلة: بيانات البطاقة غير مكتملة', { index, item });
            return;
        }

        const favorites = readFavorites();
        const key = favoriteKey(item);
        const existingIndex = favorites.findIndex(saved => favoriteKey(saved) === key);

        if (existingIndex >= 0) {
            favorites.splice(existingIndex, 1);
            showToast('تمت إزالة العنصر من المفضلة');
        } else {
            favorites.push({
                query: String(item.query || item.name),
                name: String(item.name || item.query),
                type: String(item.type)
            });
            showToast('⭐ تمت إضافة العنصر إلى المفضلة');
        }

        writeFavorites(favorites);
        updateFavoriteButtons();
        if (typeof updateSummaryStats === 'function') updateSummaryStats();
    };

    function restoreFavorite(item) {
        const query = item.query || item.name || '';
        if (!query) return;

        if (item.type === 'مدينة' || item.type === 'city') {
            return;
        }
        if (item.type === 'دولة' || item.type === 'country') {
            return;
        }
        if (item.type === 'بحث نصي' || item.type === 'text' || item.type === 'نص') {
            if (typeof prependTextQueryCard === 'function') prependTextQueryCard(query);
            return;
        }
        if (item.type === 'ويكيبيديا' || item.type === 'wikipedia' || item.type === 'Wiki') {
            if (typeof renderWikipediaResults === 'function') {
                renderWikipediaResults([{
                    title: item.name || query,
                    snippet: '',
                    url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(item.name || query)}`,
                    language: 'ar',
                    wordcount: 0,
                    timestamp: ''
                }], query, true);
            }
        }
    }

    window.showFavorites = function showFavorites() {
        const favorites = readFavorites();

        if (!favorites.length) {
            resultsDiv.innerHTML = `
                <div class="card no-results">
                    <div style="text-align:center;padding:40px;">
                        <div style="font-size:48px;margin-bottom:16px;">⭐</div>
                        <h3>لا توجد عناصر مفضلة</h3>
                        <p style="color:#94a3b8;margin-top:8px;">استخدم زر «☆ مفضلة» داخل أي نتيجة لحفظها هنا.</p>
                    </div>
                </div>`;
            countSpan.textContent = '0';
            if (typeof updateStatus === 'function') updateStatus('⭐ لا توجد عناصر محفوظة في المفضلة', '#f59e0b');
            return;
        }

        const favoriteCities = favorites
            .filter(item => item.type === 'مدينة' || item.type === 'city')
            .map(item => {
                const name = item.name || item.query || '';
                return (allCities || []).find(city =>
                    String(city.city || '').toLowerCase() === name.toLowerCase()
                ) || { city: name, city_ar: '', country: '', country_ar: '' };
            });

        const favoriteCountries = favorites
            .filter(item => item.type === 'دولة' || item.type === 'country')
            .map(item => {
                const name = item.name || item.query || '';
                return (countries || []).find(country =>
                    String(country.name || '').toLowerCase() === name.toLowerCase()
                ) || { name, name_ar: '' };
            });

        // يبدأ هذا الاستدعاء allLinksData من الصفر للمدن والدول.
        renderResults({ cities: favoriteCities, countries: favoriteCountries });

        // ثم نضيف النص وويكيبيديا، وكل دالة تضيف بياناتها إلى allLinksData قبل إنشاء البطاقة.
        favorites
            .filter(item => !['مدينة', 'city', 'دولة', 'country'].includes(item.type))
            .forEach(restoreFavorite);

        countSpan.textContent = String(favorites.length);
        if (typeof updateStatus === 'function') updateStatus(`⭐ تم عرض ${favorites.length} من المفضلة`, '#f59e0b');
        updateFavoriteButtons();
    };

    function updateSummaryStats() {
        const element = document.getElementById('totalResults');
        if (element && typeof countSpan !== 'undefined') element.textContent = countSpan.textContent;
    }

    window.toggleTheme = function toggleTheme() {
        const dark = !document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', dark);
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    };

    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        const observer = new MutationObserver(() => {
            updateFavoriteButtons();
            updateSummaryStats();
        });
        observer.observe(resultsElement, { childList: true, subtree: true });
    }

    window.addEventListener('load', updateFavoriteButtons);
    updateFavoriteButtons();
})();
