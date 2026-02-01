// modules/map/map.js

function setupMap() {
    // Non serve nulla qui, l'inizializzazione avviene in enterMap
}

function drawMap() {
    // Vuoto, Mapbox gestisce il rendering
}

function enterMap(cityId) {
    let container = getContentContainer();
    console.log("Sto per pulire questo elemento:", container.elt);
    console.log("Contenuto HTML attuale:", container.html());
    container.html("");
    
    let targetCity = db.cities.find((c) => c.id == cityId);
    
    if (targetCity) {
        // Chiama la funzione principale che sta dentro view_map.js
        inizializzaMappa(targetCity);
    } else {
        console.error("Città non trovata!");
        changeState('HOME');
    }
}

// In map.js
function removeMap() {
    sidebarExpanded = false; // Reset variabile globale

    let container = getContentContainer();
    if (container) {
        // Ripristina lo stato di default del layout.js
        container.class("flex-grow w-full relative min-h-[calc(100svh-4.5rem)] mx-auto p-4 md:p-8 overflow-hidden");
        container.style("height", ""); // Rimuove stili inline
        container.style("min-height", "");
        container.html(""); 
    }

    if (typeof mappa !== "undefined" && mappa) {
        mappa.remove();
        mappa = null;
    }
    if (typeof stopAnimation === "function") stopAnimation();
}