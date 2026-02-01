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

function removeMap() {
    // Chiama le funzioni di pulizia di view_map (se esistono) o distrugge mapbox
    if (typeof mappa !== "undefined" && mappa) {
        mappa.remove();
        mappa = null;
    }
    // Ferma animazioni timeline
    if (typeof stopAnimation === "function") stopAnimation();
    
    // Pulisce HTML
    let container = getContentContainer();
    container.removeClass("overflow-hidden");

    if (layout.main) {
        layout.main.removeClass("lg:overflow-hidden"); // Libera il main per About
    }

    select('body').style('overflow', 'auto');
    
    container.html("");
}