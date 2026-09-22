// صورة/إعلان الصفحة الرئيسية — منفصل تمامًا عن منطق البحث.
(function(){
  const CONFIG_URL='/api/ad-config';
  let promoLoaded=false;

  function hidePromo(){
    const el=document.getElementById('promoPanel');
    if(el) el.hidden=true;
  }
  function showPromo(config){
    const el=document.getElementById('promoPanel');
    if(!el || !config || !config.enabled || !config.imageUrl) return;
    const img=document.getElementById('promoImage');
    const link=document.getElementById('promoLink');
    if(!img || !link) return;
    img.src=config.imageUrl;
    link.href=config.targetUrl||'#';
    link.style.pointerEvents=config.targetUrl?'auto':'none';
    el.hidden=false;
  }

  window.loadPromoPanel=function(){
    if(promoLoaded)return;
    promoLoaded=true;
    fetch(CONFIG_URL,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>showPromo(data&&data.config))
      .catch(()=>{});
  };

  // تحميل خفيف بعد استقرار الواجهة، ولا يتدخل في البحث.
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(window.loadPromoPanel,0),{once:true});
  else setTimeout(window.loadPromoPanel,0);

  window.hidePromoPanel=hidePromo;
})();
