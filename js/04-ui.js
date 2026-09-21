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
        .search-advanced-prompt{display:none;position:absolute;top:calc(100% + 8px);right:0;left:0;z-index:1200;direction:rtl}.search-advanced-prompt-inner{padding:14px;background:#fff;border:1px solid #e5e2f5;border-radius:16px;box-shadow:0 18px 45px rgba(55,48,90,.18)}.search-advanced-prompt-title{display:flex;align-items:center;gap:10px;margin-bottom:10px}.search-advanced-prompt-title>span{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff}.search-advanced-prompt-title strong{display:block;font-size:15px}.search-advanced-prompt-title small{display:block;color:#777989;font-size:11px;margin-top:2px}.search-advanced-prompt select{width:100%;min-height:44px;border:2px solid #dedaf2;border-radius:11px;padding:7px 10px;background:#fff;color:#292943;font:600 13px inherit}.search-advanced-prompt-actions{display:flex;gap:7px;margin-top:10px}.wizard-city-select{width:100%;margin-top:14px;padding:13px 14px;border:1px solid #d8d3ef;border-radius:12px;background:#fff;color:#1f2340;font-size:15px;font-weight:700;outline:none;cursor:pointer}.wizard-city-select:focus{border-color:#8b7cf6;box-shadow:0 0 0 3px rgba(139,124,246,.12)}body.dark-mode .wizard-city-select{background:#0f172a;color:#f8fafc;border-color:#475569}.city-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.city-choice-btn{border:1px solid #dedaf2;border-radius:11px;background:#f8f7ff;color:#292943;padding:11px 9px;font:700 13px inherit;cursor:pointer;text-align:right}.city-choice-btn:hover{border-color:#9b8df7;background:#eeeaff}body.dark-mode .city-choice-btn{background:#0f172a;color:#f1f5f9;border-color:#475569}@media(max-width:560px){.city-choice-grid{grid-template-columns:1fr}}.ux-filter-next-wiki{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;margin:0 0 9px;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:800;}.ux-wizard{padding:14px}.ux-search-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ux-search-choice{display:flex;align-items:center;gap:10px;text-align:right;border:1px solid #dedaf2;border-radius:14px;background:#faf9ff;color:#292943;padding:12px;cursor:pointer;transition:.16s}.ux-search-choice:hover{border-color:#9b8df7;transform:translateY(-1px)}.ux-search-choice-primary{background:linear-gradient(135deg,#f3f1ff,#eef6ff);border-color:#c9c1f4}.ux-search-choice>span:first-child{font-size:22px}.ux-search-choice strong,.ux-search-choice small{display:block}.ux-search-choice small{margin-top:3px;color:#777989;font-size:10px;line-height:1.4}.ux-step{margin-top:2px}.ux-step-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}.ux-step-head>div{flex:1}.ux-step-head strong,.ux-step-head small{display:block}.ux-step-head small{margin-top:2px;color:#777989;font-size:10px}.ux-back-btn{border:0;background:#f1efff;color:#5d51ad;border-radius:9px;padding:8px 10px;cursor:pointer;font-weight:800;white-space:nowrap}.ux-filter-search{width:100%;box-sizing:border-box;min-height:44px;border:2px solid #dedaf2;border-radius:11px;padding:9px 12px;background:#fff;color:#292943;font:600 13px inherit;outline:none;margin:2px 0 9px}.ux-filter-search:focus{border-color:#8f82e9;box-shadow:0 0 0 3px rgba(143,130,233,.12)}.ux-filter-search-label{display:block;font-size:11px;font-weight:800;color:#55576b;margin:2px 0 6px}.ux-filter-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:270px;overflow:auto;padding:2px}.ux-filter-chip{display:flex;align-items:center;gap:7px;min-width:0;border:1px solid #e1ddf1;border-radius:10px;background:#fff;color:#292943;padding:10px 9px;text-align:right;cursor:pointer;font:700 11px inherit}.ux-filter-chip:hover{border-color:#a79cef;background:#f8f7ff}.ux-filter-chip.is-selected{border-color:#8f82e9;background:#eeeaff;color:#4f46a5;box-shadow:0 0 0 1px #8f82e9 inset}.ux-filter-chip span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ux-filter-empty,.ux-filter-more{text-align:center;padding:10px;color:#777989;font-size:11px;grid-column:1/-1}.ux-filter-more{padding-top:2px}.ux-continue-btn{width:100%;margin-top:10px;border:0;border-radius:11px;padding:12px;background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff;font:800 13px inherit;cursor:pointer}.ux-city-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:300px;overflow:auto}.ux-city-btn{display:flex;align-items:center;gap:8px;border:1px solid #dedaf2;border-radius:11px;background:#fff;color:#292943;padding:10px;text-align:right;cursor:pointer}.ux-city-btn:hover{border-color:#9b8df7;background:#f8f7ff}.ux-city-btn>span:nth-child(2){flex:1;min-width:0}.ux-city-btn strong,.ux-city-btn small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ux-city-btn small{margin-top:2px;color:#777989;font-size:10px}.ux-city-btn>span:last-child{color:#8b7cf6;font-weight:900}.ux-search-choice:disabled{opacity:.45;cursor:default;transform:none}body.dark-mode .ux-search-choice,body.dark-mode .ux-filter-chip,body.dark-mode .ux-city-btn{background:#0f172a;color:#f1f5f9;border-color:#475569}body.dark-mode .ux-search-choice-primary,body.dark-mode .ux-filter-chip.is-selected{background:#25204a;border-color:#8f82e9}body.dark-mode .ux-filter-search{background:#0f172a;color:#f1f5f9;border-color:#475569}body.dark-mode .ux-back-btn{background:#2a3150;color:#c9c4ff}@media(max-width:560px){.ux-search-choice-grid,.ux-filter-list,.ux-city-list{grid-template-columns:1fr}.ux-search-choice{padding:11px}.ux-filter-list,.ux-city-list{max-height:260px}}
        .search-advanced-prompt-actions button{flex:1;border:0;border-radius:10px;padding:10px 12px;font:700 12px inherit;cursor:pointer}.search-advanced-apply{background:linear-gradient(135deg,#9b8df7,#7ea8ff);color:#fff}.search-advanced-skip{background:#f1efff;color:#5d51ad}body.dark-mode .search-advanced-prompt-inner{background:#172033;border-color:#334155}body.dark-mode .search-advanced-prompt select{background:#0f172a;color:#f1f5f9;border-color:#475569}@media(max-width:560px){.search-advanced-prompt{right:-8px;left:-8px}.search-advanced-prompt-actions{flex-direction:column}}

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
    if(!host){onContinue?.('normal');return;}

    selectedAdvancedCategory=getSavedAdvancedCategory();
    const categories=typeof getAdvancedSearches==='function'
        ?getAdvancedSearches()
        :(typeof getAdvancedLinks==='function'?getAdvancedLinks():[]);

    const normalizedCategories=categories.map((x,i)=>({
        index:Number.isFinite(Number(x.index))?Number(x.index):i,
        name:String(x.name||x.title||('بحث '+(i+1))).trim(),
        group:String(x.group||'تصنيفات أخرى').trim()
    }));

    const savedName=normalizedCategories.find(x=>x.index===selectedAdvancedCategory)?.name||getCategoryName(selectedAdvancedCategory);

    host.innerHTML=`
      <div class="search-advanced-prompt-inner ux-wizard">
        <div class="search-advanced-prompt-title">
          <span>🔍</span>
          <div>
            <strong>⚡ تخصيص البحث</strong>
            <small>اختر الفلتر فقط إذا كنت تحتاج نتائج أدق</small>
          </div>
        </div>

        <div id="wizard-filter-box" class="ux-step">
          <div class="ux-step-head">
            <button type="button" id="wizard-filter-back" class="ux-back-btn">✕ إغلاق</button>
            <div><strong>1. اختر الفلترة</strong><small>المختارة سابقًا: ${escapeHtml(savedName)}</small></div>
          </div>

          <label class="ux-filter-search-label" for="wizard-filter-search">ابحث عن أي جزء من اسم الفلتر</label>
          <input id="wizard-filter-search" class="ux-filter-search" type="search" placeholder="مثلاً: مشاهدات، 4K، اليوم..." autocomplete="off">
          <button type="button" id="wizard-filter-next" class="btn btn-wiki ux-filter-next-wiki">📖 التالي ← اختيار المدينة</button>

          <select id="wizard-filter-select" class="ux-filter-select" size="8" aria-label="اختيار فلتر البحث">
            ${normalizedCategories.map(item=>`<option value="${item.index}" ${item.index===selectedAdvancedCategory?'selected':''}>${escapeHtml(item.name)}</option>`).join('')}
          </select>
          <small class="ux-filter-hint">اختر الفلتر ثم اضغط «التالي» للانتقال إلى اختيار المدينة.</small>
        </div>
      </div>`;

    host.style.display='block';

    const filterBox=host.querySelector('#wizard-filter-box');
    const backBtn=host.querySelector('#wizard-filter-back');
    const filterSearch=host.querySelector('#wizard-filter-search');
    const filterSelect=host.querySelector('#wizard-filter-select');
    const filterNext=host.querySelector('#wizard-filter-next');

    backBtn.onclick=()=>{
        host.style.display='none';
    };

    filterSearch?.addEventListener('input',()=>{
        const q=String(filterSearch.value||'').trim().toLowerCase();
        Array.from(filterSelect.options).forEach(option=>{
            const match=!q||option.textContent.toLowerCase().includes(q);
            option.hidden=!match;
        });
        const firstVisible=Array.from(filterSelect.options).find(o=>!o.hidden);
        if(firstVisible) filterSelect.value=firstVisible.value;
    });

    filterSelect?.addEventListener('change',()=>{
        selectedAdvancedCategory=Number(filterSelect.value)||0;
    });

    const closeWizardWithoutApplying = () => {
        host.style.display='none';
    };

    host.onkeydown = event => {
        if(event.key === 'Escape'){
            event.preventDefault();
            event.stopPropagation();
            closeWizardWithoutApplying();
        }
    };

    host.onmousedown = event => {
        if(event.target === host){
            event.preventDefault();
            closeWizardWithoutApplying();
        }
    };

    filterNext?.addEventListener('click',()=>{
        selectedAdvancedCategory=Number(filterSelect?.value)||0;
        try{localStorage.setItem('tuursim53_advanced_category',String(selectedAdvancedCategory));localStorage.setItem('tuursim53.advancedCategory',String(selectedAdvancedCategory));}catch(_){}
        if(typeof window.applyAdvancedCategoryToResults==='function')window.applyAdvancedCategoryToResults();
        host.style.display='none';
        onContinue?.('advanced');
    });
};
window.getSavedAdvancedSearchUrl=function(query){
    const q=String(query||'').trim();
    const url=getCategoryUrl(q,getSavedAdvancedCategory());
    return url&&url.includes('youtube.com/results')?url:'https://www.youtube.com/results?search_query='+encodeURIComponent(q);
};
window.showCountryCityPrompt=async function(query,onContinue){
    const text=String(query||'').trim(), host=ensureSearchAdvancedPrompt();
    if(!host){onContinue?.();return;}

    let code=String(document.getElementById('countrySelect')?.value||document.getElementById('country')?.value||'').toUpperCase();
    const list=typeof countries!=='undefined'&&Array.isArray(countries)?countries:[];
    const norm=v=>String(v||'').trim().toLowerCase();
    const country=list.find(c=>[c.name,c.name_ar,c.code,c.iso2,c.iso3].filter(Boolean).some(v=>norm(v)===norm(text)))
        ||list.find(c=>[c.code,c.iso2,c.iso3].filter(Boolean).some(v=>norm(v)===norm(code)));
    if(country)code=String(country.code||country.iso2||country.iso3||code||'').toUpperCase();
    if(!code){onContinue?.();return;}

    let cities=[];
    try{
        if(typeof countryCitiesCache!=='undefined'&&countryCitiesCache.has(code))cities=countryCitiesCache.get(code)||[];
        else if(typeof loadCountryCities==='function'){
            cities=await loadCountryCities(code);
            if(typeof countryCitiesCache!=='undefined')countryCitiesCache.set(code,cities);
        }
        if(typeof sortCitiesForCountry==='function')cities=sortCitiesForCountry(cities,code);
    }catch(_){cities=[];}

    cities=(cities||[]).slice(0,50);
    if(!cities.length){onContinue?.();return;}

    const countryEn=String(country?.name||'').trim();
    const countryAr=String(country?.name_ar||'').trim();
    host.innerHTML=`
      <div class="search-advanced-prompt-inner ux-wizard city-wizard">
        <div class="search-advanced-prompt-title">
          <span>🏙️</span>
          <div>
            <strong>2. اختر المدينة</strong>
            <small>${escapeHtml(countryAr||countryEn||code)} — يبدأ البحث فور اختيار المدينة</small>
          </div>
        </div>
        <div class="ux-step-head">
          <button type="button" id="wizard-city-back" class="ux-back-btn">← تغيير الفلترة</button>
          <div><strong>الفلترة: ${escapeHtml(getCategoryName(getSavedAdvancedCategory()))}</strong><small>يمكنك الرجوع دون فقدان اختيارك</small></div>
        </div>
        <input id="wizard-city-search" class="ux-filter-search" type="search" placeholder="ابحث عن مدينة..." autocomplete="off">
        <div id="wizard-city-list" class="ux-city-list"></div>
      </div>`;
    host.style.display='block';

    const citySearch=host.querySelector('#wizard-city-search');
    const cityList=host.querySelector('#wizard-city-list');
    const back=host.querySelector('#wizard-city-back');

    const renderCities=(term='')=>{
        const q=norm(term);
        const filtered=cities.filter(c=>{
            const names=[c.city,c.name,c.city_ar,c.name_ar].filter(Boolean).map(norm);
            return !q||names.some(name=>name.includes(q));
        }).slice(0,24);

        cityList.innerHTML=filtered.length
          ?filtered.map((c)=>{
              const idx=cities.indexOf(c);
              const en=String(c.city||c.name||'').trim();
              const ar=String(c.city_ar||c.name_ar||'').trim();
              return `<button type="button" class="ux-city-btn" data-city-index="${idx}">
                <span>🏙️</span><span><strong>${escapeHtml(en||ar||'مدينة')}</strong>${ar&&ar!==en?`<small>${escapeHtml(ar)}</small>`:''}</span><span>→</span>
              </button>`;
          }).join('')
          :'<div class="ux-filter-empty">لا توجد مدينة مطابقة.</div>';
    };

    renderCities('');
    setTimeout(()=>citySearch?.focus({preventScroll:true}),0);
    citySearch?.addEventListener('input',()=>renderCities(citySearch.value));

    back?.addEventListener('click',()=>{
        host.style.display='none';
        // العودة للفلترة بدون تحويلها بالخطأ إلى بحث عادي.
        window.showSearchAdvancedPrompt((mode)=>{
            if(mode==='advanced') onContinue?.('advanced');
            else onContinue?.(mode);
        });
    });

    cityList?.addEventListener('click',event=>{
        const button=event.target.closest('[data-city-index]');
        if(!button)return;
        const c=cities[Number(button.dataset.cityIndex)];
        if(!c)return;
        const cityEn=String(c.name||c.city||'').trim();
        const cityAr=String(c.name_ar||c.city_ar||'').trim();
        const parts=[cityEn,cityAr,countryEn,countryAr].filter((v,i,a)=>v&&a.indexOf(v)===i);
        searchInput.value=parts.join(' ').trim();
        host.style.display='none';
        onContinue?.(true);
    });
};
function buildAdvancedCategoryPanel(){ensureAdvancedCategoryStyles();const categories=typeof getAdvancedSearches==='function'?getAdvancedSearches():[];const groups={};categories.forEach(item=>{const group=item.group||'تصنيفات أخرى';if(!groups[group])groups[group]=[];groups[group].push(item);});const groupLabels={'أساسي':'📺 البحث الأساسي','الترتيب':'🔥 الترتيب والفرز','التاريخ':'📅 حسب التاريخ','المدة':'⏱ حسب مدة الفيديو','الجودة':'🎥 الجودة والمشاهدة','مركب':'🧩 تصنيفات مركبة','نوع المحتوى':'🎬 نوع المحتوى','منصات':'🌐 المنصات والبحث الخارجي','قنوات محددة':'📺 القنوات المحددة'};const options=Object.entries(groups).map(([group,items])=>`<optgroup label="${escapeHtml(groupLabels[group]||group)}">${items.map(item=>`<option value="${item.index}" ${item.index===selectedAdvancedCategory?'selected':''}>${escapeHtml(item.name)}</option>`).join('')}</optgroup>`).join('');return `<section class="advanced-category-panel" aria-label="اختيار تصنيف البحث المتقدم"><div class="advanced-category-heading"><div class="advanced-category-icon">⚡</div><div class="advanced-category-title-wrap"><h3>البحث المتقدم</h3><p>اختر نوع البحث الذي تريد استخدامه مع المدينة أو الدولة.</p></div><span class="advanced-category-count">48 تصنيف</span></div><label class="advanced-category-label" for="advanced-category-select">اختر التصنيف</label><div class="advanced-category-select-wrap"><select id="advanced-category-select" onchange="changeAdvancedCategory(this.value)" aria-describedby="advanced-category-help">${options}</select><span class="advanced-category-chevron" aria-hidden="true">⌄</span></div><div id="advanced-category-help" class="advanced-category-help"><span>✓ التصنيف المختار:</span><strong>${escapeHtml(getCategoryName())}</strong></div></section>`;}
window.applyAdvancedCategoryToResults=function(){const category=getCategoryName();document.querySelectorAll('.advanced-category-link').forEach(link=>{const query=link.dataset.query||'';link.href=getCategoryUrl(query,selectedAdvancedCategory);const text=link.querySelector('.advanced-category-link-text');if(text)text.textContent='⚡ '+category;});const help=document.querySelector('#advanced-category-help strong');if(help)help.textContent=category;};
window.changeAdvancedCategory=function(value){selectedAdvancedCategory=Number(value)||0;try{localStorage.setItem('tuursim53_advanced_category',String(selectedAdvancedCategory));localStorage.setItem('tuursim53.advancedCategory',String(selectedAdvancedCategory));}catch(_){}if(typeof window.applyAdvancedCategoryToResults==='function')window.applyAdvancedCategoryToResults();};
function buttonsHtml(query,index,mapsQuery=query,wikiUrl=''){
    const text=String(query||'').trim();
    const mapsText=String(mapsQuery||text).trim();
    const advancedUrl=getCategoryUrl(text,selectedAdvancedCategory);
    return `<div class="btn-group" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsText)}">📍 خرائط</a>
        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(text)}">🔍 Google</a>
        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}">▶ YouTube</a>
        ${wikiUrl ? `<a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${escapeHtml(String(wikiUrl))}">📖 Wiki</a>` : ''}
        <a class="btn btn-secondary advanced-category-link" data-query="${escapeHtml(text)}" target="_blank" rel="noopener noreferrer" href="${escapeHtml(advancedUrl)}"><span class="advanced-category-link-text">⚡ ${escapeHtml(getCategoryName())}</span></a>
    </div>`;
}
function renderResults({cities=[],countries=[]}){resultsDiv.innerHTML='';allLinksData=[];if(!cities.length&&!countries.length)return renderEmptySearch();const parts=[];parts.push(`<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;"><button type="button" onclick="searchOnlyWikipedia()" style="padding:10px 20px;background:#3b82f6;color:white;border:0;border-radius:9px;cursor:pointer;">📖 بحث في ويكيبيديا</button><button type="button" onclick="searchAllWikipedia()" style="padding:10px 20px;background:#8b5cf6;color:white;border:0;border-radius:9px;cursor:pointer;">🔍 بحث موسع</button></div>`);let total=0;if(countries.length){parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🌍 دول (${countries.length})</h3></div>`);total+=countries.length;countries.forEach(c=>{const name=c.name||'',nameAr=c.name_ar||'',capital=c.capital||'';const query=[name,nameAr].filter(Boolean).join(' ');const index=allLinksData.length;allLinksData.push({query,links:null,type:'دولة',name});parts.push(`<div class="card" style="${cardStyle()}"><div style="text-align:left;margin-bottom:7px;">${favoriteButton({type:'دولة',name,query})}</div><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span><span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr||name)}</span></div></div>${capital?`<div style="font-size:13px;color:#475569;margin-bottom:7px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>`:''}${buttonsHtml(query,index,name)}</div>`);});}if(cities.length){parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🏙️ مدن (${cities.length})</h3></div>`);total+=cities.length;cities.forEach(c=>{const city=c.city||'',cityAr=c.city_ar||'',country=c.country||'',countryAr=c.country_ar||'';const population=c.population||'';const query=[city,cityAr,country,countryAr].filter(Boolean).join(' ');const index=allLinksData.length;allLinksData.push({query,links:null,type:'مدينة',name:city});parts.push(`<div class="card" style="${cardStyle()}"><div style="text-align:left;margin-bottom:7px;">${favoriteButton({type:'مدينة',name:city,query})}</div><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>${cityAr?`<span style="color:#64748b;font-size:15px;margin-right:4px;">(${escapeHtml(cityAr)})</span>`:''}<span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>${countryAr?`<span style="color:#64748b;">(${escapeHtml(countryAr)})</span>`:''}</div></div>${population?`<div style="font-size:12px;color:#94a3b8;margin-bottom:7px;">👥 ${Number(population).toLocaleString()}</div>`:''}${buttonsHtml(query,index,city)}<div class="seo-tags" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;"><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في '+city+' '+country)}">🌍 السياحة</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق '+city+' '+country)}">🏨 فنادق</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم '+city+' '+country)}">🍽️ مطاعم</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية '+city+' '+country)}">🏛️ معالم</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى '+city+' '+country)}">✈️ السفر</a></div></div>`);});}resultsDiv.innerHTML=parts.join('');countSpan.textContent=total;}
function renderTextQueryFavoriteCard(query){
    const text=String(query||'').trim();
    return favoriteButton({type:'بحث نصي',name:text,query:text});
}
function renderEmptySearch(){
    const query=searchInput.value.trim();
    if(!query){
        resultsDiv.innerHTML=`<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;margin-bottom:12px;">🔍</div><h3>ابحث عن مدينة أو دولة</h3><p style="color:#94a3b8;margin-top:7px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p></div></div>`;
        countSpan.textContent='0';
        return;
    }
    resultsDiv.innerHTML=`<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;margin-bottom:12px;">🔍</div><h3>لا توجد نتائج محلية أو في ويكيبيديا</h3><p style="color:#94a3b8;">يمكنك استخدام بطاقة البحث النصي للوصول إلى البحث العام.</p></div></div>`;
    countSpan.textContent='1';
    // إذا لم توجد الكلمة في JSON ولا في ويكيبيديا، أظهر بطاقة البحث النصي
    // بنفس الكلمة التي كتبها المستخدم، ولا تجعلها تختفي.
    try {
        if (typeof prependTextQueryCard === 'function') {
            prependTextQueryCard(query);
        } else {
            resultsDiv.insertAdjacentHTML('afterbegin', `
                <div class="card text-query-card" style="background:white;border-radius:12px;padding:16px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><div style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(query)}</div></div><div style="margin:9px 0;">${renderTextQueryFavoriteCard(query)}</div>
                    <div style="color:#64748b;margin-top:5px;">📝 بحث نصي</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}">🔍 Google</a>
                        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}">📍 خرائط</a>
                        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ YouTube</a>
                    </div>
                </div>`);
        }
    } catch (error) {
        console.warn('تعذر إنشاء بطاقة البحث النصي:', error);
    }
    updateStatus('ℹ️ لم توجد مطابقة؛ تم إبقاء بطاقة البحث النصي للكلمة المطلوبة.','#64748b');
}
function renderWikipediaResults(results,query,isMore=false){if(!results?.length)return;let html='';if(!isMore)html+=buildAdvancedCategoryPanel();results.forEach(item=>{const index=allLinksData.length;allLinksData.push({query:item.title,links:null,type:'ويكيبيديا',name:item.title});const wc=item.wordcount?`📝 ${Number(item.wordcount).toLocaleString()} كلمة`:'';html+=`<div class="card" style="${cardStyle()}"><div style="text-align:left;margin-bottom:7px;">${favoriteButton({type:'ويكيبيديا',name:item.title,query:item.title,url:item.url})}</div><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:17px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span><span style="color:#64748b;margin-right:7px;font-size:13px;">📖 ويكيبيديا</span>${wc?`<span style="color:#94a3b8;font-size:11px;margin-right:5px;">${wc}</span>`:''}</div></div><p style="margin:0 0 9px;color:#64748b;font-size:13px;line-height:1.5;">${escapeHtml(item.snippet||'')}</p>${buttonsHtml(item.title,index,item.title,item.url)}</div>`;});if(!isMore)html+=`<div style="text-align:center;margin:14px 0;"><button type="button" onclick="loadMoreWikipedia()" style="padding:10px 24px;background:#3b82f6;color:white;border:0;border-radius:8px;cursor:pointer;">📚 تحميل 10 نتائج إضافية</button></div>`;resultsDiv.insertAdjacentHTML('beforeend',html);}
window.toggleLinks=function(index){
    const data=allLinksData[Number(index)];
    const container=document.getElementById('links-'+Number(index));
    if(!data||!container)return;
    if(!Array.isArray(data.links)||data.links.length===0){
        data.links=typeof generateAllLinks==='function'?generateAllLinks(data.query):[];
    }
    const grid=container.querySelector('.links-grid');
    if(grid&&!grid.children.length){
        grid.innerHTML=data.links.map(link=>`<a class="advanced-result-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link.url)}" style="display:block;padding:7px 9px;border-radius:7px;background:#fff;border:1px solid #e2e8f0;text-decoration:none;color:#334155;font-size:12px;line-height:1.35;"><span style="font-weight:700;">${escapeHtml(String(link.id))}. ${escapeHtml(link.name)}</span></a>`).join('');
    }
    container.style.display=container.style.display==='none'?'block':'none';
};
window.selectCity=function(name){
    searchInput.value=String(name||'');
    if(suggestionsDiv)suggestionsDiv.style.display='none';
    if(typeof handleSearch==='function')handleSearch();
};
window.showCountryCityPrompt=async function(query,onContinue){
    const text=String(query||'').trim();
    if(!text){ onContinue?.(); return; }
    const normalized=normalizeText(text);
    const country=(Array.isArray(countries)?countries:[]).find(c=>{
        const names=[c.name,c.name_ar,c.code,c.iso2,c.iso3].filter(Boolean).map(normalizeText);
        return names.includes(normalized);
    });
    if(!country){ onContinue?.(); return; }
    const code=String(country.code||'').toUpperCase();
    let cities=[];
    try{
        if(typeof countryCitiesCache!=='undefined' && countryCitiesCache.has(code)){
            cities=countryCitiesCache.get(code)||[];
        }else if(typeof loadCountryCities==='function'){
            cities=await loadCountryCities(code);
            if(typeof countryCitiesCache!=='undefined') countryCitiesCache.set(code,cities);
        }
        if(typeof sortCitiesForCountry==='function') cities=sortCitiesForCountry(cities,code);
    }catch(error){ console.warn('تعذر تحميل مدن الدولة:',error); }
    const featured=(cities||[]).slice(0,8);
    if(!featured.length){ onContinue?.(); return; }
    const host=ensureSearchAdvancedPrompt();
    if(!host){ onContinue?.(); return; }
    host.innerHTML='<div class="search-advanced-prompt-inner"><div class="search-advanced-prompt-title"><span>🏙️</span><div><strong>اختر مدينة من '+escapeHtml(country.name_ar||country.name||text)+'</strong><small>اختر المدينة أولاً، ثم ستظهر لك فلترة البحث المتقدم</small></div></div><div class="city-choice-grid">'+featured.map((city,i)=>{
        const name=city.city||city.name||city.city_ar||'مدينة';
        const ar=city.city_ar&&city.city_ar!==name?' ('+escapeHtml(city.city_ar)+')':'';
        return '<button type="button" class="city-choice-btn" data-city-index="'+i+'">🏙️ '+escapeHtml(name)+ar+'</button>';
    }).join('')+'</div><div class="search-advanced-prompt-actions"><button type="button" class="search-advanced-skip" id="country-city-skip">▶️ بحث الدولة في YouTube</button></div></div>';
    host.style.display='block';
    host.querySelectorAll('.city-choice-btn').forEach(button=>{
        button.onclick=()=>{
            const city=featured[Number(button.dataset.cityIndex)];
            if(!city)return;
            const cityQuery=[city.city,city.city_ar,country.name,country.name_ar].filter(Boolean).join(' ');
            searchInput.value=cityQuery;
            host.style.display='none';
            onContinue?.();
        };
    });
    host.querySelector('#country-city-skip').onclick=()=>{
        selectedAdvancedCategory=0;
        try{localStorage.setItem('tuursim53_advanced_category','0');}catch(_){}
        host.style.display='none';
        onContinue?.();
    };
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
