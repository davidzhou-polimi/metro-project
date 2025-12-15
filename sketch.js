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
    
    // Icone
    // resetIcon = loadStrings('assets/images/reset.svg');
    // playIcon = loadStrings('assets/images/play.svg');
    // pauseIcon = loadStrings('assets/images/pause.svg');
    // backIcon = loadStrings('assets/images/back.svg');
    // homeIcon = loadStrings('assets/images/home.svg');
    // aboutIcon = loadStrings('assets/images/about.svg');
}

// function setup() {
    // resetIcon = resetIcon.join(' ');
    // playIcon = playIcon.join(' ');
    // pauseIcon = pauseIcon.join(' ');
    // backIcon = backIcon.join(' ');
    // homeIcon = homeIcon.join(' ');
    // aboutIcon = aboutIcon.join(' ');
// }

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

    // Logica visibilità pulsante Back
    if (pageState === "MAP") {
        btnBack.removeClass('invisible');
    } else {
        btnBack.addClass('invisible');
    }
}

function windowResized() {
    if (pageState === 'SPLASH') {
        let container = getContentContainer();
        if (container) {
            // Ridimensiona il canvas in base alla nuova larghezza/altezza del padre
            resizeCanvas(container.elt.clientWidth, container.elt.clientHeight);
        }
    }
}