// core/router.js

// Funzione globale per cambiare pagina: pulisce lo vecchio stato, avvia quello nuovo e chiede di aggiornare l'URL.
function changeState(newState, param = null) {
    console.log(`ROUTER: Cambio stato da ${pageState} a ${newState}`);

    // --- 1. PULIZIA ---

    // Pulizia standard del contenitore principale
    const mainDiv = getContentContainer();
    if (mainDiv) mainDiv.innerHTML = "";
    
    // Pulizia processi
    if (pageState === 'SPLASH' && typeof removeSplash === "function") removeSplash();
    if (pageState === 'HOME' && typeof removeHome === "function") removeHome();
    if (pageState === 'MAP' && typeof removeMap === "function") removeMap();
    if (pageState === 'ABOUT' && typeof removeAbout === "function") removeAbout();

    // --- 2. AGGIORNAMENTO STATO ---
    pageState = newState;
    currentId = param;

    sincronizzaURL();

    let params = new URLSearchParams();
    params.set("page", newState.toLowerCase());

    // --- 3. AVVIO NUOVA PAGINA ---
    window.scrollTo(0, 0);

    if (newState === 'MAP') {
        if (!db.cities || db.cities.length === 0) processaDati();
        if (typeof enterMap === "function") enterMap(param);
        params.set("city_id", param);
    } 
    else if (newState === 'HOME') {
        if (!db.cities || db.cities.length === 0) processaDati();
        if (typeof setupHome === "function") setupHome();
        
        /*if (window.history.pushState) {
             let newUrl = window.location.pathname;
             window.history.pushState({}, "Home", newUrl);
        }*/
    }
    else if (newState === 'ABOUT') {
        if (typeof setupAbout === "function") setupAbout();
    }
    else {
        if (typeof setupSplash === "function") setupSplash();
    }
}

// Riflette lo stato attuale nell'URL.
function sincronizzaURL() {
    if (!window.history.pushState) return;

    let params = new URLSearchParams();

    switch (pageState) {
        case 'ABOUT':
            params.set('page', 'about');
            break;
        case 'MAP':
            params.set('page', 'map');
            if(currentId) {
                params.set('city_id', currentId);
                break;
            }
        case 'HOME':
            params.set('page', 'home');
            break;
        case 'SPLASH':
        default:
            // Splash potrebbe non avere parametri o essere la root
            //params.set('page', 'splash');
    }

    let baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    let queryString = params.toString();

    // Aggiungi il '?' SOLO se queryString non è vuota
    let newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    // Aggiorna solo se diverso
    if (window.location.href !== newUrl) {
        window.history.pushState({ path: newUrl }, "", newUrl);
    }
}

// Decide lo stato in base ai parametri URL.
function gestisciRouting() {
    let params = getURLParams();

    switch (params.page) {
        case "about":
            changeState('ABOUT');
            break;
        case "map":
            if(params.city_id) {
                changeState('MAP', params.city_id);
                break;
            }
        case "home":
            changeState('HOME');
            break;
        case "splash":
        default:
            changeState('SPLASH');
    }
}