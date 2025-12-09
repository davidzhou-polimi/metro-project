// sketch.js - IL ROUTER (Corretto)

// 1. Dichiariamo una NUOVA variabile per la navigazione
// Usiamo 'pageState' invece di 'appState' per evitare conflitti con globals.js
let pageState = 'HOME'; 
let currentId = null;

// Nota: NON ridichiariamo 'db' o 'rawData' perché esistono già in globals.js!

function setup() {
    noCanvas(); 

    // 1. CREA LO SCHELETRO FISSO
    initializeLayout(); 

    // 2. INIZIALIZZA LA NAVBAR (Una volta sola!)
    // La navbar ora si aggancia automaticamente a #app-header
    if (typeof setupNavbar === 'function') setupNavbar();

    // 3. SETUP DATI E ROUTING
    // ... (Il resto del codice di caricamento dati rimane uguale) ...
    
    // GESTIONE URL
    let params = getURLParams();
    if (params.city_id) {
        changeState('DETAIL', params.city_id);
    } else {
        changeState('HOME');
    }
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
    // Se hai altri file, caricali qui
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
            
        case 'DETAIL':
            // Nel dettaglio usiamo Mapbox/DOM, il draw di p5 spesso non serve
            if (typeof drawDetail === 'function') drawDetail();
            break;
            
        case 'SPLASH':
             if (typeof drawSplash === 'function') drawSplash();
             break;
    }

    // 2. Elementi Sovrapposti (Sempre visibili tranne forse in splash)
    if (pageState !== 'SPLASH' && typeof drawNavbar === 'function') {
        drawNavbar();
    }
}

function windowResized() {
    // resizeCanvas(windowWidth, windowHeight); // Se usi canvas
}

// Funzione globale per cambiare pagina
function changeState(newState, param = null) {
    console.log(`ROUTER: Cambio stato da ${pageState} a ${newState}`);

    // --- 1. PULIZIA MIRATA (Strategia "Hunter-Killer") ---
    // Se la pulizia normale fallisce, cerchiamo gli elementi della Home e li cancelliamo a mano.
    
    // Rimuovi la griglia delle città (identificata dalle classi usate in home.js)
    const oldGrids = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2');
    oldGrids.forEach(grid => {
        console.log("ROUTER: Rimossa griglia residua", grid);
        grid.parentElement.remove(); // Rimuove il wrapper intero
    });

    // Rimuovi il titolo specifico della Home (per sicurezza)
    const allH1 = document.querySelectorAll('h1');
    allH1.forEach(h1 => {
        if (h1.textContent.includes("Seleziona una città")) {
            console.log("ROUTER: Rimosso titolo residuo", h1);
            h1.remove(); // Rimuove il titolo
        }
    });

    // Pulizia standard del contenitore principale
    const mainDiv = document.getElementById("main-content");
    if (mainDiv) mainDiv.innerHTML = "";
    
    // Pulizia processi
    if (pageState === 'DETAIL' && typeof removeDetail === "function") removeDetail();
    if (pageState === 'SPLASH' && typeof removeSplash === "function") removeSplash();

    // --- 2. AGGIORNAMENTO STATO ---
    pageState = newState;
    currentId = param;

    // --- 3. AVVIO NUOVA PAGINA ---
    if (newState === 'DETAIL') {
        if (!db.cities || db.cities.length === 0) processaDati();
        if (typeof enterDetail === "function") enterDetail(param); 
    } 
    else if (newState === 'HOME') {
        if (!db.cities || db.cities.length === 0) processaDati();
        if (typeof setupHome === "function") setupHome();
        
        if (window.history.pushState) {
             let newUrl = window.location.pathname;
             window.history.pushState({}, "Home", newUrl);
        }
    }
    else if (newState === 'SPLASH') {
        if (typeof setupSplash === "function") setupSplash();
    }
}

// Funzione di utilità per processare i dati (Unpack)
// La chiamiamo solo quando serve per evitare di bloccare il browser all'avvio se non serve
function processaDati() {
    console.log("Elaborazione dati in corso...");
    // unpackData deve essere disponibile globalmente (es. in helpers.js o utils.js)
    if(typeof unpackData === 'undefined') {
        console.error("ERRORE: unpackData non trovato! Controlla helpers.js");
        return;
    }

    db = {
        cities: unpackData(rawData.cities),
        systems: unpackData(rawData.systems),
        lines: unpackData(rawData.lines),
        stations: unpackData(rawData.stations),
        station_lines: unpackData(rawData.station_lines),
        sections: unpackData(rawData.sections),
        section_lines: unpackData(rawData.section_lines),
    };
    
    // Se hai un filtro dati
    if (typeof filterData === "function") {
        db = filterData(db);
    }
    console.log("Dati elaborati e pronti in 'db'");
}