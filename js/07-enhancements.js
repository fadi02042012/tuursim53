// ============================================================
// 07-enhancements.js - وظائف UX الإضافية
// دعم المفضلة لجميع أنواع البطاقات: المدن والدول والنص وويكيبيديا.
// ============================================================

(() => {
    const FAVORITES_KEY = 'tourist-smart-search-favorites-v1';
    const THEME_KEY = 'tourist-smart-search-theme-v1';

    const readFavorites = () => {
        try {
            const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.warn('تعذر قراءة المفضلة:', error);
            return [];
        }
    };

    const writeFavorites = (items) => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    };

    const favoriteKey = (item) => `${item.type || ''}:${item.query || item.name || ''}`;

    function applyTheme(theme) {
        const dark = theme === 'dark';
        document.body.classList.toggle('dark-mode', dark);
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        const button = document.querySelector('.btn-theme');
        if (button) {
            button.textContent = dark ? '☀️' : '🌓';
            button.title = dark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن';
            button.setAttribute('aria-label', button.title);
        }
    }

    window.toggleTheme = function toggleTheme() {
        applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
    };

    function closeEnhancementModal() {
        const modal = document.querySelector('.enhancement-modal');
        if (modal) modal.remove();
    }

    function openModal(title, content, className = '') {
        closeEnhancementModal();
        const modal = document.createElement('div');
        modal.className = `enhancement-modal ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="enhancement-modal__backdrop" data-close-modal></div>
            <section class="enhancement-modal__panel" aria-labelledby="enhancement-modal-title">
                <button class="enhancement-modal__close" type="button" aria-label="إغلاق">×</button>
                <h2 id="enhancement-modal-title">${title}</h2>
                <div class="enhancement-modal__content">${content}</div>
            </section>`;
        document.body.appendChild(modal);
        modal.querySelector('.enhancement-modal__close').addEventListener('click', closeEnhancementModal);
        modal.querySelector('[data-close-modal]').addEventListener('click', closeEnhancementModal);
        modal.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeEnhancementModal();
        });
        modal.tabIndex = -1;
        modal.focus();
    }

    function getStats() {
        const favorites = readFavorites();
        const links = Array.isArray(allLinksData)
            ? allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0)
            : 0;
        return {
            cities: Array.isArray(allCities) ? allCities.length : 0,
            countries: Array.isArray(countries) ? countries.length : 0,
            links,
            results: Number(document.getElementById('count')?.textContent || 0),
            favorites: favorites.length
        };
    }

    function updateSummaryStats() {
        const stats = getStats();
        const values = {
            totalCities: stats.cities,
            totalCountries: stats.countries,
            totalLinks: stats.links,
            totalResults: stats.results
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = Number(value).toLocaleString('ar-EG');
        });
    }

    window.showStatistics = function showStatistics() {
        const stats = getStats();
        openModal('📊 إحصائيات البحث', `
            <div class="enhancement-stats-grid">
                <div><strong>${stats.cities.toLocaleString('ar-EG')}</strong><span>مدينة محملة</span></div>
                <div><strong>${stats.countries.toLocaleString('ar-EG')}</strong><span>دولة</span></div>
                <div><strong>${stats.results.toLocaleString('ar-EG')}</strong><span>نتيجة ظاهرة</span></div>
                <div><strong>${stats.links.toLocaleString('ar-EG')}</strong><span>رابط متاح</span></div>
                <div><strong>${stats.favorites.toLocaleString('ar-EG')}</strong><span>عنصر مفضل</span></div>
            </div>`, 'statistics-modal');
    };

    function renderFavoriteItem(item, index) {
        const query = encodeURIComponent(item.query || item.name || '');
        return `<article class="favorite-item">
            <div><strong>${escapeHtml(item.name || item.query || 'نتيجة')}</strong><small>${escapeHtml(item.type || '')}</small></div>
            <div class="favorite-item__actions">
                <a href="https://www.google.com/search?q=${query}" target="_blank" rel="noopener noreferrer">🔎 جوجل</a>
                <a href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener noreferrer">▶ يوتيوب</a>
                <button type="button" data-remove-favorite="${index}">حذف</button>
            </div>
        </article>`;
    }

    function restoreNonDatabaseFavorite(item) {
        const query = item.query || item.name || '';
        if (!query) return;

        if (item.type === 'بحث نصي' || item.type === 'text' || item.type === 'نص') {
            if (typeof prependTextQueryCard === 'function') {
                prependTextQueryCard(query);
            }
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

    window.showFavorites = async function showFavorites() {
        closeEnhancementModal();
        const favorites = readFavorites();

        if (!favorites.length) {
            resultsDiv.innerHTML = `
                <div class="card no-results favorites-empty-results">
                    <div style="text-align:center;padding:40px;">
                        <div style="font-size:48px;margin-bottom:16px;">⭐</div>
                        <h3>لا توجد عناصر مفضلة</h3>
                        <p style="color:#94a3b8;margin-top:8px;">استخدم زر «☆ مفضلة» داخل أي نتيجة لحفظها هنا.</p>
                    </div>
                </div>`;
            if (countSpan) countSpan.textContent = '0';
            updateStatus('⭐ لا توجد عناصر محفوظة في المفضلة', '#f59e0b');
            return;
        }

        // استعادة المدن والدول من قاعدة البيانات، كما في السابق.
        const favoriteCities = favorites
            .filter(item => item.type === 'مدينة' || item.type === 'city' || !item.type)
            .map(item => {
                const name = item.name || item.query || '';
                return (allCities || []).find(city =>
                    String(city.city || '').toLowerCase() === String(name).toLowerCase()
                ) || { city: name, city_ar: '', country: '', country_ar: '' };
            });

        const favoriteCountries = favorites
            .filter(item => item.type === 'دولة' || item.type === 'country')
            .map(item => {
                const name = item.name || item.query || '';
                return (countries || []).find(country =>
                    String(country.name || '').toLowerCase() === String(name).toLowerCase()
                ) || { name, name_ar: '' };
            });

        // renderResults يعيد بناء allLinksData للمدن والدول أولاً.
        renderResults({ cities: favoriteCities, countries: favoriteCountries });

        // استعادة بطاقة البحث النصية ونتائج ويكيبيديا أيضًا.
        // يتم ذلك بعد renderResults حتى تبقى أرقام favorite-index صحيحة.
        favorites
            .filter(item => !['مدينة', 'city', 'دولة', 'country'].includes(item.type))
            .forEach(restoreNonDatabaseFavorite);

        if (countSpan) countSpan.textContent = String(favorites.length);
        updateStatus(`⭐ تم عرض ${favorites.length} من المفضلة`, '#f59e0b');
    };

    function updateFavoriteButtons() {
        const keys = new Set(readFavorites().map(favoriteKey));
        document.querySelectorAll('.favorite-toggle').forEach(button => {
            const item = allLinksData?.[Number(button.dataset.favoriteIndex)];
            const active = item && keys.has(favoriteKey(item));
            button.classList.toggle('is-favorite', Boolean(active));
            const nextLabel = active ? '★ محفوظة' : '☆ مفضلة';
            if (button.textContent !== nextLabel) button.textContent = nextLabel;
            button.setAttribute('aria-pressed', String(Boolean(active)));
        });
    }

    window.toggleFavorite = function toggleFavorite(index) {
        const item = allLinksData?.[Number(index)];
        if (!item) return;

        const favorites = readFavorites();
        const existing = favorites.findIndex(favorite => favoriteKey(favorite) === favoriteKey(item));
        if (existing >= 0) {
            favorites.splice(existing, 1);
            showToast('تمت إزالة العنصر من المفضلة');
        } else {
            favorites.push({ query: item.query, name: item.name, type: item.type });
            showToast('⭐ تمت إضافة العنصر إلى المفضلة');
        }
        writeFavorites(favorites);
        updateFavoriteButtons();
        updateSummaryStats();
    };

    const observer = new MutationObserver(() => {
        updateSummaryStats();
        updateFavoriteButtons();
    });
    observer.observe(document.getElementById('results'), { childList: true, subtree: true });

    applyTheme(localStorage.getItem(THEME_KEY) || 'light');
    window.addEventListener('load', () => {
        updateSummaryStats();
        updateFavoriteButtons();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeEnhancementModal();
    });
})();
