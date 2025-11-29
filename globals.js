// --- VARIABILI GLOBALI DATI ---
let rawData = {};
let db = {};

// Variabili interfaccia
let mappa;
let mappaContainer;
let vistaAttuale = "lista";
let boundsCittaCorrente = null;

// STATO DELL'APP
let appState = {
    currentYear: 2025,
    maxYear: 2025,
    minYear: 1900,
    isolatedLineId: null,
    activeCityId: null,
    isPlaying: false,
    animationInterval: null,
    speed: 150,
};

const MAPBOX_TOKEN = "pk.eyJ1IjoiZGF2aWR6aG91cG9saW1pIiwiYSI6ImNtaWRyOHlwaDAxZGYyanM1MXcyczdnOGQifQ.zowAVbBakEIILncSsxCqiA";