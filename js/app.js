// ============================================================
// app.js - الملف الرئيسي
// ============================================================

const compactResultCardStyle = document.createElement('style');
compactResultCardStyle.id = 'compact-result-card-style';
compactResultCardStyle.textContent = `
#results .card { height:auto!important;min-height:0!important;padding:0!important;margin:0!important;border-radius:0!important;box-shadow:none!important;line-height:1.2!important; }
#results .card>* { margin-top:0!important;margin-bottom:0!important; }
#results .card .card-header,#results .card .btn-group,#results .card .seo-tags,#results .card .all-links-container { margin-top:0!important;margin-bottom:0!important; }
#results .card .btn-group,#results .card .seo-tags { gap:4px!important; }
#results .card .btn-group .btn,#results .card .seo-tags .btn { line-height:1.15!important; }
#results .card .seo-tags { padding:0!important;line-height:1.1!important; }
#results .card .all-links-container { padding:0!important; }
#showMoreResultsBtn { display:none!important; }
`;
document.head.appendChild(compactResultCardStyle);

loadData();

// ============================================================
// ترقيم النتائج: زر واحد صغير ثابت في الشريط الجانبي
// ============================================================
(() => {
    const PAGE_SIZE = 10;
    let state = { query:'', cursor:0, items:[], rendering:false };
    let internalRender = false;
    let refreshTimer = null;
    let installed = false;
    let sideButton = null;

    function ensureSideButton(){
        if(sideButton && document.body.contains(sideButton)) return sideButton;
        const container=document.querySelector('.floating-buttons');
        if(!container) return null;
        sideButton=document.getElementById('nextResultsSideBtn');
        if(!sideButton){
            sideButton=document.createElement('button');
            sideButton.id='nextResultsSideBtn';
            sideButton.type='button';
            sideButton.title='عرض 10 نتائج أخرى';
            sideButton.setAttribute('aria-label','عرض 10 نتائج أخرى');
            sideButton.textContent='⬇️';
            container.insertBefore(sideButton,container.firstChild);
        }
        sideButton.style.cssText='width:40px;height:40px;padding:0;border:1px solid #e8e7f2;border-radius:50%;background:#fff;box-shadow:0 6px 18px rgba(79,70,120,.12);cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;';
        sideButton.onclick=()=>loadNextPage();
        return sideButton;
    }

    async function collectAllMatches(query) {
        const source = currentCountryCities.length ? currentCountryCities : allCities;
        const text = String(query || '').trim();
        if (!text) return { countries:[], cities:source.slice() };
        const variants = typeof buildQueryVariants === 'function' ? await buildQueryVariants(text) : [text];
        const cityMatches = source.filter(city => {
            const value=[city.city,city.city_ar,city.country,city.country_ar,city.region,city.code,city.id,city.iso2,city.iso3,city.name].filter(v=>v!==undefined&&v!==null).join(' ');
            return typeof matchesAnyVariant==='function' ? matchesAnyVariant(value,variants) : variants.some(v=>value.toLowerCase().includes(String(v).toLowerCase()));
        });
        const cities = typeof removeDuplicates==='function' ? removeDuplicates(cityMatches) : cityMatches;
        const rankedCities = typeof sortCitiesByRelevance==='function' ? sortCitiesByRelevance(cities,text) : cities;
        const countryMatches = countries.filter(country => {
            const value=[country.name,country.name_ar,country.capital,country.capital_ar,country.code,country.iso2,country.iso3,country.id].filter(v=>v!==undefined&&v!==null).join(' ');
            return typeof matchesAnyVariant==='function' ? matchesAnyVariant(value,variants) : variants.some(v=>value.toLowerCase().includes(String(v).toLowerCase()));
        });
        const q=typeof normalizeText==='function'?normalizeText(text):text.toLowerCase();
        countryMatches.sort((a,b)=>{
            const score=country=>{
                const names=[country.name,country.name_ar,country.capital,country.capital_ar].filter(Boolean).map(v=>typeof normalizeText==='function'?normalizeText(v):String(v).toLowerCase());
                return names.some(n=>n===q)?3:names.some(n=>n.startsWith(q))?2:1;
            };
            return score(b)-score(a);
        });
        return {countries:countryMatches,cities:rankedCities};
    }

    function flatten(groups){return [...groups.countries.map(data=>({type:'country',data})),...groups.cities.map(data=>({type:'city',data}))];}
    function split(items){return {countries:items.filter(x=>x.type==='country').map(x=>x.data),cities:items.filter(x=>x.type==='city').map(x=>x.data)};}

    function syncSideButton(total,cursor){
        const btn=ensureSideButton();
        if(!btn) return;
        const remaining=Math.max(0,total-cursor);
        btn.disabled=remaining===0;
        btn.title=remaining===0?'لا توجد نتائج إضافية':`عرض 10 نتائج أخرى • المتبقي ${remaining}`;
        btn.setAttribute('aria-label',btn.title);
        btn.textContent='⬇️';
        btn.style.opacity=remaining===0?'0.45':'1';
        btn.style.cursor=remaining===0?'not-allowed':'pointer';
    }

    async function refreshPagination(){
        if(internalRender) return;
        const query=typeof searchInput!=='undefined'&&searchInput?searchInput.value.trim():'';
        const groups=await collectAllMatches(query);
        state.query=query;
        state.items=flatten(groups);
        const initial=query?Math.min(PAGE_SIZE*2,state.items.length):Math.min(PAGE_SIZE,state.items.length);
        state.cursor=Math.min(initial,state.items.length);
        syncSideButton(state.items.length,state.cursor);
    }

    async function loadNextPage(){
        if(state.rendering) return;
        if(!state.items.length){await refreshPagination();return;}
        if(state.cursor>=state.items.length){return;}
        state.rendering=true;
        const nextCursor=Math.min(state.cursor+PAGE_SIZE,state.items.length);
        try{
            internalRender=true;
            renderResults(split(state.items.slice(0,nextCursor)));
            if(state.query&&typeof prependTextQueryCard==='function') prependTextQueryCard(state.query);
            state.cursor=nextCursor;
        }catch(error){console.error('خطأ في عرض الدفعة التالية:',error);}
        finally{internalRender=false;state.rendering=false;}
        syncSideButton(state.items.length,state.cursor);
        if(typeof updateFavoriteButtons==='function') updateFavoriteButtons();
        if(typeof updateSummaryStats==='function') updateSummaryStats();
        if(typeof updateStatus==='function') updateStatus(`📄 تم عرض ${state.cursor} من ${state.items.length} نتيجة`,'#10b981');
        if(typeof countSpan!=='undefined'&&countSpan) countSpan.textContent=String(state.cursor+(state.query?1:0));
    }

    function installRenderHook(){
        if(installed||typeof window.renderResults!=='function') return false;
        installed=true;
        const originalRenderResults=window.renderResults;
        window.renderResults=function(groups){
            const result=originalRenderResults(groups);
            if(!internalRender){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshPagination(),120);}
            return result;
        };
        return true;
    }

    window.refreshResultsPagination=refreshPagination;
    window.clearResultsPagination=()=>{};
    window.loadNextResultsPage=loadNextPage;

    ensureSideButton();
    installRenderHook();
    [0,200,600,1200,2500,5000].forEach(delay=>setTimeout(async()=>{
        installRenderHook();
        try{await refreshPagination();}catch(error){console.warn('تعذر تحديث ترقيم النتائج:',error);}
    },delay));

    console.log('✅ زر التالي الصغير مثبت في الشريط الجانبي');
})();

console.log('✅ تم تحميل التطبيق بنجاح');
console.log(`📊 عدد روابط YouTube: ${searches.length}`);
