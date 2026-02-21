// sketch.js

// 1. Dichiariamo una NUOVA variabile per la navigazione
// Usiamo 'pageState' invece di 'appState' per evitare conflitti con globals.js
let pageState = null; 
let currentId = null;

// Nota: NON ridichiariamo 'db' o 'rawData' perché esistono già in globals.js!

function setup() {
    noCanvas(); 

    // 1. CREA LO SCHELETRO FISSO
    initializeLayout(); 

    // 2. INIZIALIZZA LA NAVBAR (Una volta sola!)
    // La navbar ora si aggancia automaticamente a #app-header
    if (typeof setupNavbar === 'function') setupNavbar();

    // 3. --- INTEGRAZIONE HOME ---
    // Appena i dati sono pronti (db popolato), lanciamo il calcolo della Home.
    // Questo avverrà mentre l'utente guarda lo Splash Screen iniziale.
    if (typeof initHomeData === 'function') initHomeData();

    window.addEventListener('popstate', () => {
        gestisciRouting();
    });
    window.addEventListener('pushstate', () => {
        gestisciRouting();
    });

    gestisciRouting();
}

// Funzione di p5 che carica i dati PRIMA del setup
function preload() {
    // Carichiamo i dati dentro l'oggetto rawData che sta in globals.js
    rawData.cities = loadJSON("assets/data/cities.json");
    rawData.systems = loadJSON("assets/data/systems.json");
    rawData.lines = loadJSON("assets/data/lines.json");
    rawData.stations = loadJSON("assets/data/stations.json");
    rawData.station_lines = loadJSON("assets/data/station_lines.json");
    rawData.sections = loadJSON("assets/data/sections.json");
    rawData.section_lines = loadJSON("assets/data/section_lines.json");
    rawData.countries = loadJSON("assets/data/countries.json");

    // Caricamento font
    fonts.thin = loadFont('assets/fonts/P22_Underground_Thin.otf');
    fonts.light = loadFont('assets/fonts/P22_Underground_Light.otf');
    fonts.book = loadFont('assets/fonts/P22_Underground_Book.otf');
    fonts.medium = loadFont('assets/fonts/P22_Underground_Medium.otf');
    fonts.demibold = loadFont('assets/fonts/P22_Underground_DemiBold.otf');
    fonts.heavy = loadFont('assets/fonts/P22_Underground_Heavy.otf');
}

function draw() {
    // 1. Logica di Routing usando la nuova variabile 'pageState'
    switch(pageState) {
        case 'HOME':
            if (typeof drawHome === 'function') drawHome();
            break;
            
        case 'ABOUT':
            if (typeof drawAbout === 'function') drawAbout();
            break;
            
        case 'MAP':
            // Nel dettaglio usiamo Mapbox/DOM, il draw di p5 spesso non serve
            if (typeof drawMap === 'function') drawMap();
            break;
            
        case 'SPLASH':
             if (typeof drawSplash === 'function') drawSplash();
             break;
    }

    // Se layout.header e layout.footer esistono, gestiamo la loro visibilità
    if (layout.header && layout.footer) {
        if (pageState === 'SPLASH') {
            layout.header.addClass('hidden');
            layout.footer.addClass('hidden');
        } else {
            layout.header.removeClass('hidden');
            layout.footer.removeClass('hidden');
        }
    }

    // Logica visibilità pulsante Back
    if (pageState === "MAP") {
        btnBack.removeClass('invisible');
    } else {
        btnBack.addClass('invisible');
    }
}

function windowResized() {
    if (pageState === 'SPLASH') {
        // Chiama la funzione specifica dentro splash.js
        if (typeof resizeSplash === 'function') {
            resizeSplash();
        }
    } else {
        // Logica standard per altre pagine se necessario
        if (windowWidth >= 768 && pageState === 'HOME') {
            if (homeState && homeState.uiElements && homeState.uiElements.closeMobileSearch) {
                homeState.uiElements.closeMobileSearch();
            }
        }
    }
}