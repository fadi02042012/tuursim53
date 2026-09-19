// ============================================================
// app.js - التهيئة والترقيم بدون طلبات شبكة إضافية
// ============================================================
const compactResultCardStyle=document.createElement('style');
compactResultCardStyle.id='compact-result-card-style';
compactResultCardStyle.textContent='#results .card{height:auto!important;min-height:0!important}';
document.head.appendChild(compactResultCardStyle);

(async()=>{
  try {
    if (window.uiReadyPromise) await window.uiReadyPromise;
    await loadData();
  } catch(e) {
    console.error('تعذر تهيئة التطبيق:',e);
  }
})();

(()=>{
 const PAGE_SIZE=10;
 let state={query:'',cursor:0,items:[],rendering:false};
 let sideButton=null;

 function ensureSideButton(){
  const box=document.querySelector('.floating-buttons');
  if(!box)return null;
  sideButton=document.getElementById('nextResultsSideBtn')||sideButton;
  if(!sideButton){
   sideButton=document.createElement('button');
   sideButton.id='nextResultsSideBtn';
   sideButton.type='button';
   box.insertBefore(sideButton,box.firstChild);
  }
  sideButton.textContent='⬇️';
  sideButton.title='عرض 10 نتائج أخرى';
  sideButton.setAttribute('aria-label','عرض 10 نتائج أخرى');
  sideButton.onclick=loadNextPage;
  return sideButton;
 }

 function findMatches(source,text,variants){
  const cityMatches=source.filter(c=>{
   const value=[c.city,c.city_ar,c.country,c.country_ar,c.region,c.code,c.id,c.iso2,c.iso3,c.name].filter(v=>v!=null).join(' ');
   return typeof matchesAnyVariant==='function'&&matchesAnyVariant(value,variants);
  });
  const cities=typeof removeDuplicates==='function'?removeDuplicates(cityMatches):cityMatches;
  const rankedCities=typeof sortCitiesByRelevance==='function'?sortCitiesByRelevance(cities,text):cities;
  const countryMatches=countries.filter(c=>{
   const value=[c.name,c.name_ar,c.capital,c.capital_ar,c.code,c.iso2,c.iso3,c.id].filter(v=>v!=null).join(' ');
   return typeof matchesAnyVariant==='function'&&matchesAnyVariant(value,variants);
  });
  return {countries:countryMatches,cities:rankedCities};
 }

 function collectAllMatches(query){
  const text=String(query||'').trim();

  // عند عرض مدن دولة بدون بحث نصي، استخدم القائمة المعروضة فعلياً
  // حتى يحافظ زر الشريط الجانبي على ترتيب العاصمة/الأشهر/الأكبر/A-Z.
  if(!text && Array.isArray(currentFullResults) && currentFullResults.length){
    return {countries:[],cities:currentFullResults.slice()};
  }

  const source=currentCountryCities.length?currentCountryCities:allCities;
  if(!text)return {countries:[],cities:source.slice()};
  const variants=[...new Set([text,typeof normalizeText==='function'?normalizeText(text):text.toLowerCase()])];
  return findMatches(source,text,variants);
 }

 function flatten(g){
  return [...g.countries.map(data=>({type:'country',data})),...g.cities.map(data=>({type:'city',data}))];
 }
 function split(items){
  return {countries:items.filter(x=>x.type==='country').map(x=>x.data),cities:items.filter(x=>x.type==='city').map(x=>x.data)};
 }
 function sync(total,cursor){
  const b=ensureSideButton(); if(!b)return;
  const remaining=Math.max(0,total-cursor);
  b.disabled=!remaining;
  b.style.opacity=remaining?'1':'.45';
  b.style.cursor=remaining?'pointer':'not-allowed';
  b.title=remaining?'عرض 10 نتائج أخرى • المتبقي '+remaining:'لا توجد نتائج إضافية';
  b.setAttribute('aria-label',b.title);
 }

 function refreshPagination(){
  const q=searchInput?.value.trim()||'';
  const groups=collectAllMatches(q);
  state.query=q;
  state.items=flatten(groups);
  state.cursor=Math.min(PAGE_SIZE,state.items.length);
  sync(state.items.length,state.cursor);
 }

 function loadNextPage(){
  if(state.rendering)return;
  if(!state.items.length){refreshPagination();if(!state.items.length)return;}
  if(state.cursor>=state.items.length)return;
  state.rendering=true;
  try{
   const next=Math.min(state.cursor+PAGE_SIZE,state.items.length);
   renderResults(split(state.items.slice(0,next)));
   if(state.query&&typeof prependTextQueryCard==='function')prependTextQueryCard(state.query);
   state.cursor=next;
  }catch(e){console.error('خطأ في عرض الدفعة التالية:',e);}
  finally{state.rendering=false;}
  sync(state.items.length,state.cursor);
  if(typeof updateFavoriteButtons==='function')updateFavoriteButtons();
 }

 window.refreshResultsPagination=refreshPagination;
 window.clearResultsPagination=()=>{state={query:'',cursor:0,items:[],rendering:false};sync(0,0);};
 window.loadNextResultsPage=loadNextPage;
 ensureSideButton();
 refreshPagination();
})();
console.log('✅ تم تحميل التطبيق بنجاح — لا توجد مهام ترقيم مؤجلة');
