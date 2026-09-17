// 04-ui.js - محمل سريع وآمن للقائمة المنسدلة
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
    const fastStyle = document.createElement('style');
    fastStyle.id = 'advanced-category-fast-style';
    fastStyle.textContent = `
        .advanced-category-select-wrap{position:relative!important;z-index:50!important;overflow:visible!important;contain:none!important;}
        #advanced-category-select{position:relative!important;z-index:51!important;width:100%!important;min-height:50px!important;pointer-events:auto!important;touch-action:manipulation!important;transition:none!important;animation:none!important;will-change:auto!important;cursor:pointer!important;}
        #advanced-category-select:focus{outline:2px solid rgba(143,130,233,.35)!important;outline-offset:1px!important;box-shadow:none!important;}
        #advanced-category-select:hover{border-color:#b8aff0!important;}
        .advanced-category-chevron{z-index:52!important;pointer-events:none!important;}
        .text-query-card{background:white!important;border-radius:12px!important;padding:14px!important;margin-bottom:12px!important;box-shadow:0 1px 5px rgba(0,0,0,.08)!important;contain:content!important;content-visibility:auto!important;}
        #results .text-query-card{width:100%!important;}
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
        select.addEventListener('change', () => saveValue(select.value), { passive:true });
        select.addEventListener('pointerdown', () => { select.style.pointerEvents = 'auto'; }, { passive:true });
    };

    if (typeof window.renderResults === 'function') {
        const originalRenderResults = window.renderResults;
        window.renderResults = function(groups) {
            const result = originalRenderResults.call(this, groups);
            restoreSaved();
            installInteractionFix();
            return result;
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { restoreSaved(); installInteractionFix(); }, { once:true });
    } else {
        restoreSaved();
        installInteractionFix();
    }

    console.log('✅ القائمة المنسدلة تعمل عند أي تكبير شاشة + الحفظ التلقائي');
})();
