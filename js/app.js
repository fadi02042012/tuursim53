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
// ترقيم النتائج: زر ثابت أعلى الشاشة وأسفلها لعرض 10 نتائج أخرى
// ============================================================
(() => {
    const PAGE_SIZE = 10;
    let state = { query:'', cursor:0, items:[], initialized:false, rendering:false };

    function ensurePaginationStyles() {
        if (document.getElementById('results-pagination-styles')) return;
        const style = document.createElement('style');
        style.id = 'results-pagination-styles';
        style.textContent = `
.results-pagination-bar{position:fixed;left:50%;transform:translateX(-50%);z-index:99999;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;width:max-content;max-width:calc(100vw - 24px);padding:8px 10px;margin:0;border-radius:16px;background:rgba(255,255,255,.96);border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,.16);backdrop-filter:blur(10px);direction:rtl;}
.results-pagination-bar.top{top:78px;}
.results-pagination-bar.bottom{bottom:14px;}
.results-next-btn{min-height:44px;padding:10px 20px;border:1px solid #c7d2fe;border-radius:999px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;font:700 14px "Segoe UI",Tahoma,Arial,sans-serif;cursor:pointer;box-shadow:0 7px 20px rgba(99,102,241,.22);transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;}
.results-next-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(99,102,241,.28);}
.results-next-btn:active{transform:translateY(0);}
.results-next-btn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none;}
.results-pagination-info{font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:7px 11px;white-space:nowrap;}
body.dark-mode .results-pagination-bar{background:rgba(15,23,42,.96);border-color:#334155;}
body.dark-mode .results-pagination-info{background:#172033;border-color:#334155;color:#94a3b8;}
@media(max-width:600px){
.results-pagination-bar{width:calc(100vw - 16px);max-width:none;padding:7px 8px;border-radius:14px;gap:6px;}
.results-pagination-bar.top{top:62px;}
.results-pagination-bar.bottom{bottom:8px;}
.results-next-btn{flex:1;min-height:42px;font-size:13px;padding:9px 12px;}
.results-pagination-info{font-size:10px;padding:6px 8px;}
}
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
            const score=country=>{
                const names=[country.name,country.name_ar,country.capital,country.capital_ar].filter(Boolean).map(v=>typeof normalizeText==='function'?normalizeText(v):String(v).toLowerCase());
                return names.some(n=>n===q)?3:names.some(n=>n.startsWith(q))?2:1;
            };
            return score(b)-score(a);
        });
        return { countries:countryMatches, cities:rankedCities };
    }

    function flatten(groups){
        return [
            ...groups.countries.map(data=>({type:'country',data})),
            ...groups.cities.map(data=>({type:'city',data}))
        ];
    }
    function split(items){
        return {
            countries:items.filter(item=>item.type==='country').map(item=>item.data),
            cities:items.filter(item=>item.type==='city').map(item=>item.data)
        };
    }

    function removePaginationButtons(){
        document.querySelectorAll('.results-pagination-bar').forEach(el=>el.remove());
    }

    function addPaginationButtons(total,cursor){
        ensurePaginationStyles();
        removePaginationButtons();
        if(!total || cursor>=total) return;

        const createBar=(position)=>{
            const el=document.createElement('div');
            el.className=`results-pagination-bar ${position}`;
            el.setAttribute('role','navigation');
            el.setAttribute('aria-label','عرض النتائج التالية');
            el.innerHTML=`<button type="button" class="results-next-btn">⬇️ عرض الـ10 نتائج التالية</button><span class="results-pagination-info">تم عرض ${Math.min(cursor,total)} من ${total} • متبقٍ ${total-cursor}</span>`;
            el.querySelector('button').addEventListener('click',loadNextPage);
            document.body.appendChild(el);
        };

        // الزران خارج #results حتى لا يختفيا عندما تقوم renderResults بإعادة بناء النتائج.
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
        } finally { state.rendering=false; }
    }

    async function resetPagination(){
        removePaginationButtons();
        const query=typeof searchInput!=='undefined'&&searchInput?searchInput.value.trim():'';
        state={query,cursor:0,items:[],initialized:false,rendering:false};
        try{
            const groups=await collectAllMatches(query);
            state.items=flatten(groups);
            // البحث الحالي يعرض 20 عنصرًا عند وجود استعلام (10 دول + 10 مدن)، والفارغ يعرض 10 مدن.
            const initial=query?Math.min(PAGE_SIZE*2,state.items.length):Math.min(PAGE_SIZE,state.items.length);
            state.cursor=initial;
            state.initialized=true;
            if(initial && state.items.length>initial) setTimeout(()=>addPaginationButtons(state.items.length,state.cursor),120);
        }catch(error){ console.warn('تعذر تجهيز ترقيم النتائج:',error); }
    }

    document.addEventListener('click',event=>{
        const target=event.target.closest?.('#searchBtn,.google-search-icon');
        if(target) setTimeout(resetPagination,350);
    });
    document.addEventListener('keydown',event=>{
        if(event.key==='Enter' && event.target?.id==='search') setTimeout(resetPagination,350);
    });
})();

console.log('✅ تم تحميل التطبيق بنجاح');
console.log(`📊 عدد روابط YouTube: ${searches.length}`);
console.log('📁 يبحث في ملفات JSON الموجودة في مجلد output/');
console.log('📂 هيكل الملفات:');
console.log('   - output/countries.json');
console.log('   - output/cities.json (اختياري)');
console.log('   - output/by_country/*.json (لكل دولة)');
console.log('📖 تم إضافة البحث المتقدم في ويكيبيديا العربية مع دعم ترقيم الصفحات');
console.log('📊 عرض النتائج على دفعات: 10 نتائج إضافية');
console.log('📌 أزرار التالي ثابتة أعلى وأسفل الشاشة');
console.log('📋 تم ترتيب الروابط بشكل منطقي حسب الفئات المختلفة');
console.log('🛡️ الحماية الفعلية: تهريب HTML (XSS) + noopener/noreferrer + anti-clickjacking');
console.log('🚀 ابدأ البحث الآن!');
