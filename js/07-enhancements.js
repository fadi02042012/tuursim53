// ============================================================
// 07-enhancements.js - وظائف UX الإضافية
// هذه الطبقة مستقلة عن منطق البحث ومصادر البيانات.
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

    // مفتاح ثابت للمفضلة يمنع اختلاف الحالة بين نتائج البحث النصي وويكيبيديا.
    const favoriteKey = (item) => {
        const type = item?.type || '';
        const name = item?.name || '';
        const query = item?.query || name;
        return `${type}:${String(name).trim().toLowerCase()}:${String(query).trim().toLowerCase()}`;
    };

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
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeEnhancementModal();
        });
        modal.tabIndex = -1;
        modal.focus();
    }

    function getStats() {
        const favorites = readFavorites();
        const links = Array.isArray(allLinksData) ? allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0) : 0;
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

        // نتائج المدن والدول تُعرض بالطريقة المعتادة.
        const favoriteCities = favorites
            .filter(item => item.type === 'مدينة' || item.type === 'city' || !item.type)
            .map(item => {
                const name = item.name || item.query || '';
                return (allCities || []).find(city => String(city.city || '').toLowerCase() === name.toLowerCase())
                    || { city: name, city_ar: '', country: '', country_ar: '' };
            });

        const favoriteCountries = favorites
            .filter(item => item.type === 'دولة' || item.type === 'country')
            .map(item => {
                const name = item.name || item.query || '';
                return (countries || []).find(country => String(country.name || '').toLowerCase() === name.toLowerCase())
                    || { name, name_ar: '' };
            });

        // نتائج ويكيبيديا محفوظة أيضًا؛ نعيد البحث عنها وعرضها في نفس بطاقة ويكيبيديا.
        const favoriteWiki = favorites.filter(item => item.type === 'ويكيبيديا' || item.type === 'wikipedia');

        renderResults({ cities: favoriteCities, countries: favoriteCountries });

        if (favoriteWiki.length > 0) {
            const wikiQueries = favoriteWiki.map(item => item.query || item.name).filter(Boolean);
            try {
                const wikiResults = [];
                for (const wikiQuery of wikiQueries) {
                    const matches = await searchWikipediaMultilingual(wikiQuery, 1);
                    if (matches.length > 0) wikiResults.push(matches[0]);
                }
                if (wikiResults.length > 0) {
                    renderWikipediaResults(wikiResults, wikiResults.map(item => item.title).join(' '), false);
                }
            } catch (error) {
                console.warn('تعذر تحميل بعض مفضلة ويكيبيديا:', error);
            }
        }

        countSpan.textContent = String(favoriteCities.length + favoriteCountries.length + favoriteWiki.length);
        updateStatus(`⭐ تم عرض ${favorites.length} من المفضلة`, '#f59e0b');
        updateFavoriteButtons();
    };

    function updateFavoriteButtons() {
        const keys = new Set(readFavorites().map(favoriteKey));

        document.querySelectorAll('.favorite-toggle').forEach((button) => {
            const index = Number(button.dataset.favoriteIndex);
            const item = allLinksData?.[index];
            if (!item) return;

            const active = keys.has(favoriteKey(item));
            button.classList.toggle('is-favorite', active);
            button.textContent = active ? '★ محفوظة' : '☆ مفضلة';
            button.setAttribute('aria-pressed', String(active));
            button.setAttribute('aria-label', active
                ? `إزالة ${item.name || item.query || ''} من المفضلة`
                : `إضافة ${item.name || item.query || ''} إلى المفضلة`);

            // حالة مرئية واضحة حتى لو لم يوجد CSS خاص بالفئة.
            button.style.background = active ? '#fef3c7' : '#f1f5f9';
            button.style.color = active ? '#92400e' : '#334155';
            button.style.fontWeight = active ? '700' : '400';
        });
    }

    window.toggleFavorite = function toggleFavorite(index) {
        const numericIndex = Number(index);
        const item = allLinksData?.[numericIndex];
        if (!item) {
            console.warn('تعذر تحديد النتيجة لإضافتها إلى المفضلة:', index);
            return;
        }

        const favorites = readFavorites();
        const key = favoriteKey(item);
        const existing = favorites.findIndex((favorite) => favoriteKey(favorite) === key);

        if (existing >= 0) {
            favorites.splice(existing, 1);
            showToast('تمت إزالة العنصر من المفضلة');
        } else {
            favorites.push({
                query: item.query || item.name || '',
                name: item.name || item.query || '',
                type: item.type || 'مدينة'
            });
            showToast('⭐ تمت إضافة العنصر إلى المفضلة');
        }

        writeFavorites(favorites);
        updateFavoriteButtons();
        updateSummaryStats();
    };

    // ============================================================
    // تحسينات البحث وإمكانية الوصول
    // ============================================================

    function setupSearchUX() {
        if (!searchInput) return;

        document.addEventListener('keydown', (event) => {
            const target = event.target;
            const isTypingField = target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target?.isContentEditable;

            if (event.key === '/' && !isTypingField && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                searchInput.focus();
                searchInput.select();
            }

            if (event.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.value = '';
                if (suggestionsDiv) suggestionsDiv.innerHTML = '';
                if (typeof renderLocalCityResults === 'function' && allCities.length) {
                    renderLocalCityResults(allCities);
                }
                updateStatus('⌨️ تم مسح البحث', '#64748b');
            }
        });

        searchInput.addEventListener('focus', () => {
            searchInput.setAttribute('aria-label', 'بحث عن مدينة أو دولة أو نص');
        });

        if (resultsDiv) {
            const observer = new MutationObserver(() => {
                const firstResult = resultsDiv.querySelector('.card');
                if (firstResult && searchInput.dataset.scrollToResults === '1') {
                    searchInput.dataset.scrollToResults = '0';
                    firstResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            observer.observe(resultsDiv, { childList: true });
        }
    }

    function setupClearSearchButton() {
        if (!searchInput || !searchInput.parentElement) return;
        const parent = searchInput.parentElement;
        if (parent.querySelector('.search-clear-btn')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-clear-btn';
        button.textContent = '×';
        button.title = 'مسح البحث';
        button.setAttribute('aria-label', 'مسح البحث');
        button.style.cssText = [
            'position:absolute', 'inset-inline-end:8px', 'top:50%', 'transform:translateY(-50%)',
            'width:32px', 'height:32px', 'border:0', 'border-radius:50%', 'background:transparent',
            'color:#64748b', 'font-size:22px', 'line-height:1', 'cursor:pointer', 'display:none', 'z-index:2'
        ].join(';');

        const computed = getComputedStyle(parent);
        if (computed.position === 'static') parent.style.position = 'relative';
        parent.appendChild(button);

        const updateVisibility = () => {
            button.style.display = searchInput.value ? 'block' : 'none';
        };

        button.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            if (suggestionsDiv) suggestionsDiv.innerHTML = '';
            updateVisibility();
            if (typeof renderLocalCityResults === 'function' && allCities.length) {
                renderLocalCityResults(allCities);
            }
            updateStatus('⌨️ تم مسح البحث', '#64748b');
        });

        searchInput.addEventListener('input', updateVisibility);
        updateVisibility();
    }

    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        const observer = new MutationObserver(() => {
            updateSummaryStats();
            updateFavoriteButtons();
        });
        observer.observe(resultsElement, { childList: true, subtree: true });
    }

    applyTheme(localStorage.getItem(THEME_KEY) || 'light');
    window.addEventListener('load', () => {
        updateSummaryStats();
        updateFavoriteButtons();
        setupSearchUX();
        setupClearSearchButton();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeEnhancementModal();
    });
})();
