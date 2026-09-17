// ============================================================
// 00-config.js - الإعدادات العامة والمتغيرات العالمية
// ============================================================

const CONFIG = {
    WIKIPEDIA_PAGE_SIZE: 20,
    MAX_RESULTS: 100,
    SEARCH_DELAY: 300,
    MAX_CITIES_DISPLAY: 100,
    MAX_SUGGESTIONS: 20,
    WIKIPEDIA_LIMIT: 30,
    RESULTS_PAGE_SIZE: 50,
    INITIAL_RESULTS_LIMIT: 20,
    SUGGESTIONS_DEBOUNCE_MS: 150,
    SEARCH_DEBOUNCE_MS: 300,
    MAX_AUTO_OPEN_LINKS: 20
};

let countries = [];
let allCities = [];
let currentCountryCities = [];
let countryMap = {};
let countryNames = {};
let searchTimeout = null;
let allLinksData = [];
let wikiResultsCache = {};
let wikipediaPage = 0;

const countrySelect = document.getElementById('country');
const searchInput = document.getElementById('search');
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const suggestionsDiv = document.getElementById('suggestions');
const countSpan = document.getElementById('count');

console.log('✅ 00-config.js تم تحميله بنجاح');
