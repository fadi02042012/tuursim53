// ============================================================
// app.js - الملف الرئيسي
// ============================================================

// ضغط ارتفاع بطاقات النتائج: المحتوى فقط بدون فراغات زائدة
const compactResultCardStyle = document.createElement('style');
compactResultCardStyle.id = 'compact-result-card-style';
compactResultCardStyle.textContent = `
#results .card {
    height: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    line-height: 1.2 !important;
}
#results .card > * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}
#results .card .card-header,
#results .card .btn-group,
#results .card .seo-tags,
#results .card .all-links-container {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}
#results .card .btn-group,
#results .card .seo-tags {
    gap: 4px !important;
}
#results .card .btn-group .btn,
#results .card .seo-tags .btn {
    line-height: 1.15 !important;
}
#results .card .seo-tags {
    padding: 0 !important;
    line-height: 1.1 !important;
}
#results .card .all-links-container {
    padding: 0 !important;
}
`;
document.head.appendChild(compactResultCardStyle);

// يتم تحميل البيانات تلقائياً عند بدء التشغيل
loadData();

console.log('✅ تم تحميل التطبيق بنجاح');
console.log(`📊 عدد روابط YouTube: ${searches.length}`);
console.log('📁 يبحث في ملفات JSON الموجودة في مجلد output/');
console.log('📂 هيكل الملفات:');
console.log('   - output/countries.json');
console.log('   - output/cities.json (اختياري)');
console.log('   - output/by_country/*.json (لكل دولة)');
console.log('📖 تم إضافة البحث المتقدم في ويكيبيديا العربية مع دعم ترقيم الصفحات');
console.log('📊 عرض 100 نتيجة افتراضياً');
console.log('📋 تم ترتيب 51 رابطاً بشكل منطقي حسب 12 فئة مختلفة');
console.log('🛡️ الحماية الفعلية: تهريب HTML (XSS) + noopener/noreferrer + anti-clickjacking');
console.log('🚀 ابدأ البحث الآن!');
