// ============================================================
// 01-data.js - تحميل ومعالجة البيانات
// نسخة محسنة باستخدام IndexedDB
// ============================================================


// ============================================================
// إعداد IndexedDB
// ============================================================

const DB_NAME = "tuursim53_cache";
const DB_VERSION = 1;
const STORE_NAME = "json_data";


// فتح قاعدة البيانات
function openDataDB() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(DB_NAME, DB_VERSION);


        request.onupgradeneeded = function(e) {

            const db = e.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {

                db.createObjectStore(STORE_NAME);
            }
        };


        request.onsuccess = function(e) {

            resolve(e.target.result);
        };


        request.onerror = function(e) {

            reject(e);
        };

    });
}


// حفظ بيانات
async function saveCache(key, data) {

    const db = await openDataDB();

    return new Promise((resolve, reject) => {


        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );


        transaction
            .objectStore(STORE_NAME)
            .put(data, key);


        transaction.oncomplete =
            resolve;


        transaction.onerror =
            reject;

    });

}


// قراءة بيانات
async function getCache(key) {

    const db = await openDataDB();

    return new Promise((resolve, reject) => {


        const transaction =
            db.transaction(
                STORE_NAME,
                "readonly"
            );


        const request =
            transaction
                .objectStore(STORE_NAME)
                .get(key);


        request.onsuccess =
            () => resolve(request.result);


        request.onerror =
            reject;

    });

}



// ============================================================
// 1. تحميل الدول فقط عند فتح الموقع
// ============================================================

async function loadData() {


    try {


        statusDiv.textContent =
            "⏳ جاري تحميل الدول...";


        let cachedCountries =
            await getCache("countries");



        if (cachedCountries) {


            countries = cachedCountries;


            console.log(
                "📦 الدول من IndexedDB"
            );


        } else {


            const response =
                await fetch(
                    "output/countries.json"
                );


            countries =
                await response.json();



            await saveCache(
                "countries",
                countries
            );


            console.log(
                "💾 تم حفظ الدول"
            );

        }



        populateCountrySelect();



        statusDiv.textContent =
            `✅ تم تحميل ${countries.length} دولة`;



        statusDiv.style.color =
            "#10b981";



        renderResults({

            cities: [],

            countries: countries

        });



    }

    catch(error) {


        console.error(
            "خطأ تحميل الدول:",
            error
        );


        statusDiv.textContent =
            "⚠️ فشل تحميل الدول";


        statusDiv.style.color =
            "#ef4444";


        showDemoData();

    }

}



// ============================================================
// 2. تحميل مدن دولة معينة
// ============================================================

async function loadCountryCities(code) {


    if (!code)
        return [];



    try {



        // البحث في IndexedDB

        let cached =
            await getCache(
                "country_" + code
            );



        if (cached) {


            console.log(
                "📦 من الكاش:",
                code
            );


            return cached;

        }




        console.log(
            "🌍 تحميل:",
            code
        );



        const response =
            await fetch(
                `output/by_country/${code}.json`
            );



        if (!response.ok) {

            throw new Error(
                "ملف الدولة غير موجود"
            );
        }



        const data =
            await response.json();




        const country =
            countries.find(
                c => c.code === code
            );



        const countryName =
            country?.name ||
            country?.name_en ||
            code;



        const countryNameAr =
            country?.name_ar ||
            countryName;



        const cities =
            data.map(c => ({


                ...c,


                country:
                    countryName,


                country_ar:
                    countryNameAr,



                _searchKey:
                    buildSearchableText({

                        ...c,

                        country:
                            countryName

                    })

            }));




        await saveCache(

            "country_" + code,

            cities

        );



        return cities;



    }

    catch(error) {


        console.warn(

            `⚠️ فشل تحميل مدن ${code}:`,

            error

        );


        return [];

    }

}



// ============================================================
// 3. تحميل جميع الدول (اختياري)
// لا يستخدم عند الدخول
// ============================================================

async function loadAllCountryCities() {


    const allCitiesTemp = [];

    let loaded = 0;



    for (const country of countries) {


        const cities =
            await loadCountryCities(
                country.code
            );


        allCitiesTemp.push(
            ...cities
        );


        loaded++;



        statusDiv.textContent =
            `⏳ ${loaded}/${countries.length} دولة`;

    }



    allCities =
        allCitiesTemp;



    statusDiv.textContent =
        `✅ تم تحميل ${allCities.length.toLocaleString()} مدينة`;



    renderResults({

        cities:
            allCities.slice(0,100),

        countries:[]

    });

}



// ============================================================
// 4. بيانات تجريبية
// ============================================================

function showDemoData() {


    const demoCities = [

        {
            city:"صنعاء",
            city_ar:"صنعاء",
            country:"اليمن",
            country_ar:"اليمن"
        },

        {
            city:"الرياض",
            city_ar:"الرياض",
            country:"السعودية",
            country_ar:"السعودية"
        },

        {
            city:"دبي",
            city_ar:"دبي",
            country:"الإمارات",
            country_ar:"الإمارات"
        }

    ];



    allCities =
        demoCities;



    statusDiv.textContent =
        "⚠️ تم استخدام بيانات تجريبية";



    renderResults({

        cities: allCities,

        countries:[]

    });

}



// ============================================================
// أدوات إدارة الكاش
// ============================================================


window.clearDataCache = async function(){


    const db =
        await openDataDB();



    const tx =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );



    tx.objectStore(
        STORE_NAME
    ).clear();



    console.log(
        "🗑️ تم حذف IndexedDB"
    );

};




window.reloadDataCache = async function(){


    await clearDataCache();


    location.reload();

};



console.log(
    "✅ 01-data.js جاهز - IndexedDB"
);