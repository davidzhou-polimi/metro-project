// modules/home/home.js

let homeState = {
    processedData: [],      
    activeNodes: [],        
    filters: {
        year: 2025,
        continent: null,
        search: ""
    },
    hoveredNode: null,
    canvas: null,
    uiElements: {},
    animationInterval: null,
    isPlaying: false
};

function initHomeData() {
    if (db && db.cities && db.lines) {
        homeState.processedData = processHomeData(db);
        console.log("Home Data Initialized. Total Cities:", homeState.processedData.length);
    } else {
        console.error("Database not ready for Home initialization.");
    }
}

function setupHome() {
    let container = getContentContainer();
    container.html("");
    document.title = "Home - World Metro";
    
    // Reset filtri
    homeState.filters.year = 2025;
    homeState.filters.continent = null;
    homeState.filters.search = "";
    homeState.hoveredNode = null;

    if (homeState.processedData.length === 0) {
        console.warn("Home Data was not preloaded. Loading now...");
        initHomeData();
    }

    createHomeLayout(container);

    let canvasContainer = select('#home-canvas-container');
    
    // --- FIX CANVAS TAGLIATO ---
    // Creiamo il canvas inizialmente con dimensioni provvisorie
    // per assicurarci che sia nel DOM.
    homeState.canvas = createCanvas(100, 500);
    homeState.canvas.parent(canvasContainer);
    homeState.canvas.hide();    // Si nasconde per evitare glitch visivi
    
    textFont(fonts.heavy);

    // TRUCCO: Forziamo il resize dopo 50ms.
    // Questo dà tempo al browser di calcolare flexbox e scrollbar.
    setTimeout(() => {
        onHomeResize();
        homeState.canvas.show();
    }, 50);

    aggiornaTreemap();
    updateHomeTimelineBackground(select("#home-timeline-slider"));
    
    window.addEventListener('resize', onHomeResize);
}

function drawHome() {
    drawHomeCanvas(homeState);
}

function removeHome() {
    stopHomeAnimation(); 

    window.removeEventListener('resize', onHomeResize);
    
    if (homeState.canvas) {
        homeState.canvas.remove(); 
        homeState.canvas = null;
    }
    
    hideHomeTooltip();
    
    homeState.uiElements = {};
    homeState.hoveredNode = null;
    homeState.animationInterval = null;
    homeState.isPlaying = false;

    let container = getContentContainer();
    if (container) {
        container.html("");
    }
}

// --- UTILS ---

function setHomeFilter(type, value) {
    if (type === 'continent') {
        if (homeState.filters.continent === value) homeState.filters.continent = null;
        else homeState.filters.continent = value;
        updateContinentButtonsUI(homeState.filters.continent);
    } 
    else if (type === 'year') {
        homeState.filters.year = parseInt(value);
        if(homeState.uiElements.yearDisplay) {
            homeState.uiElements.yearDisplay.html(homeState.filters.year);
        }
    }
    else if (type === 'search') {
        homeState.filters.search = value.toLowerCase();
    }

    // Aggiorniamo sempre la treemap per riflettere i cambiamenti (colori o dimensioni)
    aggiornaTreemap();
}

function onHomeResize() {
    let container = select('#home-canvas-container');
    if (container && homeState.canvas) {
        // Usa getBoundingClientRect per la larghezza reale (inclusi decimali)
        let rect = container.elt.getBoundingClientRect();
        let w = rect.width;
        // Altezza calcolata: 60% viewport ma minimo 500px
        let h = Math.max(windowHeight * 0.60, 500);
        
        // Se la larghezza è quasi 0 (bug rendering), non ridimensionare ancora
        if (w > 10) {
            resizeCanvas(w, h);
            aggiornaTreemap();
        }
    }
}

function aggiornaTreemap() {
    // 1. Filtra i dati (Anno, Continente) - La ricerca NON toglie più i nodi
    let filtered = filterHomeData(homeState.processedData, homeState.filters);
    
    // 2. Calcola layout usando le dimensioni attuali del canvas
    homeState.activeNodes = calculateTreemapLayout(filtered, width, height);
}

function handleHomeClick(node) {
    stopHomeAnimation();

    if (node && node.id) {
        let originalCity = db.cities.find(c => c.id == node.id);

        if (originalCity) {
            console.log("Navigazione verso:", originalCity.name);
            changeState('MAP', originalCity.id); 
        } else {
            console.error("Città non trovata nel DB:", node.id);
        }
    }
}