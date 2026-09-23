# إعداد Tuursim53 Tourism

الصفحة الجديدة هي \`tourism.html\`، وتعمل بواجهة HTML/CSS/JS مع Leaflet وخريطة OpenStreetMap، وتستخدم قاعدة المدن الموجودة في المستودع. تكامل YouTube Data API وGoogle Places وUnsplash موجود كطبقة Proxy اختيارية حتى لا تتسرّب المفاتيح إلى المتصفح.

## تشغيل سريع
افتح \`tourism.html\`. بدون مفاتيح يمكنك تجربة قاعدة المدن المحلية، بحث Nominatim الخفيف، خرائط Google، وبحث YouTube.

## APIs
### YouTube Data API
يتطلب Google Cloud API key. الحصة الافتراضية المنشورة هي 10,000 وحدة يوميًا، وتختلف تكلفة الوحدات حسب العملية؛ لذلك استخدم debounce وcache ولا تستدعِ search.list مع كل ضغطة مفتاح.

### Google Places API (New)
يتطلب مشروعًا مفعّلًا مع Billing ومفتاحًا أو OAuth. الطلبات تُحاسب حسب SKU وتخضع للحصص. استخدم Field Masks، وقيّد المفتاح بالنطاقات والخدمات اللازمة. لا تضع المفتاح في ملفات Git.

### OpenStreetMap / Nominatim
الخريطة تستخدم بلاطات OSM مع الإسناد. Nominatim العام للاستخدام الخفيف فقط؛ السياسة تضع حدًا أقصى مطلقًا قدره طلب واحد/ثانية وتمنع autocomplete والاستخدامات واسعة النطاق. الإنتاج الكبير يحتاج مزودًا مناسبًا أو بنية ذاتية.

### Unsplash / Flickr
اجعل مفاتيح هذه الخدمات في Proxy/serverless، وطبّق cache واحترم حدود النداء وشروط الترخيص والإسناد. Unsplash يفرض حدودًا بحسب نوع التطبيق، ويجب مراجعة السياسة الحالية قبل الإنتاج. Flickr كذلك يخضع لسياسة API وترخيص المحتوى لكل صورة.

## Proxy
أنشئ متغيرات البيئة:
- \`YOUTUBE_API_KEY\`
- \`GOOGLE_MAPS_API_KEY\`
- \`UNSPLASH_ACCESS_KEY\`
- \`FLICKR_API_KEY\`

ثم اجعل الواجهة تستقبل شكلًا موحدًا:
\`\`\`json
{"results":[{"name":"...","lat":0,"lng":0,"rating":4.7,"references":120,"viewsNorm":0.8,"recency":0.9,"category":"attraction","image":"..."}]}
\`\`\`

## الترتيب
الـ heuristic الحالي: 34% تقييم + 24% مراجع + 22% شعبية/مشاهدة + 20% حداثة. هذه أوزان بحثية قابلة للتعديل وليست حكمًا موضوعيًا على «الجمال».

## الأداء والأمن
- Debounce للبحث.
- localStorage cache للنتائج الخفيفة.
- lazy loading للصور.
- توحيد نتائج المصادر قبل العرض.
- المفاتيح لا توضع في العميل.
- يمكن إضافة IndexedDB وService Worker وrate limiting في Proxy كمرحلة لاحقة.

## الوصول وSEO
RTL، \`lang=ar\`، skip link، \`aria-live\`، labels، meta description، canonical وSchema.org SearchAction.

## ملاحظة
وجود كود التكامل لا يعني تلقائيًا السماح بكل استخدام للبيانات. راجع شروط كل مزود وسياسة الاستخدام الحالية قبل إطلاق نسخة إنتاجية.