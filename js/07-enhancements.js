// ============================================================
// 07-enhancements.js - وظائف UX الإضافية
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
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
            return true;
        } catch (error) {
            console.warn('تعذر حفظ المفضلة:', error);
            return false;
        }
    };

    const favoriteKey = (item) => {
        const type = String(item?.type || '').trim().toLowerCase();
        const name = String(item?.name || item?.query || '').trim().toLowerCase();
        const url = String(item?.url || '').trim().toLowerCase();
        return `${type}:${name}:${url}`;
    };

    function notifyFavorite(message) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(message); return; } catch (_) {}
        }
        const old = document.querySelector('.favorite-toast-fallback');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'favorite-toast-fallback';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 18px;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.2);pointer-events:none;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1800);
    }

    function applyTheme(theme) {
        const dark = theme === 'dark';
        document.body.classList.toggle('dark-mode', dark);
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (_) {}
        const button = document.querySelector('.btn-theme');
        if (button) {
            button.textContent = dark ? '☀️' : '🌓';
            button.title = dark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن';
            button.setAttribute('aria-label', button.title);
        }
    }

    window.toggleTheme = () => applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');

    function closeEnhancementModal() {
        document.querySelector('.enhancement-modal')?.remove();
    }

    function openModal(title, content, className = '') {
        closeEnhancementModal();
        const modal = document.createElement('div');
        modal.className = `enhancement-modal ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `<div class="enhancement-modal__backdrop" data-close-modal></div><section class="enhancement-modal__panel" aria-labelledby="enhancement-modal-title"><button class="enhancement-modal__close" type="button" aria-label="إغلاق">×</button><h2 id="enhancement-modal-title">${title}</h2><div class="enhancement-modal__content">${content}</div></section>`;
        document.body.appendChild(modal);
        modal.querySelector('.enhancement-modal__close')?.addEventListener('click', closeEnhancementModal);
        modal.querySelector('[data-close-modal]')?.addEventListener('click', closeEnhancementModal);
        modal.addEventListener('keydown', event => { if (event.key === 'Escape') closeEnhancementModal(); });
        modal.tabIndex = -1;
        modal.focus();
    }

    function getStats() {
        const favorites = readFavorites();
        const links = Array.isArray(allLinksData) ? allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0) : 0;
        return { cities: Array.isArray(allCities) ? allCities.length : 0, countries: Array.isArray(countries) ? countries.length : 0, links, results: Number(document.getElementById('count')?.textContent || 0), favorites: favorites.length };
    }

    function updateSummaryStats() {
        const stats = getStats();
        [['totalCities', stats.cities], ['totalCountries', stats.countries], ['totalLinks', stats.links], ['totalResults', stats.results]].forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = Number(value).toLocaleString('ar-EG');
        });
    }

    window.showStatistics = () => {
        const stats = getStats();
        openModal('📊 إحصائيات البحث', `<div class="enhancement-stats-grid"><div><strong>${stats.cities.toLocaleString('ar-EG')}</strong><span>مدينة محملة</span></div><div><strong>${stats.countries.toLocaleString('ar-EG')}</strong><span>دولة</span></div><div><strong>${stats.results.toLocaleString('ar-EG')}</strong><span>نتيجة ظاهرة</span></div><div><strong>${stats.links.toLocaleString('ar-EG')}</strong><span>رابط متاح</span></div><div><strong>${stats.favorites.toLocaleString('ar-EG')}</strong><span>عنصر مفضل</span></div></div>`, 'statistics-modal');
    };

    function getFavoriteItemFromButton(button) {
        if (!button) return null;
        const card = button.closest('.card');
        if (card) {
            const explicitName = button.dataset.favoriteName || '';
            const explicitQuery = button.dataset.favoriteQuery || '';
            const explicitType = button.dataset.favoriteType || '';
            const explicitUrl = button.dataset.favoriteUrl || '';
            const wikiLink = card.querySelector('a.btn-wiki[href*="wikipedia.org"], a[href*="wikipedia.org"]');
            const titleElement = card.querySelector('.wiki-title, .wikipedia-title, [data-wiki-title], h3, h4, .card-title, .title, .city-name');
            const cityElement = card.querySelector('.city-name');
            const countryElement = card.querySelector('.country-name');

            let name = explicitName || titleElement?.textContent?.trim() || cityElement?.textContent?.trim() || '';
            let query = explicitQuery || name;
            let type = explicitType;
            if (!type) {
                if (wikiLink) type = 'ويكيبيديا';
                else if (countryElement && !cityElement) type = 'دولة';
                else if (card.classList.contains('text-query-card')) type = 'بحث نصي';
                else type = 'مدينة';
            }
            const url = explicitUrl || wikiLink?.href || '';

            if (!name && wikiLink) {
                name = wikiLink.textContent.trim() || wikiLink.getAttribute('title') || '';
                query = name;
            }
            if (!name && !query && !url) return null;

            const item = { name: name || query || url, query: query || name || url, type, url };

            // نحفظ بيانات البطاقة نفسها حتى تظهر المفضلة لاحقًا بنفس العنصر،
            // بدل البحث عن اسم مشابه داخل قاعدة المدن مرة أخرى.
            if (type === 'مدينة') {
                const countryText = countryElement?.textContent?.trim() || '';
                const populationText = card.querySelector('[style*="font-size:13px"]')?.textContent?.replace(/[^0-9]/g, '') || '';
                item.city = cityElement?.textContent?.trim() || name;
                item.city_ar = '';
                item.country = countryText;
                item.country_ar = '';
                if (populationText) item.population = populationText;
            } else if (type === 'دولة') {
                item.country = name;
                item.country_ar = countryElement?.textContent?.trim() || '';
                const capitalText = card.textContent?.match(/العاصمة:\s*([^\n]+)/)?.[1]?.trim();
                if (capitalText) item.capital = capitalText;
            } else if (type === 'ويكيبيديا') {
                item.snippet = card.querySelector('p')?.textContent?.trim() || '';
                const dateText = [...card.querySelectorAll('span')].map(el => el.textContent?.trim()).find(text => text?.startsWith('📅'));
                if (dateText) item.timestamp = dateText.replace(/^📅\s*/, '');
            }
            return item;
        }

        const index = Number(button.dataset.favoriteIndex);
        if (Number.isInteger(index) && index >= 0 && Array.isArray(allLinksData) && allLinksData[index]) return allLinksData[index];
        return null;
    }

    function updateFavoriteButtons() {
        const keys = new Set(readFavorites().map(favoriteKey));
        document.querySelectorAll('.favorite-toggle').forEach(button => {
            const item = getFavoriteItemFromButton(button);
            if (!item) return;
            const active = keys.has(favoriteKey(item));
            const nextText = active ? '★ محفوظة' : '☆ مفضلة';
            const nextBackground = active ? '#fef3c7' : '#f1f5f9';
            const nextColor = active ? '#92400e' : '#334155';
            const nextWeight = active ? '700' : '400';
            button.classList.toggle('is-favorite', active);
            if (button.textContent !== nextText) button.textContent = nextText;
            button.setAttribute('aria-pressed', String(active));
            const nextLabel = active ? `إزالة ${item.name || item.query || ''} من المفضلة` : `إضافة ${item.name || item.query || ''} إلى المفضلة`;
            if (button.getAttribute('aria-label') !== nextLabel) button.setAttribute('aria-label', nextLabel);
            if (button.style.background !== nextBackground) button.style.background = nextBackground;
            if (button.style.color !== nextColor) button.style.color = nextColor;
            if (button.style.fontWeight !== nextWeight) button.style.fontWeight = nextWeight;
        });
    }

    window.updateFavoriteButtons = updateFavoriteButtons;

    function doToggleFavorite(target) {
        const button = target && typeof target === 'object' ? target : null;
        const item = button ? getFavoriteItemFromButton(button) : (Array.isArray(allLinksData) ? allLinksData[Number(target)] : null);
        if (!item) return false;

        const favorites = readFavorites();
        const key = favoriteKey(item);
        const existing = favorites.findIndex(favorite => favoriteKey(favorite) === key);
        if (existing >= 0) {
            favorites.splice(existing, 1);
            if (!writeFavorites(favorites)) return false;
            notifyFavorite('تمت إزالة العنصر من المفضلة');
        } else {
            favorites.push({
                ...item,
                query: item.query || item.name || '',
                name: item.name || item.query || '',
                type: item.type || 'مدينة'
            });
            if (!writeFavorites(favorites)) return false;
            notifyFavorite('⭐ تمت إضافة العنصر إلى المفضلة');
        }
        updateFavoriteButtons();
        updateSummaryStats();
        return true;
    }

    window.toggleFavorite = index => doToggleFavorite(index);

    document.addEventListener('click', event => {
        const button = event.target.closest?.('.favorite-toggle');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        doToggleFavorite(button);
    }, true);

    window.showFavorites = function showFavorites() {
        closeEnhancementModal();
        const favorites = readFavorites();

        resultsDiv.innerHTML = '';
        allLinksData = [];

        if (!favorites.length) {
            resultsDiv.innerHTML = '<div class="card no-results"><div style="text-align:center;padding:40px;"><div style="font-size:48px;">⭐</div><h3>لا توجد عناصر مفضلة</h3><p style="color:#94a3b8;margin-top:8px;">استخدم زر المفضلة داخل أي نتيجة لحفظها هنا.</p></div></div>';
            countSpan.textContent = '0';
            updateStatus('⭐ لا توجد عناصر محفوظة في المفضلة', '#f59e0b');
            return;
        }

        // لا نعيد البحث في allCities ولا في ويكيبيديا.
        // المفضلة تعرض فقط البيانات التي تم حفظها عند الضغط على زر ⭐.
        const favoriteCities = favorites.filter(item => ['مدينة', 'city'].includes(item.type) || !item.type).map(item => ({
            city: item.city || item.name || item.query || '',
            city_ar: item.city_ar || '',
            country: item.country || '',
            country_ar: item.country_ar || '',
            population: item.population || ''
        }));

        const favoriteCountries = favorites.filter(item => ['دولة', 'country'].includes(item.type)).map(item => ({
            name: item.name || item.country || item.query || '',
            name_ar: item.country_ar || '',
            capital: item.capital || ''
        }));

        const favoriteWiki = favorites.filter(item => ['ويكيبيديا', 'wikipedia'].includes(item.type)).map(item => ({
            title: item.name || item.query || '',
            snippet: item.snippet || '',
            url: item.url || '',
            wordcount: item.wordcount || '',
            timestamp: item.timestamp || ''
        }));

        const favoriteText = favorites.filter(item => item.type === 'بحث نصي');
        const renderedCount = favoriteCities.length + favoriteCountries.length + favoriteWiki.length + favoriteText.length;

        // نستخدم نفس قوالب النتائج للمدن والدول، لكن بالبيانات المحفوظة فقط.
        if (favoriteCities.length || favoriteCountries.length) {
            renderResults({ cities: favoriteCities, countries: favoriteCountries });
        }

        if (favoriteWiki.length && typeof renderWikipediaResults === 'function') {
            renderWikipediaResults(favoriteWiki, '', true);
        }

        if (favoriteText.length && typeof prependTextQueryCard === 'function') {
            favoriteText.forEach(item => prependTextQueryCard(item.query || item.name || ''));
        }

        countSpan.textContent = String(renderedCount);
        updateStatus(`⭐ تم عرض ${renderedCount} عنصر محفوظ فقط`, '#f59e0b');
        updateFavoriteButtons();
    };

    function setupSearchUX() {
        if (!searchInput) return;
        document.addEventListener('keydown', event => {
            const target = event.target;
            const isTypingField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
            if (event.key === '/' && !isTypingField && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault(); searchInput.focus(); searchInput.select();
            }
            if (event.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.value = '';
                if (suggestionsDiv) suggestionsDiv.innerHTML = '';
                if (typeof renderLocalCityResults === 'function' && allCities.length) renderLocalCityResults(allCities);
                updateStatus('⌨️ تم مسح البحث', '#64748b');
            }
        });
        searchInput.addEventListener('focus', () => searchInput.setAttribute('aria-label', 'بحث عن مدينة أو دولة أو نص'));
    }

    try { applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'); } catch (_) {}
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupSearchUX, { once: true });
    else setupSearchUX();
})();
