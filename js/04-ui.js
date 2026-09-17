// 04-ui.js - إصلاح سريع للقائمة والدول وبطاقة البحث
(() => {
    const originalUrl = new URL('04-ui-original.js', document.currentScript?.src || location.href).href;
    const storageKey = 'tuursim53.advancedCategory';
    const request = new XMLHttpRequest();
    request.open('GET', originalUrl, false);
    request.send(null);
    if (request.status >= 200 && request.status < 400) {
        (0, eval)(request.responseText);
    } else {
        console.error('تعذر تحميل واجهة البحث المتقدم الأصلية:', request.status);
        return;
    }

    // تأكيد تحميل قائمة الدول حتى لو لم تكن دالة تعبئة القائمة موجودة في نسخة قديمة.
    if (typeof window.populateCountrySelect !== 'function') {
        window.populateCountrySelect = function () {
            if (typeof countrySelect === 'undefined' || !countrySelect || !Array.isArray(countries)) return;
            countryMap = {};
            countryNames = {};
            const fragment = document.createDocumentFragment();
            const first = countrySelect.options[0] || new Option('🌐 كل الدول', '');
            countrySelect.replaceChildren(first);
            countries.forEach(country => {
                const code = String(country.code || '').trim();
                if (!code) return;
                const nameAr = String(country.name_ar || country.name || code).trim();
                const nameEn = String(country.name || nameAr).trim();
                countryMap[code] = nameEn;
                countryNames[code] = nameAr;
                fragment.appendChild(new Option(`🌍 ${nameAr}`, code));
            });
            countrySelect.appendChild(fragment);
            if (typeof sortCountryDropdown === 'function') sortCountryDropdown();
        };
    }

    const fastStyle = document.createElement('style');
    fastStyle.id = 'advanced-category-fast-style';
    fastStyle.textContent = `
        .advanced-category-select-wrap{position:relative!important;z-index:50!important;overflow:visible!important;contain:none!important;}
        #advanced-category-select{position:relative!important;z-index:51!important;width:100%!important;min-height:50px!important;pointer-events:auto!important;touch-action:manipulation!important;transition:none!important;animation:none!important;will-change:auto!important;cursor:pointer!important;}
        #advanced-category-select:focus{outline:2px solid rgba(143,130,233,.35)!important;outline-offset:1px!important;box-shadow:none!important;}
        #advanced-category-select:hover{border-color:#b8aff0!important;}
        .advanced-category-chevron{z-index:52!important;pointer-events:none!important;}
        #results .text-query-card{width:100%!important;background:#fff!important;border:1px solid #e8e7f2!important;border-radius:12px!important;padding:14px 12px!important;margin:0 0 10px!important;box-shadow:0 1px 5px rgba(0,0,0,.08)!important;}
        #results .text-query-card .card-header,#results .text-query-card .btn-group,#results .text-query-card .seo-tags{margin-top:0!important;}
        #results .advanced-category-panel{position:relative!important;z-index:40!important;overflow:visible!important;}
        #results .advanced-category-panel *{overflow:visible;}
    `;
    document.head.appendChild(fastStyle);

    const readSaved = () => {
        try {
            const value = Number(localStorage.getItem(storageKey));
            return Number.isInteger(value) && value >= 0 ? value : 0;
        } catch (_) { return 0; }
    };
    const saveValue = value => {
        try { localStorage.setItem(storageKey, String(Number(value) || 0)); } catch (_) {}
    };

    const originalChange = window.changeAdvancedCategory;
    if (typeof originalChange === 'function') {
        window.changeAdvancedCategory = function(value) {
            saveValue(value);
            return originalChange.call(this, value);
        };
    }

    const restoreSaved = () => {
        const select = document.getElementById('advanced-category-select');
        if (!select || typeof window.changeAdvancedCategory !== 'function') return;
        const saved = String(readSaved());
        if ([...select.options].some(option => option.value === saved)) {
            select.value = saved;
            window.changeAdvancedCategory(saved);
        }
    };

    const installInteractionFix = () => {
        const select = document.getElementById('advanced-category-select');
        if (!select || select.dataset.fastDropdownReady === '1') return;
        select.dataset.fastDropdownReady = '1';
        select.addEventListener('change', () => saveValue(select.value), { passive: true });
    };

    if (typeof window.renderResults === 'function') {
        const originalRenderResults = window.renderResults;
        window.renderResults = function(groups) {
            const result = originalRenderResults.call(this, groups || { cities: [], countries: [] });
            restoreSaved();
            installInteractionFix();
            return result;
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try { window.populateCountrySelect?.(); } catch (_) {}
            restoreSaved();
            installInteractionFix();
        }, { once: true });
    } else {
        try { window.populateCountrySelect?.(); } catch (_) {}
        restoreSaved();
        installInteractionFix();
    }

    console.log('✅ تم إصلاح تحميل الدول والقائمة المنسدلة والتوافق مع التكبير');
})();
