// 04-ui.js - واجهة البحث المتقدم بدون XHR متزامن أو حجب للصفحة
(() => {
    const storageKey = 'tuursim53.advancedCategory';
    const originalUrl = new URL('04-ui-original.js?rev=20260918', document.currentScript?.src || location.href).href;

    const loadOriginal = async () => {
        const response = await fetch(originalUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`ui_http_${response.status}`);
        (0, eval)(await response.text());
    };

    const fallbackCountrySelect = () => {
        if (typeof window.populateCountrySelect === 'function' || typeof countrySelect === 'undefined' || !countrySelect) return;
        window.populateCountrySelect = () => {
            if (!Array.isArray(countries)) return;
            const selected = countrySelect.value;
            countrySelect.replaceChildren(new Option('🌐 كل الدول', ''));
            countryMap = {}; countryNames = {};
            const fragment = document.createDocumentFragment();
            countries.forEach(c => {
                const code = String(c.code || '').trim(); if (!code) return;
                const ar = String(c.name_ar || c.name || code).trim();
                const en = String(c.name || ar).trim();
                countryMap[code] = en; countryNames[code] = ar;
                fragment.appendChild(new Option(`🌍 ${ar}`, code));
            });
            countrySelect.appendChild(fragment);
            if ([...countrySelect.options].some(o => o.value === selected)) countrySelect.value = selected;
        };
    };

    const enhance = () => {
        fallbackCountrySelect();
        const styleId = 'advanced-ui-fast-enhancements';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = '.advanced-category-select-wrap{position:relative!important;z-index:50!important;overflow:visible!important}#advanced-category-select{position:relative!important;z-index:51!important;pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important}.advanced-category-chevron{pointer-events:none!important;z-index:52!important}';
            document.head.appendChild(style);
        }
        const save = value => { try { localStorage.setItem(storageKey, String(Number(value) || 0)); } catch (_) {} };
        if (typeof window.changeAdvancedCategory === 'function' && !window.changeAdvancedCategory.__fast) {
            const original = window.changeAdvancedCategory;
            const wrapped = function(value) {
                save(value);
                return original.call(this, value);
            };
            wrapped.__fast = true;
            window.changeAdvancedCategory = wrapped;
        }
        try { window.populateCountrySelect?.(); } catch (e) { console.warn('تعذر تعبئة قائمة الدول:', e); }
    };

    window.uiReadyPromise = loadOriginal().catch(error => {
        console.error('تعذر تحميل واجهة البحث المتقدم:', error);
        fallbackCountrySelect();
    }).then(() => { enhance(); window.uiReady = true; });
    window.uiReady = false;
})();
