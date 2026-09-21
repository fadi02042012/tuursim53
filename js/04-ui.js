// ============================================================
// 04-ui.js - واجهة البحث المتقدم السريعة
// ============================================================
let selectedAdvancedCategory = 0;
let favoriteItemsCache = {};
function favoriteKey(item){
    const raw = [item.type || '', item.name || '', item.query || '', item.url || ''].join('|');
    let hash = 0;
    for(let i=0;i<raw.length;i++) hash = ((hash << 5) - hash) + raw.charCodeAt(i) | 0;
    return 'fav_' + Math.abs(hash);
}
function getFavorites(){
    try { const data = JSON.parse(localStorage.getItem('tuursim53_favorites') || '[]'); return Array.isArray(data) ? data : []; }
    catch(_) { return []; }
}
function saveFavorites(items){ localStorage.setItem('tuursim53_favorites', JSON.stringify(items.slice(0,500))); }
document.addEventListener('click', function(event){
    const button = event.target.closest('.favorite-toggle');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    window.toggleFavorite(button.dataset.favoriteKey);
});
window.toggleFavorite = function(key){
    const item = favoriteItemsCache[key];
    if(!item) return;
    const items = getFavorites();
    const index = items.findIndex(x => x.key === key);
    if(index >= 0){
        items.splice(index,1);
        if (typeof showToast === 'function') showToast('🗑️ تمت إزالة النتيجة من المفضلة');
    } else {
        items.unshift({...item, key, savedAt:new Date().toISOString()});
        if (typeof showToast === 'function') showToast('⭐ تمت إضافة النتيجة إلى المفضلة');
    }
    saveFavorites(items);
    updateFavoriteButtons();
};
window.updateFavoriteButtons = function(){
    const keys = new Set(getFavorites().map(x => x.key));
    document.querySelectorAll('[data-favorite-key]').forEach(btn => {
        const active = keys.has(btn.dataset.favoriteKey);
        btn.textContent = active ? '⭐ في المفضلة' : '☆ أضف للمفضلة';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
};
function favoriteButton(item){
    const key = favoriteKey(item);
    favoriteItemsCache[key] = item;
    const active = getFavorites().some(x => x.key === key);
    return '<button type="button" class="btn btn-favorite favorite-toggle" data-favorite-key="'+escapeHtml(key)+'" aria-pressed="'+(active?'true':'false')+'">'+(active?'⭐ في المفضلة':'☆ أضف للمفضلة')+'</button>';
}
window.showFavorites = function(){
    const items = getFavorites();
    if(!items.length){ resultsDiv.innerHTML='<div class="card"><div style="text-align:center;padding:35px;">⭐<h3>لا توجد نتائج في المفضلة</h3><p style="color:#94a3b8;">يمكنك إضافة أي نتيجة للمفضلة والعودة إليها لاحقًا.</p></div></div>'; countSpan.textContent='0'; return; }
    resultsDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;">⭐ المفضلة ('+items.length+')</h3><button type="button" onclick="clearFavorites()" style="padding:7px 11px;border:1px solid #ef4444;border-radius:8px;background:#fff;color:#b91c1c;cursor:pointer;">🗑️ مسح المفضلة</button></div>' +
        items.map(item => {
            const safeName = escapeHtml(item.name || item.query || 'نتيجة');
            const q = String(item.query || item.name || '').trim();
            const url = item.url ? '<a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(item.url)+'">📖 فتح الصفحة</a>' : '';
            favoriteItemsCache[item.key] = item;
            return '<div class="card" style="'+cardStyle()+'"><div style="font-size:17px;font-weight:bold;color:#1e293b;">'+safeName+'</div><div style="color:#64748b;font-size:13px;margin:5px 0 9px;">'+escapeHtml(item.type || 'نتيجة')+'</div><div style="display:flex;gap:7px;flex-wrap:wrap;">'+favoriteButton(item)+'<a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q='+encodeURIComponent(q)+'">🔍 Google</a><a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)+'">📍 خرائط</a><a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query='+encodeURIComponent(q)+'">▶ YouTube</a>'+url+'</div></div>';
        }).join('');
    countSpan.textContent=String(items.length);
};
window.clearFavorites = function(){
    if(!confirm('هل تريد مسح جميع النتائج المحفوظة في المفضلة؟')) return;
    localStorage.removeItem('tuursim53_favorites');
    showFavorites();
};


function ensureAdvancedCategoryStyles() {
    if (document.getElementById('advanced-category-styles')) return;
    const style = document.createElement('style');
    style.id = 'advanced-category-styles';
    style.textContent = `
        .search-advanced-prompt{display:none;position:absolute;top:calc(100% + 8px);right:0;left:0;z-index:1200;direction:rtl}.search-advanced-prompt-inner{padding:14px;background:#fff;border:1px solid #e5e2f5;border-radius:16px;box-shadow:0 18px 45px rgba(55,48,90,.18)}.search-advanced-prompt-title{display:flex;align-items:center;gap:10px;margin-bottom:10px}.search-advanced-prompt-title>span{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff}.search-advanced-prompt-title strong{display:block;font-size:15px}.search-advanced-prompt-title small{display:block;color:#777989;font-size:11px;margin-top:2px}.search-advanced-prompt select{width:100%;min-height:44px;border:2px solid #dedaf2;border-radius:11px;padding:7px 10px;background:#fff;color:#292943;font:600 13px inherit}.search-advanced-prompt-actions{display:flex;gap:7px;margin-top:10px}.wizard-city-select{width:100%;margin-top:14px;padding:13px 14px;border:1px solid #d8d3ef;border-radius:12px;background:#fff;color:#1f2340;font-size:15px;font-weight:700;outline:none;cursor:pointer}.wizard-city-select:focus{border-color:#8b7cf6;box-shadow:0 0 0 3px rgba(139,124,246,.12)}body.dark-mode .wizard-city-select{background:#0f172a;color:#f8fafc;border-color:#475569}.city-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.city-choice-btn{border:1px solid #dedaf2;border-radius:11px;background:#f8f7ff;color:#292943;padding:11px 9px;font:700 13px inherit;cursor:pointer;text-align:right}.city-choice-btn:hover{border-color:#9b8df7;background:#eeeaff}body.dark-mode .city-choice-btn{background:#0f172a;color:#f1f5f9;border-color:#475569}@media(max-width:560px){.city-choice-grid{grid-template-columns:1fr}}.search-advanced-prompt-actions button{flex:1;border:0;border-radius:10px;padding:10px 12px;font:700 12px inherit;cursor:pointer}.search-advanced-apply{background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff}.search-advanced-skip{background:#f1efff;color:#5d51ad}body.dark-mode .search-advanced-prompt-inner{background:#172033;border-color:#334155}body.dark-mode .search-advanced-prompt select{background:#0f172a;color:#f1f5f9;border-color:#475569}@media(max-width:560px){.search-advanced-prompt{right:-8px;left:-8px}.search-advanced-prompt-actions{flex-direction:column}}

        .advanced-category-panel{margin:0 0 16px;padding:16px 18px;background:linear-gradient(135deg,#ffffff 0%,#f8f7ff 100%);border:1px solid #e5e2f5;border-radius:18px;box-shadow:0 8px 28px rgba(79,70,120,.08);direction:rtl;}
        .advanced-category-heading{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
        .advanced-category-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex:0 0 44px;border-radius:13px;background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff;font-size:21px;box-shadow:0 6px 16px rgba(126,168,255,.25);}
        .advanced-category-title-wrap{min-width:0;flex:1;}
        .advanced-category-title-wrap h3{margin:0!important;color:#292943;font-size:17px;font-weight:800;line-height:1.3;}
        .advanced-category-title-wrap p{margin:3px 0 0!important;color:#777989;font-size:12px;line-height:1.5;}
        .advanced-category-count{flex:0 0 auto;padding:6px 10px;border-radius:999px;background:#eeeaff;color:#6559ba;font-size:11px;font-weight:800;white-space:nowrap;}
        .advanced-category-label{display:block;margin:0 0 7px;color:#55576b;font-size:12px;font-weight:800;}
        .advanced-category-select-wrap{position:relative;}
        #advanced-category-select{width:100%;min-height:50px;padding:10px 44px 10px 42px;border:2px solid #dedaf2;border-radius:13px;background:#fff;color:#292943;font:600 14px "Segoe UI",Tahoma,Arial,sans-serif;outline:0;cursor:pointer;appearance:none;-webkit-appearance:none;box-shadow:0 3px 10px rgba(79,70,120,.04);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;}
        #advanced-category-select:hover{border-color:#b8aff0;background:#fdfcff;}
        #advanced-category-select:focus{border-color:#8f82e9;box-shadow:0 0 0 4px rgba(143,130,233,.14);}
        #advanced-category-select optgroup{font-weight:800;color:#5f54ad;background:#f5f2ff;}
        #advanced-category-select option{font-weight:600;color:#292943;background:#fff;padding:9px;}
        .advanced-category-chevron{position:absolute;left:16px;top:50%;transform:translateY(-52%);pointer-events:none;color:#6d63b7;font-size:21px;font-weight:900;line-height:1;}
        .advanced-category-help{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;padding:8px 10px;border-radius:10px;background:#f3f1ff;color:#777989;font-size:11px;line-height:1.5;}
        .advanced-category-help strong{color:#5d51ad;font-weight:800;}
        body.dark-mode .advanced-category-panel{background:linear-gradient(135deg,#1e293b,#172033);border-color:#334155;box-shadow:0 8px 28px rgba(0,0,0,.18);}
        body.dark-mode .advanced-category-title-wrap h3{color:#f1f5f9;}
        body.dark-mode .advanced-category-title-wrap p,.dark-mode .advanced-category-label{color:#94a3b8;}
        body.dark-mode .advanced-category-count,.dark-mode .advanced-category-help{background:#2a3150;color:#b8b2ef;}
        body.dark-mode .advanced-category-help strong{color:#c9c4ff;}
        body.dark-mode #advanced-category-select{background:#0f172a;color:#f1f5f9;border-color:#475569;}
        body.dark-mode #advanced-category-select:hover{background:#111c31;border-color:#64748b;}
        body.dark-mode #advanced-category-select optgroup{background:#252b49;color:#c9c4ff;}
        body.dark-mode #advanced-category-select option{background:#0f172a;color:#f1f5f9;}
        @media(max-width:560px){.advanced-category-panel{padding:13px;border-radius:15px}.advanced-category-heading{gap:9px}.advanced-category-icon{width:40px;height:40px;flex-basis:40px;font-size:18px}.advanced-category-title-wrap h3{font-size:15px}.advanced-category-title-wrap p{font-size:11px}.advanced-category-count{font-size:10px;padding:5px 8px}#advanced-category-select{min-height:48px;font-size:13px;padding-right:38px;padding-left:38px}.advanced-category-chevron{left:13px}.advanced-category-help{font-size:10px;}}
    `;
    document.head.appendChild(style);
}
function cardStyle(){return 'background:white;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);contain:layout style;';}
function linkCount(){return typeof getAdvancedLinksCount==='function'?getAdvancedLinksCount():48;}
function getCategoryName(index=selectedAdvancedCategory){return typeof getAdvancedLinkName==='function'?getAdvancedLinkName(index):'📺 البحث العادي';}
function getCategoryUrl(query,index=selectedAdvancedCategory){return typeof generateAdvancedLink==='function'?generateAdvancedLink(query,index):`https://www.youtube.com/results?search_query=${encodeURIComponent(query||'')}`;}

function getSavedAdvancedCategory(){try{const v=Number(localStorage.getItem('tuursim53_advanced_category'));return Number.isFinite(v)&&v>=0?v:0;}catch(_){return 0;}}
selectedAdvancedCategory=getSavedAdvancedCategory();
function ensureSearchAdvancedPrompt(){let h=document.getElementById('search-advanced-prompt');if(h)return h;const bar=document.querySelector('.google-search-bar');if(!bar)return null;ensureAdvancedCategoryStyles();h=document.createElement('div');h.id='search-advanced-prompt';h.className='search-advanced-prompt';bar.appendChild(h);return h;}
window.showSearchAdvancedPrompt=function(onContinue){
    const host=ensureSearchAdvancedPrompt();
    if(!host){onContinue?.();return;}
    const hasSaved=localStorage.getItem('tuursim53_advanced_category')!==null;
    selectedAdvancedCategory=hasSaved?getSavedAdvancedCategory():0;
    const categories=typeof getAdvancedSearches==='function'?getAdvancedSearches():[];
    const options=categories.map(x=>'<option value="'+x.index+'" '+(Number(x.index)===selectedAdvancedCategory?'selected':'')+'>'+escapeHtml(x.name||('بحث '+(Number(x.index)+1)))+'</option>').join('');
    host.innerHTML='<div class="search-advanced-prompt-inner"><div class="search-advanced-prompt-title"><span>⚡</span><div><strong>البحث المتقدم</strong><small>اختر فلترة البحث للمدينة</small></div></div><select id="advanced-category-select" class="wizard-city-select">'+options+'</select><button type="button" id="advanced-apply-btn" class="advanced-apply-btn">🚀 تطبيق الفلترة والبحث</button></div>';
    host.style.display='block';
    const select=host.querySelector('#advanced-category-select'), btn=host.querySelector('#advanced-apply-btn');
    btn.onclick=()=>{
        selectedAdvancedCategory=Number(select.value)||0;
        localStorage.setItem('tuursim53_advanced_category',String(selectedAdvancedCategory));
        host.style.display='none';
        onContinue?.();
    };
};
window.getSavedAdvancedSearchUrl=function(query){
    const q=String(query||'').trim();
    const url=getCategoryUrl(q,getSavedAdvancedCategory());
    return url&&url.includes('youtube.com/results')?url:'https://www.youtube.com/results?search_query='+encodeURIComponent(q);
};
function populateCountrySelect(){countrySelect.innerHTML='<option value="">🌐 كل الدول</option>';countries.forEach(c=>{const displayName=c.name_ar||c.name||c.code;countryMap[c.code]=displayName;countryNames[c.code]=c.name||c.code;const option=document.createElement('option');option.value=c.code;option.textContent=displayName;countrySelect.appendChild(option);});}
console.log('✅ 04-ui.js تم تحميله بنجاح — واجهة تصنيفات احترافية ومتجاوبة');


// تحسينات الأداء: لا توجد شبكة في مسار واجهة البحث.
(() => {
    const storageKey = 'tuursim53.advancedCategory';
    try {
        const saved = Number(localStorage.getItem(storageKey));
        if (Number.isFinite(saved) && saved >= 0) {
            selectedAdvancedCategory = saved;
        }
    } catch (_) {}

    const originalChange = window.changeAdvancedCategory;
    window.changeAdvancedCategory = function(value) {
        const n = Number(value) || 0;
        try { localStorage.setItem(storageKey, String(n)); } catch (_) {}
        return originalChange ? originalChange.call(this, n) : undefined;
    };

    // لا تستخدم fetch/eval لتحميل نسخة واجهة ثانية؛ هذا يمنع تأخير بدء التطبيق.
    window.uiReady = true;
    window.uiReadyPromise = Promise.resolve();
})();
