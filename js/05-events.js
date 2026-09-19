// ============================================================
// 05-events.js - أحداث المستخدم والأداء
// ============================================================

const SUGGESTIONS_DEBOUNCE_MS = 120;
const MAX_AUTO_OPEN_LINKS = 20;
const MAX_SUGGESTIONS = 12;
const RESULTS_PAGE_SIZE = 10;

let suggestionsTimeout = null;
let currentFullResults = [];
let currentDisplayLimit = RESULTS_PAGE_SIZE;
let showMoreBtn = null;
let countryLoadRequestId = 0;
const countryCitiesCache = new Map();

function updateStatus(message, color = '#64748b') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
}

function getCountryCapital(countryCode) {
    const code = String(countryCode || '').toUpperCase();
    const list = Array.isArray(countries) ? countries : [];
    const country = list.find(item => String(item?.code || '').toUpperCase() === code);
    const localCapital = {"AI":"The Valley","AS":"Pago Pago","AW":"Oranjestad","AX":"Mariehamn","BL":"Gustavia","BM":"Hamilton","BQ":"Kralendijk","CC":"West Island","CK":"Avarua","CW":"Willemstad","CX":"Flying Fish Cove","FK":"Stanley","FO":"Tórshavn","GG":"Saint Peter Port","GI":"Gibraltar","GL":"Nuuk","GP":"Basse-Terre","GS":"King Edward Point","GU":"Hagåtña","HK":"Victoria","IM":"Douglas","IO":"Diego Garcia","JE":"Saint Helier","KI":"South Tarawa","KY":"George Town","MF":"Marigot","MO":"Macau","MP":"Saipan","MQ":"Fort-de-France","MS":"Brades","NC":"Nouméa","NF":"Kingston","NU":"Alofi","PF":"Papeete","PM":"Saint-Pierre","PN":"Adamstown","PR":"San Juan","RE":"Saint-Denis","SH":"Jamestown","SJ":"Longyearbyen","SX":"Philipsburg","TC":"Cockburn Town","TF":"Port-aux-Français","TK":"Fakaofo","UM":"Palmyra Atoll","VG":"Road Town","VI":"Charlotte Amalie","WF":"Mata-Utu","YT":"Mamoudzou"};
    return String(country?.capital || country?.capital_en || country?.capital_ar || localCapital[code] || '').trim();
}


function sortCitiesAlphabetically(cities) {
    // بقية المدن تُرتب حسب الاسم الإنجليزي فقط من A إلى Z.
    return [...(cities || [])].sort((a, b) => {
        const nameA = String(a?.city || '').trim();
        const nameB = String(b?.city || '').trim();

        return nameA.localeCompare(nameB, 'en', {
            sensitivity: 'base',
            numeric: true,
            ignorePunctuation: true
        }) || nameA.localeCompare(nameB, 'en');
    });
}

// المدن الأشهر تظهر أولاً عند اختيار الدولة، ثم بقية المدن أبجدياً.
const FEATURED_CITIES_BY_COUNTRY = {
    SA: ["Riyadh","Jeddah","Mecca","Medina","Dammam","Al Ahsa","Tabuk","At Ta'if","Khamis Mushayt","Hafar Al-Batin"],
    AE: ["Abu Dhabi","Dubai","Sharjah","Al Ain","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain","Khor Fakkan","Dibba Al-Fujairah"],
    QA: ["Doha","Al Wakrah","Al Khor","Lusail","Ras Laffan","Al Dhakira","Al Shamal","Dukhan","Mesaieed","Al Rayyan"],
    KW: ["Kuwait City","Al Ahmadi","Hawalli","As Salimiyah","Al Jahra","Al Farwaniyah","Fahaheel","Sabah As Salim","Al Fintas","Mangaf"],
    BH: ["Manama","Muharraq","Riffa","Hamad Town","Isa Town","Sitra","Jidhafs","Zallaq","A'ali","Budaiya"],
    OM: ["Muscat","Seeb","Salalah","Nizwa","Sohar","Sur","Ibri","Barka","Rustaq","Khasab"],
    FR: ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille"],
    DE: ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Leipzig","Dortmund","Essen"],
    ES: ["Madrid","Barcelona","Valencia","Seville","Zaragoza","Málaga","Murcia","Palma de Mallorca","Las Palmas de Gran Canaria","Bilbao"],
    IT: ["Rome","Milan","Naples","Turin","Palermo","Genoa","Bologna","Florence","Bari","Catania"],
    GB: ["London","Birmingham","Manchester","Glasgow","Liverpool","Leeds","Sheffield","Edinburgh","Bristol","Cardiff"],
    PL: ["Warsaw","Kraków","Łódź","Wrocław","Poznań","Gdańsk","Szczecin","Bydgoszcz","Lublin","Katowice"],
    RO: ["Bucharest","Cluj-Napoca","Timișoara","Iași","Constanța","Craiova","Brașov","Galați","Ploiești","Oradea"],
    NL: ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven","Tilburg","Groningen","Almere","Breda","Nijmegen"],
    BE: ["Brussels","Antwerp","Ghent","Charleroi","Liège","Bruges","Namur","Leuven","Mons","Aalst"],
    SE: ["Stockholm","Gothenburg","Malmö","Uppsala","Västerås","Örebro","Linköping","Helsingborg","Jönköping","Norrköping"],
    AT: ["Vienna","Graz","Linz","Salzburg","Innsbruck","Klagenfurt","Villach","Wels","Sankt Pölten","Dornbirn"],
    GR: ["Athens","Thessaloniki","Patras","Piraeus","Larissa","Heraklion","Peristeri","Kallithea","Acharnes","Kalamaria"],
    PT: ["Lisbon","Porto","Vila Nova de Gaia","Amadora","Braga","Funchal","Coimbra","Setúbal","Almada","Aveiro"],
    CZ: ["Prague","Brno","Ostrava","Plzeň","Liberec","Olomouc","České Budějovice","Hradec Králové","Ústí nad Labem","Pardubice"],
    HU: ["Budapest","Debrecen","Szeged","Miskolc","Pécs","Győr","Nyíregyháza","Kecskemét","Székesfehérvár","Szombathely"],
    IE: ["Dublin","Cork","Limerick","Galway","Waterford","Drogheda","Dundalk","Bray","Navan","Kilkenny"],
    FI: ["Helsinki","Espoo","Tampere","Vantaa","Oulu","Turku","Jyväskylä","Lahti","Kuopio","Pori"],
    DK: ["Copenhagen","Aarhus","Odense","Aalborg","Esbjerg","Randers","Kolding","Horsens","Vejle","Roskilde"],
    HR: ["Zagreb","Split","Rijeka","Osijek","Zadar","Slavonski Brod","Pula","Karlovac","Sisak","Varaždin"],
    BG: ["Sofia","Plovdiv","Varna","Burgas","Ruse","Stara Zagora","Pleven","Sliven","Dobrich","Shumen"],
    RS: ["Belgrade","Novi Sad","Niš","Kragujevac","Subotica","Zrenjanin","Pančevo","Čačak","Kraljevo","Novi Pazar"],
    SK: ["Bratislava","Košice","Prešov","Nitra","Žilina","Banská Bystrica","Trnava","Trenčín","Martin","Poprad"],
    NO: ["Oslo","Bergen","Trondheim","Stavanger","Drammen","Fredrikstad","Kristiansand","Sandnes","Tromsø","Sarpsborg"],
    CH: ["Bern","Zurich","Geneva","Basel","Lausanne","Lucerne","St. Gallen","Lugano","Biel/Bienne","Thun"],
    UA: ["Kyiv","Kharkiv","Odesa","Dnipro","Donetsk","Zaporizhzhia","Lviv","Kryvyi Rih","Mykolaiv","Mariupol"],
    RU: ["Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Kazan","Nizhny Novgorod","Chelyabinsk","Samara","Omsk","Rostov-on-Don"],
    JP: ["Tokyo","Osaka","Kyoto","Nagoya","Sapporo","Fukuoka","Kobe","Yokohama","Hiroshima","Sendai"],
    CN: ["Beijing","Shanghai","Guangzhou","Shenzhen","Chengdu","Chongqing","Xi'an","Hangzhou","Wuhan","Tianjin"],
    IN: ["New Delhi","Mumbai","Kolkata","Bangalore","Chennai","Hyderabad","Ahmedabad","Pune","Surat","Jaipur"],
    KR: ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Suwon","Ulsan","Jeju City","Changwon"],
    KP: ["Pyongyang","Hamhung","Chongjin","Wonsan","Sariwon","Kaesong","Pyongsong","Kanggye","Sinuiju","Nampo"],
    TH: ["Bangkok","Chiang Mai","Phuket","Pattaya","Hat Yai","Nakhon Ratchasima","Udon Thani","Khon Kaen","Surat Thani","Ubon Ratchathani"],
    ID: ["Jakarta","Denpasar","Surabaya","Bandung","Medan","Semarang","Makassar","Palembang","Yogyakarta","Batam"],
    MY: ["Kuala Lumpur","George Town","Johor Bahru","Ipoh","Kota Kinabalu","Kuching","Malacca City","Shah Alam","Petaling Jaya","Kuala Terengganu"],
    VN: ["Hanoi","Ho Chi Minh City","Da Nang","Hoi An","Hue","Nha Trang","Duong Dong","Can Tho","Hai Phong","Da Lat"],
    PH: ["Manila","Cebu City","Davao City","Quezon City","Zamboanga City","Bacolod","Iloilo City","Baguio","Malay","Tagaytay"],
    TR: ["Ankara","Istanbul","Antalya","Izmir","Bursa","Gaziantep","Konya","Kayseri","Mersin","Adana"],
    IR: ["Tehran","Mashhad","Isfahan","Karaj","Shiraz","Tabriz","Qom","Ahvaz","Kermanshah","Urmia"],
    IQ: ["Baghdad","Basra","Mosul","Erbil","Najaf","Karbala","Kirkuk","Sulaymaniyah","Nasiriyah","Hillah"],
    PK: ["Islamabad","Karachi","Lahore","Faisalabad","Rawalpindi","Multan","Peshawar","Quetta","Hyderabad","Gujranwala"],
    BD: ["Dhaka","Chittagong","Khulna","Rajshahi","Sylhet","Barisal","Rangpur","Mymensingh","Comilla","Cox's Bazar"],
    AF: ["Kabul","Kandahar","Herat","Mazar-i-Sharif","Jalalabad","Kunduz","Lashkar Gah","Ghazni","Bamyan","Khost"],
    KZ: ["Astana","Almaty","Shymkent","Karaganda","Aktobe","Taraz","Pavlodar","Ust-Kamenogorsk","Semey","Atyrau"],
    UZ: ["Tashkent","Samarkand","Bukhara","Namangan","Andijan","Nukus","Fergana","Qarshi","Khiva","Termez"],
    JO: ["Amman","Zarqa","Irbid","Aqaba","Salt","Madaba","Jerash","Karak","Ma'an","Tafilah"],
    LB: ["Beirut","Tripoli","Sidon","Tyre","Zahle","Jounieh","Byblos","Baalbek","Nabatieh","Aley"],
    IL: ["Jerusalem","Tel Aviv","Haifa","Rishon LeZion","Petah Tikva","Ashdod","Netanya","Beersheba","Holon","Bnei Brak"],
    YE: ["Sanaa","Aden","Taiz","Al Hudaydah","Ibb","Dhamar","Mukalla","Seiyun","Sa'dah","Marib"],
    SY: ["Damascus","Aleppo","Homs","Latakia","Hama","Deir ez-Zor","Raqqa","Tartus","Idlib","Daraa"],
    NP: ["Kathmandu","Pokhara","Lalitpur","Bharatpur","Biratnagar","Birgunj","Dharan","Butwal","Hetauda","Janakpur"],
    LK: ["Sri Jayawardenepura Kotte","Colombo","Kandy","Galle","Jaffna","Negombo","Anuradhapura","Trincomalee","Batticaloa","Nuwara Eliya"],
    MM: ["Naypyidaw","Yangon","Mandalay","Bago","Mawlamyine","Taunggyi","Pathein","Monywa","Meiktila","Sittwe"],
    KH: ["Phnom Penh","Siem Reap","Battambang","Sihanoukville","Kampong Cham","Poipet","Ta Khmau","Kampot","Kep","Kratie"],
    LA: ["Vientiane","Luang Prabang","Pakse","Savannakhet","Thakhek","Xam Neua","Phonsavan","Luang Namtha","Oudomxay","Champasak"],
    BN: ["Bandar Seri Begawan","Kuala Belait","Seria","Tutong","Bangar","Kampong Ayer","Muara","Lamunin","Sukang","Labi"],
    MN: ["Ulaanbaatar","Erdenet","Darkhan","Choibalsan","Mörön","Khovd","Ölgii","Bayankhongor","Arvaikheer","Uliastai"],
    TL: ["Dili","Baucau","Maliana","Suai","Likisa","Aileu","Lospalos","Same","Ainaro","Viqueque"],
    BT: ["Thimphu","Phuntsholing","Paro","Punakha","Wangdue Phodrang","Jakar","Trashigang","Samdrup Jongkhar","Gelephu","Trongsa"],
    MV: ["Malé","Addu City","Fuvahmulah","Kulhudhuffushi","Thinadhoo","Naifaru","Hithadhoo","Maradhoo","Gan","Hulhumalé"],
    EG: ["Cairo","Alexandria","Giza","Luxor","Shubra El Kheima","Port Said","Suez","El Mahalla El Kubra","Mansoura","Tanta"],
    NG: ["Abuja","Lagos","Kano","Ibadan","Port Harcourt","Benin City","Onitsha","Owerri","Kaduna","Uyo"],
    ZA: ["Pretoria","Cape Town","Johannesburg","Durban","Soweto","Gqeberha","Bloemfontein","East London","Polokwane","Nelspruit"],
    KE: ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kitale","Garissa","Nyeri"],
    ET: ["Addis Ababa","Dire Dawa","Mekelle","Gondar","Adama","Hawassa","Bahir Dar","Jimma","Dessie","Jijiga"],
    MA: ["Rabat","Casablanca","Marrakech","Fes","Tangier","Agadir","Meknes","Oujda","Kenitra","Tetouan"],
    TZ: ["Dodoma","Dar es Salaam","Mwanza","Arusha","Zanzibar City","Mbeya","Morogoro","Tanga","Kigoma","Moshi"],
    DZ: ["Algiers","Oran","Constantine","Annaba","Blida","Batna","Djelfa","Sétif","Sidi Bel Abbès","Biskra"],
    TN: ["Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir","La Marsa"],
    GH: ["Accra","Kumasi","Tamale","Sekondi-Takoradi","Cape Coast","Tema","Ashaiman","Obuasi","Koforidua","Wa"],
    SN: ["Dakar","Touba","Thiès","Saint-Louis","Kaolack","Ziguinchor","Rufisque","Mbour","Diourbel","Tambacounda"],
    CI: ["Yamoussoukro","Abidjan","Bouaké","Daloa","Korhogo","San-Pédro","Man","Gagnoa","Abengourou","Divo"],
    CM: ["Yaoundé","Douala","Garoua","Bamenda","Maroua","Bafoussam","Ngaoundéré","Bertoua","Kumba","Limbe"],
    UG: ["Kampala","Gulu","Lira","Mbarara","Jinja","Mbale","Masaka","Entebbe","Kasese","Fort Portal"],
    AO: ["Luanda","Huambo","Lobito","Benguela","Lubango","Malanje","Namibe","Cabinda","Uíge","Soyo"],
    MZ: ["Maputo","Matola","Beira","Nampula","Chimoio","Nacala","Quelimane","Tete","Pemba","Xai-Xai"],
    ZW: ["Harare","Bulawayo","Chitungwiza","Mutare","Gweru","Kwekwe","Kadoma","Masvingo","Chinhoyi","Marondera"],
    ZM: ["Lusaka","Kitwe","Ndola","Kabwe","Chingola","Mufulira","Livingstone","Luanshya","Chipata","Kasama"],
    CD: ["Kinshasa","Lubumbashi","Mbuji-Mayi","Kananga","Kisangani","Bukavu","Goma","Likasi","Kolwezi","Tshikapa"],
    CG: ["Brazzaville","Pointe-Noire","Dolisie","Nkayi","Ouesso","Owando","Impfondo","Gamboma","Mossendjo","Djambala"],
    MG: ["Antananarivo","Toamasina","Antsirabe","Fianarantsoa","Mahajanga","Toliara","Antsiranana","Ambovombe","Morondava","Sambava"],
    ML: ["Bamako","Sikasso","Mopti","Ségou","Kayes","Koutiala","Gao","Timbuktu","Kidal","San"],
    BF: ["Ouagadougou","Bobo-Dioulasso","Koudougou","Ouahigouya","Banfora","Kaya","Dédougou","Fada N'Gourma","Tenkodogo","Dori"],
    NE: ["Niamey","Zinder","Maradi","Agadez","Tahoua","Dosso","Diffa","Birni N'Konni","Tessaoua","Gaya"],
    TD: ["N'Djamena","Moundou","Sarh","Abéché","Kélo","Koumra","Pala","Am Timan","Bongor","Mongo"],
    SO: ["Mogadishu","Hargeisa","Bosaso","Kismayo","Galkayo","Beledweyne","Baidoa","Garowe","Jowhar","Berbera"],
    SD: ["Khartoum","Omdurman","Khartoum North","Nyala","Port Sudan","Kassala","El Obeid","Wad Madani","Gedaref","El Fasher"],
    LY: ["Tripoli","Benghazi","Misrata","Zawiya","Sabha","Tobruk","Ajdabiya","Sirte","Al Khums","Derna"],
    MR: ["Nouakchott","Nouadhibou","Kiffa","Rosso","Kaédi","Zouérat","Atar","Néma","Aleg","Timbedra"],
    RW: ["Kigali","Butare","Gitarama","Ruhengeri","Gisenyi","Byumba","Cyangugu","Kibuye","Nyagatare","Rwamagana"],
    BI: ["Bujumbura","Gitega","Muyinga","Ruyigi","Ngozi","Rutana","Bururi","Makamba","Kayanza","Cibitoke"],
    BW: ["Gaborone","Francistown","Molepolole","Maun","Serowe","Selebi-Phikwe","Kanye","Mahalapye","Palapye","Lobatse"],
    NA: ["Windhoek","Walvis Bay","Swakopmund","Rundu","Oshakati","Katima Mulilo","Rehoboth","Otjiwarongo","Tsumeb","Grootfontein"],
    MW: ["Lilongwe","Blantyre","Mzuzu","Zomba","Kasungu","Mangochi","Karonga","Salima","Nkhotakota","Liwonde"],
    GN: ["Conakry","Nzérékoré","Kankan","Kindia","Labé","Boké","Mamou","Kissidougou","Guéckédou","Faranah"],
    BJ: ["Porto-Novo","Cotonou","Parakou","Djougou","Bohicon","Abomey","Natitingou","Ouidah","Lokossa","Savalou"],
    TG: ["Lomé","Sokodé","Kara","Kpalimé","Atakpamé","Dapaong","Tsévié","Aného","Mango","Bafilo"],
    SL: ["Freetown","Bo","Kenema","Makeni","Koidu","Lunsar","Port Loko","Waterloo","Kabala","Bonthe"],
    LR: ["Monrovia","Gbarnga","Kakata","Bensonville","Harper","Voinjama","Buchanan","Zwedru","Yekepa","Greenville"],
    CF: ["Bangui","Bimbo","Berbérati","Carnot","Bambari","Bouar","Bossangoa","Bria","Bangassou","Nola"],
    GA: ["Libreville","Port-Gentil","Franceville","Oyem","Moanda","Lambaréné","Mouila","Tchibanga","Koulamoutou","Makokou"],
    GQ: ["Malabo","Bata","Ebebiyin","Aconibe","Añisoc","Luba","Evinayong","Mongomo","Mengomeyén","Micomeseng"],
    DJ: ["Djibouti","Ali Sabieh","Tadjoura","Obock","Dikhil","Arta","Holhol","Yoboki","Balbala","Dorra"],
    ER: ["Asmara","Keren","Massawa","Assab","Mendefera","Barentu","Adi Keyh","Edd","Dekemhare","Akordat"],
    GM: ["Banjul","Serekunda","Brikama","Bakau","Farafenni","Lamin","Sukuta","Basse Santa Su","Gunjur","Kaiaf"],
    GW: ["Bissau","Bafatá","Gabú","Bissorã","Bolama","Cacheu","Canchungo","Farim","Quinhámel","Buba"],
    LS: ["Maseru","Teyateyaneng","Mafeteng","Hlotse","Mohale's Hoek","Quthing","Qacha's Nek","Butha-Buthe","Mokhotlong","Thaba-Tseka"],
    SZ: ["Mbabane","Manzini","Lobamba","Siteki","Nhlangano","Pigg's Peak","Big Bend","Malkerns","Mhlume","Hlatikulu"],
    MU: ["Port Louis","Beau Bassin-Rose Hill","Vacoas-Phoenix","Curepipe","Quatre Bornes","Triolet","Goodlands","Centre de Flacq","Bel Air","Mahebourg"],
    SC: ["Victoria","Anse Boileau","Beau Vallon","Cascade","Takamaka","Anse Royale","Baie Lazare","Grand Anse","La Passe","Anse aux Pins"],
    CV: ["Praia","Mindelo","Santa Maria","Assomada","Espargos","Porto Novo","São Filipe","Tarrafal","Sal Rei","Nova Sintra"],
    ST: ["São Tomé","Santo António","Neves","Trindade","Santana","Guadalupe","São João dos Angolares","Porto Alegre","Santa Cruz","Ribeira Afonso"],
    KM: ["Moroni","Mutsamudu","Fomboni","Domoni","Tsémbehou","Ouani","Mirontsi","Koni-Djodjo","Mitsamiouli","Iconi"],
    SS: ["Juba","Wau","Malakal","Yei","Aweil","Bentiu","Torit","Rumbek","Bor","Yambio"],
    EH: ["Laayoune","Dakhla","Smara","Boujdour","Essemara","Guelta Zemmur","Tifariti","Mahbes","Amgala","Bir Lehlou"],
    US: ["Washington","New York City","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas"],
    MX: ["Mexico City","Cancún","Guadalajara","Monterrey","Tijuana","Puebla","Ecatepec de Morelos","Nezahualcóyotl","Toluca","León"],
    CA: ["Ottawa","Toronto","Montreal","Vancouver","Calgary","Edmonton","Quebec City","Winnipeg","Hamilton","Halifax"],
    CU: ["Havana","Santiago de Cuba","Camagüey","Holguín","Santa Clara","Guantánamo","Bayamo","Cienfuegos","Matanzas","Pinar del Río"],
    DO: ["Santo Domingo","Punta Cana","Santiago de los Caballeros","La Romana","San Pedro de Macorís","Higüey","Puerto Plata","San Cristóbal","La Vega","Bonao"],
    GT: ["Guatemala City","Mixco","Villa Nueva","Quetzaltenango","Antigua Guatemala","Escuintla","Chinautla","Chimaltenango","Huehuetenango","Cobán"],
    PA: ["Panama City","San Miguelito","Colón","David","La Chorrera","Santiago","Chitré","Penonomé","Las Tablas","Bocas del Toro"],
    CR: ["San José","Alajuela","Cartago","Heredia","Liberia","Puntarenas","Limón","Jacó","Tamarindo","La Fortuna"],
    JM: ["Kingston","Spanish Town","Portmore","Montego Bay","May Pen","Ocho Rios","Port Antonio","Mandeville","Negril","Lucea"],
    BS: ["Nassau","Freeport","West End","Marsh Harbour","Alice Town","Cockburn Town","George Town","Clarence Town","Dunmore Town","Matthew Town"],
    HT: ["Port-au-Prince","Cap-Haïtien","Gonaïves","Les Cayes","Jacmel","Jérémie","Saint-Marc","Hinche","Port-de-Paix","Fort-Liberté"],
    HN: ["Tegucigalpa","San Pedro Sula","La Ceiba","Choloma","El Progreso","Choluteca","Comayagua","Puerto Cortés","Danlí","Roatán"],
    NI: ["Managua","León","Masaya","Matagalpa","Chinandega","Granada","Estelí","Jinotega","Bluefields","San Juan del Sur"],
    SV: ["San Salvador","Santa Ana","San Miguel","Soyapango","Santa Tecla","Mejicanos","Apopa","Delgado","Ahuachapán","La Libertad"],
    BZ: ["Belmopan","Belize City","San Ignacio","Orange Walk","Dangriga","Corozal","Punta Gorda","San Pedro","Placencia","Hopkins"],
    TT: ["Port of Spain","San Fernando","Chaguanas","Arima","Point Fortin","Couva","Scarborough","Sangre Grande","Rio Claro","Princes Town"],
    BB: ["Bridgetown","Speightstown","Oistins","Holetown","Bathsheba","Crane","Greenland","Six Cross Roads","Four Cross Roads","Welchman Hall"],
    LC: ["Castries","Gros Islet","Vieux Fort","Soufrière","Micoud","Dennery","Anse La Raye","Canaries","Choiseul","Laborie"],
    GD: ["St. George's","Gouyave","Grenville","Victoria","Sauteurs","Hillsborough","St. David's","Morne Jaloux","Grand Anse","Calliste"],
    AG: ["St. John's","All Saints","Liberta","Potter's Village","Bolans","Codrington","Parham","Sea View Farm","Piggotts","Willikies"],
    KN: ["Basseterre","Charlestown","Sandy Point Town","Cayon","Dieppe Bay Town","Old Road Town","Gingerland","Newcastle","Figtree","Cotton Ground"],
    VC: ["Kingstown","Georgetown","Barrouallie","Chateaubelair","Port Elizabeth","Layou","Biabou","Colonarie","Canouan","Union Island"],
    DM: ["Roseau","Portsmouth","Marigot","Berekua","Saint Joseph","Wesley","Soufrière","La Plaine","Castle Bruce","Grand Bay"],
    BR: ["Brasília","São Paulo","Rio de Janeiro","Belo Horizonte","Recife","Fortaleza","Salvador","Curitiba","Porto Alegre","Manaus"],
    AR: ["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Mar del Plata","Salta","Santa Fe","San Miguel de Tucumán","Bariloche"],
    CO: ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira","Santa Marta","Manizales"],
    PE: ["Lima","Cusco","Arequipa","Trujillo","Chiclayo","Piura","Iquitos","Huancayo","Tacna","Puno"],
    CL: ["Santiago","Valparaíso","Concepción","Antofagasta","Viña del Mar","La Serena","Temuco","Iquique","Puerto Montt","Punta Arenas"],
    VE: ["Caracas","Maracaibo","Valencia","Barquisimeto","Maracay","Ciudad Guayana","Maturín","Barcelona","San Cristóbal","Mérida"],
    EC: ["Quito","Guayaquil","Cuenca","Santo Domingo","Machala","Manta","Portoviejo","Ambato","Riobamba","Baños"],
    BO: ["La Paz","Santa Cruz de la Sierra","Cochabamba","Sucre","El Alto","Oruro","Potosí","Tarija","Uyuni","Rurrenabaque"],
    PY: ["Asunción","Ciudad del Este","San Lorenzo","Luque","Capiatá","Lambaré","Fernando de la Mora","Limpio","Encarnación","Pedro Juan Caballero"],
    UY: ["Montevideo","Salto","Ciudad de la Costa","Paysandú","Las Piedras","Rivera","Maldonado","Tacuarembó","Melo","Punta del Este"],
    GY: ["Georgetown","Linden","New Amsterdam","Corriverton","Bartica","Anna Regina","Lethem","Mahdia","Parika","Supenaam"],
    SR: ["Paramaribo","Lelydorp","Nieuw Nickerie","Moengo","Meerzorg","Nieuw Amsterdam","Mariënburg","Wageningen","Albina","Groningen"],
    GF: ["Cayenne","Saint-Laurent-du-Maroni","Kourou","Matoury","Rémire-Montjoly","Macouria","Mana","Apatou","Grand-Santi","Maripasoula"],
    AL: ["Tirana","Durres","Vlore","Shkoder","Elbasan","Fier","Korce","Berat","Sarande","Gjirokaster"],
    AD: ["Andorra la Vella","Escaldes-Engordany","Encamp","Sant Julia de Loria","La Massana","Ordino","Canillo","Pas de la Casa","Arinsal","Soldeu"],
    AM: ["Yerevan","Gyumri","Vanadzor","Vagharshapat","Hrazdan","Abovyan","Kapan","Armavir","Gavar","Dilijan"],
    AU: ["Canberra","Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Hobart","Darwin","Cairns"],
    AZ: ["Baku","Ganja","Sumqayit","Lankaran","Mingachevir","Nakhchivan","Shaki","Gabala","Quba","Yevlakh"],
    BA: ["Sarajevo","Banja Luka","Mostar","Zenica","Tuzla","Bijeljina","Brcko","Travnik","Trebinje","Jajce"],
    BY: ["Minsk","Gomel","Mogilev","Vitebsk","Grodno","Brest","Babruysk","Baranavichy","Pinsk","Orsha"],
    CY: ["Nicosia","Limassol","Larnaca","Paphos","Famagusta","Paralimni","Polis","Ayia Napa","Protaras","Kyrenia"],
    EE: ["Tallinn","Tartu","Narva","Parnu","Kohtla-Jarve","Viljandi","Rakvere","Maardu","Kuressaare","Haapsalu"],
    FJ: ["Suva","Nadi","Lautoka","Labasa","Savusavu","Sigatoka","Ba","Levuka","Rakiraki","Navua"],
    FM: ["Palikir","Weno","Kolonia","Tofol","Colonia","Lelu","Nett","Uman","Madolenihmw","Lele"],
    GE: ["Tbilisi","Batumi","Kutaisi","Rustavi","Gori","Zugdidi","Poti","Khashuri","Telavi","Mtskheta"],
    IS: ["Reykjavik","Kopavogur","Hafnarfjordur","Akureyri","Reykjanesbaer","Gardabaer","Mosfellsbaer","Akranes","Selfoss","Isafjordur"],
    KG: ["Bishkek","Osh","Jalal-Abad","Karakol","Tokmok","Kara-Balta","Naryn","Talas","Batken","Balykchy"],
    LI: ["Vaduz","Schaan","Balzers","Triesen","Eschen","Mauren","Triesenberg","Ruggell","Gamprin","Planken"],
    LT: ["Vilnius","Kaunas","Klaipeda","Siauliai","Panevezys","Alytus","Marijampole","Mazeikiai","Jonava","Utena"],
    LU: ["Luxembourg","Esch-sur-Alzette","Differdange","Dudelange","Petange","Ettelbruck","Strassen","Bertrange","Mamer","Schifflange"],
    LV: ["Riga","Daugavpils","Liepaja","Jelgava","Jurmala","Ventspils","Rezekne","Valmiera","Jekabpils","Ogre"],
    MC: ["Monaco","Monte-Carlo","La Condamine","Fontvieille","Moneghetti","Larvotto","Saint-Roman","Saint-Michel","La Colle","Les Revoires"],
    MD: ["Chisinau","Balti","Bender","Tiraspol","Cahul","Ungheni","Soroca","Orhei","Comrat","Ceadir-Lunga"],
    MH: ["Majuro","Ebeye","Jaluit","Wotje","Kwajalein","Maloelap","Likiep","Lae","Arno","Aur"],
    MK: ["Skopje","Bitola","Kumanovo","Prilep","Tetovo","Ohrid","Veles","Stip","Gostivar","Strumica"],
    MT: ["Valletta","Birkirkara","Mosta","Qormi","Zabbar","Sliema","St Paul's Bay","Naxxar","San Gwann","Marsaskala"],
    ME: ["Podgorica","Niksic","Budva","Bar","Herceg Novi","Cetinje","Bijelo Polje","Ulcinj","Tivat","Kotor"],
    NR: ["Yaren","Aiwo","Anabar","Anetan","Anibare","Baiti","Boe","Buada","Denigomodu","Meneng"],
    NZ: ["Wellington","Auckland","Christchurch","Hamilton","Tauranga","Dunedin","Palmerston North","Napier","Rotorua","Nelson"],
    PW: ["Ngerulmud","Koror","Airai","Meyuns","Ngaraard","Ngardmau","Ngatpang","Peleliu","Aimeliik","Ngiwal"],
    PG: ["Port Moresby","Lae","Mount Hagen","Madang","Kokopo","Goroka","Wewak","Kimbe","Mendi","Popondetta"],
    PS: ["Ramallah","Gaza City","Hebron","Nablus","Jenin","Bethlehem","Jericho","Tulkarm","Qalqilya","Rafah"],
    SB: ["Honiara","Gizo","Auki","Munda","Tulagi","Kirakira","Lata","Buala","Taro","Tigoa"],
    SM: ["San Marino","Serravalle","Borgo Maggiore","Domagnano","Fiorentino","Acquaviva","Faetano","Chiesanuova","Montegiardino","Murata"],
    SI: ["Ljubljana","Maribor","Kranj","Koper","Celje","Novo Mesto","Velenje","Nova Gorica","Ptuj","Kamnik"],
    SG: ["Singapore","Jurong East","Woodlands","Tampines","Bedok","Yishun","Bukit Timah","Clementi","Toa Payoh","Queenstown"],
    TJ: ["Dushanbe","Khujand","Kulob","Bokhtar","Istaravshan","Tursunzoda","Panjakent","Vahdat","Hisor","Isfara"],
    TM: ["Ashgabat","Turkmenabat","Dashoguz","Mary","Balkanabat","Turkmenbashi","Tejen","Bayramaly","Kaka","Serdar"],
    TO: ["Nuku'alofa","Neiafu","Haveluloto","Vaini","Pangai","Ohonua","Kolovai","Hihifo","Tatakamotonga","Foa"],
    TV: ["Funafuti","Vaiaku","Fongafale","Asau","Tanrake","Savave","Lolua","Niutao","Nui","Nukufetau"],
    VA: ["Vatican City","Vatican Gardens","St Peter's Square","Belvedere","Sant'Anna","Vatican Necropolis","Passetto di Borgo","Via della Conciliazione","Campo Santo Teutonico","Santa Marta"],
    VU: ["Port Vila","Luganville","Isangel","Lakatoro","Sola","Lenakel","Saratamata","Longana","Port-Olry","Norsup"],
    WS: ["Apia","Vaitele","Faleula","Siusega","Malie","Safotulafai","Salelologa","Asau","Mulifanua","Leulumoega"],
    XK: ["Pristina","Prizren","Peja","Gjakova","Mitrovica","Ferizaj","Gjilan","Vushtrri","Rahovec","Suhareka"],
    TW: ["Taipei","New Taipei City","Kaohsiung","Taichung","Tainan","Taoyuan","Hsinchu","Keelung","Chiayi","Changhua"],
    AI: ["The Valley","Sandy Ground","Blowing Point","George Hill","Island Harbour","South Hill","Stoney Ground","East End","West End","North Hill"],
    AQ: [],
    AS: ["Pago Pago","Tafuna","Leone","Faleniu","Mapusagafou","Nu'uuli","Vaitogi","Fagatogo","Utulei","Aua"],
    AW: ["Oranjestad","San Nicolaas","Noord","Santa Cruz","Savaneta","Paradera","Pos Chiquito","Tanki Leendert","Madiki","Ponton"],
    AX: ["Mariehamn","Jomala","Finström","Lemland","Saltvik","Sund","Hammarland","Eckerö","Geta","Vårdö"],
    BL: ["Gustavia"],
    BM: ["Hamilton","St. George's","Somerset Village","Flatts Village","Devonshire Village","Smith's","Warwick","Paget","Pembroke","Sandys"],
    BQ: ["Kralendijk","Oranjestad","The Bottom","Windwardside","Rincon","Dorp Tera Kora","Dorp Antriol","Belnem","Hato","Nikiboko"],
    BV: [],
    CC: ["West Island"],
    CK: ["Avarua","Arutanga"],
    CW: ["Willemstad","Sint Michiel","Westpunt","Barber","Dorp Soto","Tera Cora","Julianadorp","Santa Rosa","Daniel","Lagun"],
    CX: ["Flying Fish Cove"],
    FK: ["Stanley"],
    FO: ["Tórshavn","Klaksvík","Hoyvík","Argir","Fuglafjørður","Vágur","Tvøroyri","Vestmanna","Sørvágur","Saltangará"],
    GG: ["Saint Peter Port","Saint Sampson","Vale","St. Andrew","St. Martin","St. Saviour","Castel","Forest","Torteval","Saint Pierre du Bois"],
    GI: ["Gibraltar"],
    GL: ["Nuuk","Sisimiut","Ilulissat","Qaqortoq","Aasiaat","Maniitsoq","Tasiilaq","Paamiut","Narsaq","Upernavik"],
    GP: ["Basse-Terre","Les Abymes","Pointe-à-Pitre","Le Gosier","Sainte-Anne","Petit-Bourg","Baie-Mahault","Le Moule","Capesterre-Belle-Eau","Saint-François"],
    GS: ["King Edward Point"],
    GU: ["Hagåtña","Dededo","Yigo","Tamuning","Mangilao","Barrigada","Santa Rita","Agat","Inarajan","Merizo"],
    HK: ["Victoria","Kowloon","Tsuen Wan","Sha Tin","Yuen Long","Tuen Mun","Tai Po","Fanling","Sai Kung","Lantau Island"],
    HM: [],
    IM: ["Douglas","Ramsey","Peel","Castletown","Port Erin","Port St Mary","Laxey","Onchan","Kirk Michael","Foxdale"],
    IO: ["Diego Garcia"],
    JE: ["Saint Helier","Saint Clement","Saint Saviour","Saint Brelade","Grouville","Saint Peter"],
    KI: ["South Tarawa","Betio","Bairiki","Bikenibeu","Teaoraereke","Bonriki","Eita","Buariki","Butaritari","London"],
    KY: ["George Town","West Bay","Bodden Town","North Side","East End","East End Village","North Side Village","Cayman Brac","Little Cayman","Savannah"],
    MF: ["Marigot","Grand Case","Quartier-d'Orléans","Cul-de-Sac","Sandy Ground","Friar's Bay","Orient Bay","Hope Estate","Anse Marcel"],
    MO: ["Macau","Taipa","Coloane","Cotai","Nossa Senhora de Fátima","São Lourenço","São Lázaro","Santo António"],
    MP: ["Saipan","Garapan","San Jose","Capitol Hill","Susupe","Dandan","Kagman","Chalan Kanoa","Tanapag","San Vicente"],
    MQ: ["Fort-de-France","Le Lamentin","Le Robert","Schoelcher","Le François","Ducos","La Trinité","Rivière-Salée","Saint-Joseph","Le Marin"],
    MS: ["Brades","Plymouth","Salem","Little Bay"],
    NC: ["Nouméa","Mont-Dore","Dumbéa","Païta","Koné","Poindimié","Bourail","La Foa","Voh","Hienghène"],
    NF: ["Kingston"],
    NU: ["Alofi"],
    PF: ["Papeete","Faaa","Punaauia","Pirae","Mahina","Papara","Moorea-Maiao","Uturoa","Bora-Bora","Teva I Uta"],
    PM: ["Saint-Pierre","Miquelon"],
    PN: ["Adamstown"],
    PR: ["San Juan","Bayamón","Carolina","Ponce","Caguas","Guaynabo","Mayagüez","Arecibo","Toa Baja","Trujillo Alto"],
    RE: ["Saint-Denis","Saint-Paul","Le Tampon","Saint-Pierre","Saint-André","Le Port","Saint-Louis","Saint-Benoît","Sainte-Marie","La Possession"],
    SH: ["Jamestown","Half Tree Hollow","Longwood","Georgetown","Levelwood","Sandy Bay"],
    SJ: ["Longyearbyen","Barentsburg"],
    SX: ["Philipsburg","Lower Prince's Quarter","Upper Prince's Quarter","Cole Bay","Cay Bay","Simpson Bay","Dutch Quarter"],
    TC: ["Cockburn Town","Providenciales","Grand Turk","Grace Bay","Five Cays","Blue Hills","The Bight","Whitby","South Caicos","North Caicos"],
    TF: ["Port-aux-Français"],
    TK: ["Fakaofo","Nukunonu","Atafu"],
    UM: ["Palmyra Atoll","Johnston Atoll","Midway Atoll","Wake Island","Hickam Field","Sand Island","Eastern Island"],
    VG: ["Road Town","Spanish Town"],
    VI: ["Charlotte Amalie","Christiansted","Cruz Bay","Frederiksted","Red Hook","Anna's Retreat","Coral Bay","Charlotte Amalie West"],
    WF: ["Mata-Utu","Leava","Alo","Sigave","Hihifo","Vaitupu","Halalo","Teesi"],
    YT: ["Mamoudzou","Koungou","Dzaoudzi","Dembeni","Bandraboua","Mtsamboro","Pamandzi","Sada","Bandrele","Acoua"],
    CS: [],
    AN: []
};

// جميع رموز الدول مفعّلة: الدول ذات القائمة المخصصة تستخدمها،
// وبقية الدول تختار تلقائياً أكبر 5 مدن حسب عدد السكان.
const ALL_COUNTRY_CODES = new Set(["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","XK","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SS","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW","CS","AN"]);
Object.keys(FEATURED_CITIES_BY_COUNTRY).forEach(code => ALL_COUNTRY_CODES.add(code));
ALL_COUNTRY_CODES.forEach(code => {
    if (!Object.prototype.hasOwnProperty.call(FEATURED_CITIES_BY_COUNTRY, code)) {
        FEATURED_CITIES_BY_COUNTRY[code] = [];
    }
});

function normalizeCityNameForMatch(value) {
    return String(value || '').toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/[’'\`,.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function sortCitiesForCountry(cities, countryCode) {
    const source = Array.isArray(cities) ? [...cities] : [];
    const code = String(countryCode || '').toUpperCase();

    const cityNames = city => [
        city?.city, city?.name, city?.city_name,
        city?.city_ar, city?.name_ar, city?.city_name_ar
    ].filter(Boolean).map(normalizeCityNameForMatch);

    // لكل دولة لا تملك قائمة مشهورة مخصصة، نبني قائمة "الأشهر"
    // تلقائياً من المدن الأعلى سكاناً في ملف الدولة، حتى تحصل جميع الدول
    // على نفس نظام التصنيف: العاصمة ← الأشهر ← الأكبر ← A-Z.
    let featuredNames = (FEATURED_CITIES_BY_COUNTRY[code] || [])
        .map(normalizeCityNameForMatch)
        .filter(Boolean);

    if (!featuredNames.length) {
        // لا توجد قائمة يدوية؟ أنشئ قائمة أشهر تلقائية لكل دولة من بياناتها.
        // بهذا تصبح جميع الدول، وليس الـ34 فقط، ضمن نفس نظام التصنيف.
        const autoFeatured = [...source]
            .filter(city => Number(city?.population) > 0)
            .sort((a, b) =>
                Number(b?.population || 0) - Number(a?.population || 0) ||
                String(a?.city || '').localeCompare(String(b?.city || ''), 'en', { sensitivity: 'base', numeric: true })
            )
            .slice(0, 7);

        featuredNames = autoFeatured
            .flatMap(city => [
                city?.city, city?.name, city?.city_name,
                city?.city_ar, city?.name_ar, city?.city_name_ar
            ])
            .filter(Boolean)
            .map(normalizeCityNameForMatch);

        // خزّن القائمة التي تم توليدها للدولة، لتصبح متاحة لباقي وظائف الموقع.
        if (featuredNames.length) FEATURED_CITIES_BY_COUNTRY[code] = [...featuredNames];
    }

    const used = new Set();
    const keyOf = city => cityNames(city)[0] || String(city?.id ?? city?.city_id ?? '');
    const take = predicate => source.filter(city => {
        const key = keyOf(city);
        if (used.has(key) || !predicate(city)) return false;
        used.add(key);
        return true;
    });

    // 1) العاصمة أولاً.
    const capitalName = normalizeCityNameForMatch(getCountryCapital(code));
    const capitalCities = take(city => capitalName && cityNames(city).some(name =>
        name === capitalName || name.includes(capitalName) || capitalName.includes(name)
    ));

    // 2) المدن الأشهر حسب القائمة المعتمدة للدولة.
    const featuredRank = new Map();
    featuredNames.forEach((name, index) => {
        if (!featuredRank.has(name)) featuredRank.set(name, index);
    });
    const featuredCities = take(city =>
        !capitalCities.includes(city) && cityNames(city).some(name => featuredRank.has(name))
    ).sort((a, b) => {
        const ar = Math.min(...cityNames(a).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
        const br = Math.min(...cityNames(b).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
        return ar - br;
    });

    // 3) أكبر المدن سكاناً، بعد استبعاد العاصمة والمدن الأشهر.
    const largestCandidates = source.filter(city =>
        !used.has(keyOf(city)) && Number(city?.population) > 0
    );

    const largestCities = [...largestCandidates]
        .sort((a, b) =>
            Number(b.population || 0) - Number(a.population || 0) ||
            String(a.city || '').localeCompare(String(b.city || ''), 'en', { sensitivity: 'base', numeric: true })
        )
        .slice(0, 5);

    largestCities.forEach(city => used.add(keyOf(city)));

    // 4) بقية المدن A-Z.
    const remaining = source.filter(city => !used.has(keyOf(city)));
    return [...capitalCities, ...featuredCities, ...largestCities, ...sortCitiesAlphabetically(remaining)];
}
window.sortCitiesFromWeb = async function sortCitiesFromWeb(countryCode) {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code || !Array.isArray(currentCountryCities) || !currentCountryCities.length) {
        showToast('⚠️ اختر دولة أولاً');
        return;
    }

    const button = document.getElementById('webCitySortBtn');
    if (button) button.disabled = true;
    updateStatus('🌐 جاري جلب ترتيب المدن من الويب...', '#f59e0b');

    try {
        // WDQS يدعم JSON عبر GET، ويُستخدم هنا فقط عند ضغط الزر.
        const query = [
            'SELECT ?city ?cityLabel ?population ?capitalLabel WHERE {',
            '  ?country wdt:P297 "' + code + '".',
            '  OPTIONAL {',
            '    ?country wdt:P36 ?capital.',
            '    ?capital rdfs:label ?capitalLabel.',
            '    FILTER(LANG(?capitalLabel) = "en")',
            '  }',
            '  ?city wdt:P17 ?country; wdt:P1082 ?population.',
            '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
            '}',
            'ORDER BY DESC(?population)',
            'LIMIT 1000'
        ].join(' ');

        const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/sparql-results+json' }
        });
        if (!response.ok) throw new Error('wikidata_http_' + response.status);

        const data = await response.json();
        const rows = Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
        if (!rows.length) throw new Error('wikidata_empty');

        const webCities = new Map();
        // استخدم عاصمة بيانات الموقع كـ fallback قبل Wikidata.\n        let webCapital = normalizeCityNameForMatch(getCountryCapital(code));

        for (const row of rows) {
            const name = row?.cityLabel?.value || '';
            const key = normalizeCityNameForMatch(name);
            if (!key) continue;

            if (row?.capitalLabel?.value) {
                webCapital = normalizeCityNameForMatch(row.capitalLabel.value);
            }

            const population = Number(row?.population?.value || 0);
            const old = webCities.get(key);

            if (!old || population > old.population) {
                webCities.set(key, { population });
            }
        }

        const cityNames = city => [
            city?.city, city?.name, city?.city_name,
            city?.city_ar, city?.name_ar, city?.city_name_ar
        ].filter(Boolean).map(normalizeCityNameForMatch);

        const keyOf = city =>
            cityNames(city)[0] ||
            String(city?.id ?? city?.city_id ?? '');

        const webInfo = city => cityNames(city)
            .map(name => webCities.get(name))
            .filter(Boolean);

        const populationOf = city =>
            Math.max(0, ...webInfo(city).map(info => info.population || 0));


        const used = new Set();

        const takeFirst = predicate => {
            const city = currentCountryCities.find(item => {
                const key = keyOf(item);
                return !used.has(key) && predicate(item);
            });
            if (city) used.add(keyOf(city));
            return city ? [city] : [];
        };

        // 1) العاصمة.
        const capital = takeFirst(city =>
            webCapital && cityNames(city).some(name =>
                name === webCapital ||
                name.includes(webCapital) ||
                webCapital.includes(name)
            )
        );

        // 2) المدن الأشهر: القائمة المحلية الموثوقة للدولة، مع مطابقة أسماء الويب.
        const featuredNames = (FEATURED_CITIES_BY_COUNTRY[code] || [])
            .map(normalizeCityNameForMatch)
            .filter(Boolean);
        const featuredRank = new Map();
        featuredNames.forEach((name, index) => {
            if (!featuredRank.has(name)) featuredRank.set(name, index);
        });

        const famous = currentCountryCities
            .filter(city => !used.has(keyOf(city)))
            .filter(city => cityNames(city).some(name => featuredRank.has(name)))
            .sort((a, b) => {
                const ar = Math.min(...cityNames(a).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
                const br = Math.min(...cityNames(b).map(name => featuredRank.has(name) ? featuredRank.get(name) : Infinity));
                return ar - br;
            })
            .slice(0, 10);

        famous.forEach(city => used.add(keyOf(city)));

        // 3) أكبر المدن حسب عدد السكان.
        const largest = currentCountryCities
            .filter(city => !used.has(keyOf(city)) && populationOf(city) > 0)
            .sort((a, b) =>
                populationOf(b) - populationOf(a) ||
                String(a?.city || '').localeCompare(String(b?.city || ''), 'en', { sensitivity: 'base' })
            )
            .slice(0, 5);

        largest.forEach(city => used.add(keyOf(city)));

        // 4) كل ما تبقى أبجديًا A-Z، بدون فقدان أو تكرار أي مدينة.
        const remaining = currentCountryCities.filter(city => !used.has(keyOf(city)));

        renderLocalCityResults([
            ...capital,
            ...famous,
            ...largest,
            ...sortCitiesAlphabetically(remaining)
        ]);

        updateStatus('✅ تم ترتيب المدن: العاصمة ← الأشهر ← الأكبر سكاناً ← A-Z', '#10b981');
    } catch (error) {
        console.error('خطأ في ترتيب المدن من الويب:', error);
        renderLocalCityResults(currentCountryCities);
        updateStatus('❌ تعذر جلب بيانات الويب، عُرضت المدن كما هي', '#ef4444');
        showToast('❌ تعذر الاتصال بمصدر الويب');
    } finally {
        if (button) button.disabled = false;
    }
}

function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateRelevanceScore(city, query) {
    const q = String(query || '').trim().toLowerCase();
    const qAr = normalizeText(query || '');
    if (!q) return 0;

    const nameEn = String(city.city || '').toLowerCase();
    const nameAr = normalizeText(city.city_ar || '');
    const searchableText = city._searchKey || buildSearchableText(city);
    let score = 0;

    if (nameEn === q || nameAr === qAr) score += 1000;
    if (nameEn.startsWith(q) || nameAr.startsWith(qAr)) score += 500;
    else if (new RegExp(`\\b${escapeRegex(q)}`, 'i').test(nameEn) || nameAr.split(' ').some(w => w.startsWith(qAr))) score += 250;
    else if (searchableText.includes(qAr) || nameEn.includes(q)) score += 100;

    const idx = nameEn.indexOf(q) >= 0 ? nameEn.indexOf(q) : nameAr.indexOf(qAr);
    if (idx >= 0) score += Math.max(0, 50 - idx * 5);
    score += Math.max(0, 20 - Math.abs(nameEn.length - q.length));
    if (city.population) score += Math.log10(Number(city.population) + 1) * 2;
    return score;
}

function sortCitiesByRelevance(cities, query) {
    if (!query || !query.trim()) return sortCitiesAlphabetically(cities);
    return [...cities]
        .map(city => ({ city, score: calculateRelevanceScore(city, query) }))
        .sort((a, b) => b.score - a.score || String(a.city.city || '').localeCompare(String(b.city.city || '')))
        .map(item => item.city);
}

function sortCountryDropdown() {
    if (!countrySelect) return;
    const options = Array.from(countrySelect.options);
    if (options.length <= 1) return;
    const selectedValue = countrySelect.value;
    const placeholder = options[0];
    options.slice(1).sort((a, b) => a.text.localeCompare(b.text, 'ar'));
    countrySelect.replaceChildren(placeholder, ...options.slice(1));
    countrySelect.value = selectedValue;
}

function renderLocalCityResults(sortedCities) {
    currentFullResults = Array.isArray(sortedCities) ? sortedCities : [];
    currentDisplayLimit = Math.min(RESULTS_PAGE_SIZE, currentFullResults.length || RESULTS_PAGE_SIZE);
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();

    // مزامنة زر الدفعة التالية في الشريط الجانبي مع القائمة الجديدة.
    // مهم خصوصاً بعد اختيار دولة أو تحميل مدنها من الملف المحلي.
    if (typeof window.refreshResultsPagination === 'function') {
        window.refreshResultsPagination();
    }
}

function showMoreLocalResults() {
    const oldLimit = currentDisplayLimit;
    currentDisplayLimit = Math.min(currentDisplayLimit + RESULTS_PAGE_SIZE, currentFullResults.length);
    if (currentDisplayLimit === oldLimit) return;
    renderResults({ cities: currentFullResults.slice(0, currentDisplayLimit), countries: [] });
    updateShowMoreButton();
    showMoreBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateShowMoreButton() {
    const remaining = Math.max(0, currentFullResults.length - currentDisplayLimit);
    if (!remaining) {
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }
    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.id = 'showMoreResultsBtn';
        showMoreBtn.type = 'button';
        showMoreBtn.style.cssText = 'display:block;width:100%;margin:15px 0;padding:12px 20px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;font-size:14px;cursor:pointer;';
        showMoreBtn.addEventListener('click', showMoreLocalResults);
        resultsDiv.insertAdjacentElement('afterend', showMoreBtn);
    }
    const nextBatch = Math.min(RESULTS_PAGE_SIZE, remaining);
    showMoreBtn.textContent = `⬇️ عرض المزيد (${nextBatch} من أصل ${remaining} متبقية)`;
    showMoreBtn.style.display = 'block';
}

function createSuggestionItem(city) {
    const cityName = city.city || '';
    return `<div class="suggestion" data-city="${escapeHtml(cityName)}" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:white;">🏙️ ${escapeHtml(cityName)} ${city.city_ar ? `(${escapeHtml(city.city_ar)})` : ''} ${city.country ? `- ${escapeHtml(city.country)}` : ''}</div>`;
}

function performLocalSearch(query) {
    const source = currentCountryCities.length ? currentCountryCities : allCities;
    const lower = String(query || '').toLowerCase();
    const arabic = normalizeText(query || '');
    const filtered = source.filter(city => {
        const text = city._searchKey || buildSearchableText(city);
        return text.includes(arabic) || String(city.city || '').toLowerCase().includes(lower) || String(city.city_ar || '').includes(arabic);
    });
    return sortCitiesByRelevance(filtered, query).slice(0, MAX_SUGGESTIONS);
}

function showSuggestions(results) {
    if (!suggestionsDiv) return;
    suggestionsDiv.innerHTML = results?.length ? results.map(createSuggestionItem).join('') : '';
    suggestionsDiv.style.display = results?.length ? 'block' : 'none';
}

if (suggestionsDiv) {
    suggestionsDiv.addEventListener('click', event => {
        const item = event.target.closest('.suggestion');
        if (item?.dataset.city) selectCity(item.dataset.city);
    });
}

function scheduleSuggestions(query) {
    clearTimeout(suggestionsTimeout);
    if (!query.trim()) {
        showSuggestions([]);
        return;
    }
    suggestionsTimeout = setTimeout(() => showSuggestions(performLocalSearch(query)), SUGGESTIONS_DEBOUNCE_MS);
}

async function searchWikipediaWithConfig(limit, message, extendedMessage) {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    updateStatus(message, '#f59e0b');
    wikipediaPage = 0;
    try {
        const results = await searchWikipediaMultilingual(query, Math.min(limit, RESULTS_PAGE_SIZE));
        if (!results.length) {
            updateStatus('❌ لم يتم العثور على نتائج في ويكيبيديا', '#ef4444');
            return showToast('❌ لم يتم العثور على نتائج في ويكيبيديا');
        }
        resultsDiv.innerHTML = '';
        allLinksData = [];
        renderWikipediaResults(results, query);
        updateStatus(extendedMessage || `📖 تم العثور على ${results.length} نتيجة في ويكيبيديا`, '#10b981');
        countSpan.textContent = String(results.length);
        updateFavoriteButtons?.();
    } catch (error) {
        console.error('خطأ في ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء البحث في ويكيبيديا', '#ef4444');
    }
}

// ============================================================
// البحث: الاقتراحات فقط أثناء الكتابة، والبحث الكامل عند Enter/الزر
// ============================================================
searchInput.addEventListener('input', function () {
    scheduleSuggestions(this.value);
});

searchInput.addEventListener('keydown', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(suggestionsTimeout);
        showSuggestions([]);
        await handleSearch();
    } else if (event.key === 'Escape') {
        clearTimeout(suggestionsTimeout);
        this.value = '';
        showSuggestions([]);
        this.blur();
    }
});

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    clearTimeout(suggestionsTimeout);
    showSuggestions([]);
    await handleSearch();
});

// ============================================================
// النسخ: بناء النص فقط عند الضغط، بدون عمل إضافي أثناء العرض
// ============================================================
document.getElementById('copyAll')?.addEventListener('click', async () => {
    if (!allLinksData.length) return showToast('⚠️ لا توجد روابط للنسخ');

    const chunks = ['🔍 روابط البحث عن المدن والدول', '='.repeat(60), ''];
    allLinksData.forEach((data, i) => {
        chunks.push(`📌 ${i + 1}. ${data.name} (${data.type})`);
        chunks.push(`   كلمة البحث: ${data.query}`);
        (data.links || []).forEach(link => chunks.push(`   ${link.id}. ${link.name}: ${link.url}`));
        chunks.push('');
    });
    const text = chunks.join('\n');
    const totalLinks = allLinksData.reduce((sum, item) => sum + (item.links?.length || 0), 0);

    try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else fallbackCopy(text, totalLinks);
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (_) {
        fallbackCopy(text, totalLinks);
    }
});

function fallbackCopy(text, totalLinks) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        if (!document.execCommand('copy')) throw new Error('copy_failed');
        showToast(`✅ تم نسخ ${totalLinks.toLocaleString()} رابط`);
    } catch (error) {
        console.error('فشل النسخ:', error);
        showToast('❌ فشل نسخ الروابط');
    } finally {
        textarea.remove();
    }
}

// ============================================================
// فتح الروابط: حد أقصى آمن بدل جدولة مئات/آلاف النوافذ
// ============================================================
document.getElementById('openAll')?.addEventListener('click', () => {
    const allUrls = allLinksData.flatMap(data => (data.links || []).map(link => link.url)).filter(Boolean);
    if (!allUrls.length) return showToast('⚠️ لا توجد روابط للفتح');

    const urlsToOpen = allUrls.slice(0, MAX_AUTO_OPEN_LINKS);
    if (allUrls.length > MAX_AUTO_OPEN_LINKS && !confirm(`لديك ${allUrls.length.toLocaleString()} رابطًا. سيتم فتح أول ${MAX_AUTO_OPEN_LINKS} فقط لتجنب تجميد المتصفح. هل تريد المتابعة؟`)) return;

    let opened = 0;
    urlsToOpen.forEach((url, index) => {
        setTimeout(() => {
            try {
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                if (win) opened++;
            } catch (error) {
                console.warn('فشل فتح الرابط:', error);
            }
            if (index === urlsToOpen.length - 1) {
                showToast(opened ? `🚀 تم طلب فتح ${opened} رابط` : '⚠️ المتصفح منع النوافذ المنبثقة');
            }
        }, index * 100);
    });
});

// ============================================================
// مسح النتائج
// ============================================================
document.getElementById('clearResults')?.addEventListener('click', () => {
    resultsDiv.innerHTML = '';
    countSpan.textContent = '0';
    allLinksData = [];
    currentFullResults = [];
    currentDisplayLimit = 0;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    searchInput.value = '';
    showSuggestions([]);
    searchInput.focus();
    showToast('🗑 تم مسح النتائج');
});

// ============================================================
// تغيير الدولة: إلغاء الطلب السابق ومنع سباق الطلبات
// ============================================================

countrySelect.addEventListener('change', async function () {
    const code = this.value;
    const requestId = ++countryLoadRequestId;
    searchInput.value = '';
    showSuggestions([]);

    if (!code) {
        currentCountryCities = [];
        updateStatus('🌐 بحث عالمي', '#64748b');
        if (allCities.length) renderLocalCityResults(sortCitiesAlphabetically(allCities));
        else {
            resultsDiv.innerHTML = '';
            countSpan.textContent = '0';
        }
        return;
    }

    const countryName = countryMap[code] || code;
    if (countryCitiesCache.has(code)) {
        currentCountryCities = countryCitiesCache.get(code);
        updateStatus(`✅ ${currentCountryCities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(sortCitiesForCountry(currentCountryCities, code));
        return;
    }

    updateStatus(`⏳ جاري تحميل مدن ${countryName}...`, '#f59e0b');
    try {
        const cities = await loadCountryCities(code);
        if (requestId !== countryLoadRequestId || countrySelect.value !== code) return;
        countryCitiesCache.set(code, cities);
        currentCountryCities = cities;
        updateStatus(`✅ ${cities.length.toLocaleString()} مدينة في ${countryName}`, '#10b981');
        renderLocalCityResults(sortCitiesForCountry(cities, code));
    } catch (error) {
        if (requestId !== countryLoadRequestId) return;
        console.error('خطأ في تحميل مدن الدولة:', error);
        updateStatus(`❌ فشل تحميل مدن ${countryName}`, '#ef4444');
        showToast('❌ حدث خطأ أثناء تحميل المدن');
    }
});

// جميع عمليات ويكيبيديا تبدأ الآن بحد أقصى 10 نتائج في الدفعة الأولى.
window.searchOnlyWikipedia = () => searchWikipediaWithConfig(RESULTS_PAGE_SIZE, '🔍 جاري البحث في ويكيبيديا...');
window.searchAllWikipedia = () => searchWikipediaWithConfig(RESULTS_PAGE_SIZE, '🔍 جاري البحث في ويكيبيديا...', '📖 تم تحميل 10 نتائج في الدفعة الأولى');

window.loadMoreWikipedia = async function () {
    const query = searchInput.value.trim();
    if (!query) return showToast('⚠️ الرجاء إدخال نص للبحث في ويكيبيديا');

    const nextPage = wikipediaPage + 1;
    const offset = nextPage * RESULTS_PAGE_SIZE;
    updateStatus('⏳ جاري تحميل 10 نتائج إضافية من ويكيبيديا...', '#f59e0b');

    try {
        const results = await searchWikipediaMultilingual(query, RESULTS_PAGE_SIZE, offset);
        if (!results.length) {
            updateStatus('📖 تم عرض جميع النتائج المتاحة', '#94a3b8');
            return showToast('⚠️ لا توجد نتائج إضافية');
        }
        wikipediaPage = nextPage;
        renderWikipediaResults(results, query, true);
        updateStatus(`📖 تم تحميل ${results.length} نتيجة إضافية`, '#10b981');
    } catch (error) {
        console.error('خطأ في تحميل المزيد من ويكيبيديا:', error);
        updateStatus('❌ حدث خطأ أثناء التحميل', '#ef4444');
    }
};

window.addEventListener('load', sortCountryDropdown);
countrySelect.addEventListener('focus', sortCountryDropdown);

console.log('✅ 05-events.js تم تحميله بنجاح — 10 نتائج لكل دفعة');