// ============================================================
// 04-ui.js - واجهة البحث المتقدم السريعة
// ============================================================
let selectedAdvancedCategory = 0;

function ensureAdvancedCategoryStyles() {
    if (document.getElementById('advanced-category-styles')) return;
    const style = document.createElement('style');
    style.id = 'advanced-category-styles';
    style.textContent = `
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
function cardStyle(){return 'background:white;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);contain:content;content-visibility:auto;';}
function linkCount(){return typeof getAdvancedLinksCount==='function'?getAdvancedLinksCount():48;}
function getCategoryName(index=selectedAdvancedCategory){return typeof getAdvancedLinkName==='function'?getAdvancedLinkName(index):'📺 البحث العادي';}
function getCategoryUrl(query,index=selectedAdvancedCategory){return typeof generateAdvancedLink==='function'?generateAdvancedLink(query,index):`https://www.youtube.com/results?search_query=${encodeURIComponent(query||'')}`;}
function buildAdvancedCategoryPanel(){ensureAdvancedCategoryStyles();const categories=typeof getAdvancedSearches==='function'?getAdvancedSearches():[];const groups={};categories.forEach(item=>{const group=item.group||'تصنيفات أخرى';if(!groups[group])groups[group]=[];groups[group].push(item);});const groupLabels={'أساسي':'📺 البحث الأساسي','الترتيب':'🔥 الترتيب والفرز','التاريخ':'📅 حسب التاريخ','المدة':'⏱ حسب مدة الفيديو','الجودة':'🎥 الجودة والمشاهدة','مركب':'🧩 تصنيفات مركبة','نوع المحتوى':'🎬 نوع المحتوى','منصات':'🌐 المنصات والبحث الخارجي','قنوات محددة':'📺 القنوات المحددة'};const options=Object.entries(groups).map(([group,items])=>`<optgroup label="${escapeHtml(groupLabels[group]||group)}">${items.map(item=>`<option value="${item.index}" ${item.index===selectedAdvancedCategory?'selected':''}>${escapeHtml(item.name)}</option>`).join('')}</optgroup>`).join('');return `<section class="advanced-category-panel" aria-label="اختيار تصنيف البحث المتقدم"><div class="advanced-category-heading"><div class="advanced-category-icon">⚡</div><div class="advanced-category-title-wrap"><h3>البحث المتقدم</h3><p>اختر نوع البحث الذي تريد استخدامه مع المدينة أو الدولة.</p></div><span class="advanced-category-count">48 تصنيف</span></div><label class="advanced-category-label" for="advanced-category-select">اختر التصنيف</label><div class="advanced-category-select-wrap"><select id="advanced-category-select" onchange="changeAdvancedCategory(this.value)" aria-describedby="advanced-category-help">${options}</select><span class="advanced-category-chevron" aria-hidden="true">⌄</span></div><div id="advanced-category-help" class="advanced-category-help"><span>✓ التصنيف المختار:</span><strong>${escapeHtml(getCategoryName())}</strong></div></section>`;}
window.changeAdvancedCategory=function(value){selectedAdvancedCategory=Number(value)||0;const label=document.querySelector('#advanced-category-help strong');if(label)label.textContent=getCategoryName();document.querySelectorAll('.advanced-category-link').forEach(link=>{const query=link.dataset.query||'';link.href=getCategoryUrl(query,selectedAdvancedCategory);const text=link.querySelector('.advanced-category-link-text');if(text)text.textContent=`⚡ ${getCategoryName()}`;});};
function buttonsHtml(query,index,mapsQuery=query,wikiUrl=''){
    const advancedUrl=getCategoryUrl(query);
    const safeIndex=Number.isInteger(Number(index))?Number(index):0;
    const linksId='links-'+safeIndex;
    return `<div class="btn-group" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <a class="btn btn-maps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}">📍 خرائط</a>
        <a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(query)}">🔍 Google</a>
        <a class="btn btn-yt" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ YouTube</a>
        ${wikiUrl?`<a class="btn btn-wiki" target="_blank" rel="noopener noreferrer" href="${escapeHtml(wikiUrl)}">📖 Wiki</a>`:''}
        <a class="btn btn-secondary advanced-category-link" data-query="${escapeHtml(query)}" target="_blank" rel="noopener noreferrer" href="${advancedUrl}"><span class="advanced-category-link-text">⚡ ${escapeHtml(getCategoryName())}</span></a>
        <button class="btn btn-secondary advanced-links-toggle" type="button" onclick="toggleLinks(${safeIndex})">📋 عرض الروابط (${linkCount()})</button>
    </div>
    <div class="all-links-container" id="${linksId}" data-link-index="${safeIndex}" style="display:none;margin:4px 0 10px;padding:10px;background:#f8fafc;border-radius:8px;">
        <div class="links-stats" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;">
            <span>📌 ${linkCount()} رابط بحث متقدم</span><span>للبحث عن: ${escapeHtml(query)}</span>
        </div>
        <div class="links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;"></div>
    </div>`;
}
function renderResults({cities=[],countries=[]}){resultsDiv.innerHTML='';allLinksData=[];if(!cities.length&&!countries.length)return renderEmptySearch();const parts=[buildAdvancedCategoryPanel()];parts.push(`<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;"><button type="button" onclick="searchOnlyWikipedia()" style="padding:10px 20px;background:#3b82f6;color:white;border:0;border-radius:9px;cursor:pointer;">📖 بحث في ويكيبيديا</button><button type="button" onclick="searchAllWikipedia()" style="padding:10px 20px;background:#8b5cf6;color:white;border:0;border-radius:9px;cursor:pointer;">🔍 بحث موسع</button></div>`);let total=0;if(countries.length){parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🌍 دول (${countries.length})</h3></div>`);total+=countries.length;countries.forEach(c=>{const name=c.name||'',nameAr=c.name_ar||'',capital=c.capital||'';const query=[name,nameAr].filter(Boolean).join(' ');const index=allLinksData.length;allLinksData.push({query,links:null,type:'دولة',name});parts.push(`<div class="card" style="${cardStyle()}"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(name)}</span><span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(nameAr||name)}</span></div></div>${capital?`<div style="font-size:13px;color:#475569;margin-bottom:7px;">🏛️ العاصمة: ${escapeHtml(capital)}</div>`:''}${buttonsHtml(query,index,name)}</div>`);});}if(cities.length){parts.push(`<div style="margin:10px 0 7px;padding:7px 14px;background:#f1f5f9;border-radius:10px;"><h3 style="font-size:15px;color:#1e293b;margin:0;">🏙️ مدن (${cities.length})</h3></div>`);total+=cities.length;cities.forEach(c=>{const city=c.city||'',cityAr=c.city_ar||'',country=c.country||'',countryAr=c.country_ar||'';const population=c.population||'';const query=[city,cityAr,country,countryAr].filter(Boolean).join(' ');const index=allLinksData.length;allLinksData.push({query,links:null,type:'مدينة',name:city});parts.push(`<div class="card" style="${cardStyle()}"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(city)}</span>${cityAr?`<span style="color:#64748b;font-size:15px;margin-right:4px;">(${escapeHtml(cityAr)})</span>`:''}<span class="country-name" style="color:#64748b;margin-right:8px;">${escapeHtml(country)}</span>${countryAr?`<span style="color:#64748b;">(${escapeHtml(countryAr)})</span>`:''}</div></div>${population?`<div style="font-size:12px;color:#94a3b8;margin-bottom:7px;">👥 ${Number(population).toLocaleString()}</div>`:''}${buttonsHtml(query,index,city)}<div class="seo-tags" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;"><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السياحة في '+city+' '+country)}">🌍 السياحة</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('فنادق '+city+' '+country)}">🏨 فنادق</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('مطاعم '+city+' '+country)}">🍽️ مطاعم</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('معالم سياحية '+city+' '+country)}">🏛️ معالم</a><a class="btn btn-google" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent('السفر إلى '+city+' '+country)}">✈️ السفر</a></div></div>`);});}resultsDiv.innerHTML=parts.join('');countSpan.textContent=total;}
function renderEmptySearch(){
    const query=searchInput.value.trim();
    if(!query){
        resultsDiv.innerHTML=`<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;margin-bottom:12px;">🔍</div><h3>ابحث عن مدينة أو دولة</h3><p style="color:#94a3b8;margin-top:7px;">${allCities.length.toLocaleString()} مدينة متاحة للبحث</p></div></div>`;
        countSpan.textContent='0';
        return;
    }
    resultsDiv.innerHTML=`<div class="card no-results"><div style="text-align:center;padding:30px;"><div style="font-size:44px;margin-bottom:12px;">🔍</div><h3>لا توجد نتائج محلية</h3><p style="color:#94a3b8;">يمكنك استخدام زر ويكيبيديا للبحث الخارجي.</p></div></div>`;
    countSpan.textContent='0';
    updateStatus('ℹ️ لا توجد نتائج محلية؛ ويكيبيديا متاحة بشكل منفصل.','#64748b');
}
function renderWikipediaResults(results,query,isMore=false){if(!results?.length)return;let html='';if(!isMore)html+=buildAdvancedCategoryPanel();results.forEach(item=>{const index=allLinksData.length;allLinksData.push({query:item.title,links:null,type:'ويكيبيديا',name:item.title});const wc=item.wordcount?`📝 ${Number(item.wordcount).toLocaleString()} كلمة`:'';html+=`<div class="card" style="${cardStyle()}"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;"><div><span class="city-name" style="font-size:17px;font-weight:bold;color:#1e293b;">${escapeHtml(item.title)}</span><span style="color:#64748b;margin-right:7px;font-size:13px;">📖 ويكيبيديا</span>${wc?`<span style="color:#94a3b8;font-size:11px;margin-right:5px;">${wc}</span>`:''}</div></div><p style="margin:0 0 9px;color:#64748b;font-size:13px;line-height:1.5;">${escapeHtml(item.snippet||'')}</p>${buttonsHtml(item.title,index,item.title,item.url)}</div>`;});if(!isMore)html+=`<div style="text-align:center;margin:14px 0;"><button type="button" onclick="loadMoreWikipedia()" style="padding:10px 24px;background:#3b82f6;color:white;border:0;border-radius:8px;cursor:pointer;">📚 تحميل 10 نتائج إضافية</button></div>`;resultsDiv.insertAdjacentHTML('beforeend',html);}
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
