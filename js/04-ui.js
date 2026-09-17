// 04-ui.js - محمل سريع للقائمة المنسدلة
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
        #advanced-category-select{transition:none!important;animation:none!important;box-shadow:none!important;will-change:auto!important;touch-action:manipulation}
        #advanced-category-select:focus{box-shadow:none!important}
        .advanced-category-select-wrap{contain:layout paint}
    `;
    document.head.appendChild(fastStyle);
    const readSaved = () => {
        try { const value=Number(localStorage.getItem(storageKey)); return Number.isInteger(value)&&value>=0?value:0; } catch (_) { return 0; }
    };
    const saveValue = value => { try { localStorage.setItem(storageKey,String(Number(value)||0)); } catch (_) {} };
    const originalChange = window.changeAdvancedCategory;
    if (typeof originalChange === 'function') {
        window.changeAdvancedCategory = function(value) {
            saveValue(value);
            return originalChange.call(this,value);
        };
    }
    const restoreSaved = () => {
        const select=document.getElementById('advanced-category-select');
        if(!select||typeof window.changeAdvancedCategory!=='function')return;
        const saved=String(readSaved());
        if([...select.options].some(option=>option.value===saved)){
            select.value=saved;
            window.changeAdvancedCategory(saved);
        }
    };
    if(typeof window.renderResults==='function'){
        const originalRenderResults=window.renderResults;
        window.renderResults=function(groups){
            const result=originalRenderResults.call(this,groups);
            restoreSaved();
            return result;
        };
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreSaved,{once:true});
    else restoreSaved();
    console.log('✅ القائمة المنسدلة سريعة + آخر تصنيف محفوظ تلقائيًا');
})();
