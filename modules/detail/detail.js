// modules/detail/detail.js

function setupDetail() {
    // Non serve nulla qui, l'inizializzazione avviene in enterDetail
}

function drawDetail() {
    // Vuoto, Mapbox gestisce il rendering
}

function enterDetail(cityId) {
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

function removeDetail() {
    // Chiama le funzioni di pulizia di view_map (se esistono) o distrugge mapbox
    if (typeof mappa !== "undefined" && mappa) {
        mappa.remove();
        mappa = null;
    }
    // Ferma animazioni timeline
    if (typeof stopAnimation === "function") stopAnimation();
    
    // Pulisce HTML
    let container = getContentContainer();
    container.html("");
}