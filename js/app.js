// ============================================================
// app.js - الملف الرئيسي
// ============================================================
const compactResultCardStyle=document.createElement('style');
compactResultCardStyle.id='compact-result-card-style';
compactResultCardStyle.textContent='#results .card{height:auto!important;min-height:0!important;padding:0!important;margin:0!important;border-radius:0!important;box-shadow:none!important;line-height:1.2!important}#results .card>*{margin-top:0!important;margin-bottom:0!important}#results .card .btn-group,#results .card .seo-tags{gap:4px!important}#results .card .all-links-container{padding:0!important}#showMoreResultsBtn{display:none!important}';
document.head.appendChild(compactResultCardStyle);

(async()=>{try{if(window.uiReadyPromise)await window.uiReadyPromise;await loadData();}catch(e){console.error('تعذر تهيئة التطبيق:',e);}})();

(()=>{
 const PAGE_SIZE=10;
 let state={query:'',cursor:0,items:[],rendering:false};
 let internalRender=false,refreshTimer=null,installed=false,sideButton=null;
 function ensureSideButton(){
  const box=document.querySelector('.floating-buttons'); if(!box)return null;
  sideButton=document.getElementById('nextResultsSideBtn')||sideButton;
  if(!sideButton){sideButton=document.createElement('button');sideButton.id='nextResultsSideBtn';sideButton.type='button';sideButton.textContent='⬇️';box.insertBefore(sideButton,box.firstChild);}
  sideButton.title='عرض 10 نتائج أخرى';sideButton.setAttribute('aria-label','عرض 10 نتائج أخرى');sideButton.onclick=loadNextPage;
  return sideButton;
 }
 function findMatches(source,text,variants){
  const cityMatches=source.filter(c=>{const value=[c.city,c.city_ar,c.country,c.country_ar,c.region,c.code,c.id,c.iso2,c.iso3,c.name].filter(v=>v!==undefined&&v!==null).join(' ');return typeof matchesAnyVariant==='function'?matchesAnyVariant(value,variants):false;});
  const cities=typeof removeDuplicates==='function'?removeDuplicates(cityMatches):cityMatches;
  const rankedCities=typeof sortCitiesByRelevance==='function'?sortCitiesByRelevance(cities,text):cities;
  const countryMatches=countries.filter(c=>{const value=[c.name,c.name_ar,c.capital,c.capital_ar,c.code,c.iso2,c.iso3,c.id].filter(v=>v!==undefined&&v!==null).join(' ');return typeof matchesAnyVariant==='function'?matchesAnyVariant(value,variants):false;});
  return{countries:countryMatches,cities:rankedCities};
 }
 async function collectAllMatches(query){
  const text=String(query||'').trim();const source=currentCountryCities.length?currentCountryCities:allCities;
  if(!text)return{countries:[],cities:source.slice()};
  const variants=[...new Set([text,typeof normalizeText==='function'?normalizeText(text):text.toLowerCase()])];
  return findMatches(source,text,variants);
 }
 function flatten(g){return[...g.countries.map(data=>({type:'country',data})),...g.cities.map(data=>({type:'city',data}))];}
 function split(items){return{countries:items.filter(x=>x.type==='country').map(x=>x.data),cities:items.filter(x=>x.type==='city').map(x=>x.data)};}
 function sync(total,cursor){const b=ensureSideButton();if(!b)return;const r=Math.max(0,total-cursor);b.disabled=!r;b.style.opacity=r?'1':'.45';b.style.cursor=r?'pointer':'not-allowed';b.title=r?`عرض 10 نتائج أخرى • المتبقي ${r}`:'لا توجد نتائج إضافية';b.setAttribute('aria-label',b.title);}
 async function refreshPagination(){if(internalRender)return;const q=searchInput?.value.trim()||'';const groups=await collectAllMatches(q);state.query=q;state.items=flatten(groups);state.cursor=Math.min(q?PAGE_SIZE*2:PAGE_SIZE,state.items.length);sync(state.items.length,state.cursor);}
 async function loadNextPage(){if(state.rendering)return;if(!state.items.length){await refreshPagination();return;}if(state.cursor>=state.items.length)return;state.rendering=true;try{internalRender=true;renderResults(split(state.items.slice(0,Math.min(state.cursor+PAGE_SIZE,state.items.length))));if(state.query&&typeof prependTextQueryCard==='function')prependTextQueryCard(state.query);state.cursor=Math.min(state.cursor+PAGE_SIZE,state.items.length);}catch(e){console.error('خطأ في عرض الدفعة التالية:',e);}finally{internalRender=false;state.rendering=false;}sync(state.items.length,state.cursor);if(typeof updateFavoriteButtons==='function')updateFavoriteButtons();}
 function installHook(){if(installed||typeof window.renderResults!=='function')return;installed=true;const original=window.renderResults;window.renderResults=function(groups){const result=original(groups);if(!internalRender){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshPagination().catch(console.warn),60);}return result;};}
 window.refreshResultsPagination=refreshPagination;window.clearResultsPagination=()=>{state={query:'',cursor:0,items:[],rendering:false};sync(0,0);};window.loadNextResultsPage=loadNextPage;
 ensureSideButton();installHook();setTimeout(installHook,100);setTimeout(()=>refreshPagination().catch(console.warn),200);
})();
console.log('✅ تم تحميل التطبيق بنجاح بدون تعطيل الصفحة');
