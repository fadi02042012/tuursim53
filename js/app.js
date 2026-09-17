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
`;
document.head.appendChild(compactResultCardStyle);
loadData();

// ============================================================
// أزرار التالي الثابتة: 10 نتائج إضافية أعلى وأسفل الشاشة
// ============================================================
(() => {
    const PAGE_SIZE = 10;
    let state = { query:'', cursor:0, items:[], initialized:false, rendering:false };

    function ensurePaginationStyles() {
        if (document.getElementById('results-pagination-styles')) return;
        const style = document.createElement('style');
        style.id = 'results-pagination-styles';
        style.textContent = `
.results-pagination-bar{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;display:flex!important;justify-content:center!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;width:min(94vw,560px)!important;padding:8px 10px!important;margin:0!important;border-radius:16px!important;background:#fff!important;border:2px solid #6366f1!important;box-shadow:0 10px 35px rgba(15,23,42,.25)!important;direction:rtl!important;}
.results-pagination-bar.top{top:76px!important;}
.results-pagination-bar.bottom{bottom:12px!important;}
.results-next-btn{min-height:46px!important;padding:10px 24px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#4f46e5,#db2777)!important;color:#fff!important;font:800 15px "Segoe UI",Tahoma,Arial,sans-serif!important;cursor:pointer!important;box-shadow:0 6px 18px rgba(79,70,229,.35)!important;white-space:nowrap!important;}
.results-pagination-info{font-size:12px!important;color:#334155!important;background:#f1f5f9!important;border:1px solid #cbd5e1!important;border-radius:999px!important;padding:7px 11px!important;white-space:nowrap!important;font-weight:700!important;}
body.dark-mode .results-pagination-bar{background:#0f172a!important;border-color:#818cf8!important;}
body.dark-mode .results-pagination-info{background:#1e293b!important;border-color:#475569!important;color:#e2e8f0!important;}
@media(max-width:600px){.results-pagination-bar{width:calc(100vw - 12px)!important;padding:7px!important}.results-pagination-bar.top{top:60px!important}.results-pagination-bar.bottom{bottom:6px!important}.results-next-btn{width:100%!important;min-height:42px!important;font-size:13px!important}.results-pagination-info{font-size:10px!important}}
`;
        document.head.appendChild(style);
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
        const countryMatches=countries.filter(country=>{
            const value=[country.name,country.name_ar,country.capital,country.capital_ar,country.code,country.iso2,country.iso3,country.id].filter(v=>v!==undefined&&v!==null).join(' ');
            return typeof matchesAnyVariant==='function' ? matchesAnyVariant(value,variants) : variants.some(v=>value.toLowerCase().includes(String(v).toLowerCase()));
        });
        const q=typeof normalizeText==='function'?normalizeText(text):text.toLowerCase();
        countryMatches.sort((a,b)=>{
            const score=country=>{const names=[country.name,country.name_ar,country.capital,country.capital_ar].filter(Boolean).map(v=>typeof normalizeText==='function'?normalizeText(v):String(v).toLowerCase());return names.some(n=>n===q)?3:names.some(n=>n.startsWith(q))?2:1;};
            return score(b)-score(a);
        });
        return { countries:countryMatches, cities:rankedCities };
    }

    function flatten(groups){return [...groups.countries.map(data=>({type:'country',data})),...groups.cities.map(data=>({type:'city',data}))];}
    function split(items){return {countries:items.filter(x=>x.type==='country').map(x=>x.data),cities:items.filter(x=>x.type==='city').map(x=>x.data)};}
    function removePaginationButtons(){document.querySelectorAll('.results-pagination-bar').forEach(el=>el.remove());}

    function addPaginationButtons(total,cursor){
        ensurePaginationStyles();
        removePaginationButtons();
        if(!total || cursor>=total) return;
        const createBar=position=>{
            const el=document.createElement('div');
            el.className=`results-pagination-bar ${position}`;
            el.innerHTML=`<button type="button" class="results-next-btn">⬇️ التالي — عرض 10 نتائج أخرى</button><span class="results-pagination-info">تم عرض ${Math.min(cursor,total)} من ${total} • المتبقي ${total-cursor}</span>`;
            el.querySelector('.results-next-btn').onclick=loadNextPage;
            document.body.appendChild(el);
        };
        createBar('top');
        createBar('bottom');
    }

    async function loadNextPage(){
        if(state.rendering || state.cursor>=state.items.length) return;
        state.rendering=true;
        const nextCursor=Math.min(state.cursor+PAGE_SIZE,state.items.length);
        try{
            const groups=split(state.items.slice(0,nextCursor));
            renderResults(groups);
            if(state.query && (groups.cities.length||groups.countries.length) && typeof prependTextQueryCard==='function') prependTextQueryCard(state.query);
            state.cursor=nextCursor;
            addPaginationButtons(state.items.length,state.cursor);
            if(typeof updateFavoriteButtons==='function') updateFavoriteButtons();
            if(typeof updateSummaryStats==='function') updateSummaryStats();
            if(typeof updateStatus==='function') updateStatus(`📄 تم عرض ${state.cursor} من ${state.items.length} نتيجة`,'#10b981');
            if(typeof countSpan!=='undefined' && countSpan) countSpan.textContent=String(state.cursor+(state.query?1:0));
        } finally {state.rendering=false;}
    }

    async function resetPagination(){
        removePaginationButtons();
        const query=typeof searchInput!=='undefined'&&searchInput?searchInput.value.trim():'';
        state={query,cursor:0,items:[],initialized:false,rendering:false};
        try{
            const groups=await collectAllMatches(query);
            state.items=flatten(groups);
            const initial=query?Math.min(PAGE_SIZE*2,state.items.length):Math.min(PAGE_SIZE,state.items.length);
            state.cursor=initial;
            state.initialized=true;
            if(initial && state.items.length>initial) setTimeout(()=>addPaginationButtons(state.items.length,state.cursor),700);
        }catch(error){console.warn('تعذر تجهيز أزرار التالي:',error);}
    }

    document.addEventListener('click',event=>{const target=event.target.closest?.('#searchBtn,.google-search-icon');if(target)setTimeout(resetPagination,700);});
    document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target?.id==='search')setTimeout(resetPagination,700);});
})();

console.log('✅ تم تحميل التطبيق بنجاح');
console.log(`📊 عدد روابط YouTube: ${searches.length}`);
console.log('📌 أزرار التالي ثابتة أعلى وأسفل الشاشة - 10 نتائج إضافية');
