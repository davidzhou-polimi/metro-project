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
    
    // Reset Variabili
    homeState.filters.year = 2025;
    homeState.filters.continent = null;
    homeState.filters.search = "";
    homeState.hoveredNode = null;

    if (homeState.processedData.length === 0) {
        initHomeData();
    }

    createHomeLayout(container);

    let canvasContainer = select('#home-canvas-container');
    // Necessario affinché il sipario assoluto si posizioni rispetto a questo container
    canvasContainer.style('position', 'relative'); 

    // --- FIX SIPARIO: COPERTURA TEMPORANEA ---
    // Creiamo un div bianco che copre tutto. 
    // Nasconde il glitch del resize ("sfumature radiali") ma lascia il canvas attivo sotto.
    let curtain = createDiv('');
    curtain.parent(canvasContainer);
    curtain.style('position', 'absolute');
    curtain.style('inset', '0'); // Copre tutto (top, left, right, bottom)
    curtain.style('background-color', 'white'); 
    curtain.style('z-index', '50'); // Sta sopra il canvas

    // --- IL TUO CODICE DI RICICLAGGIO (INVARIATO) ---
    let existingCanvas = select('canvas');
    
    if (existingCanvas) {
        homeState.canvas = existingCanvas;
        homeState.canvas.parent(canvasContainer);
        
        // AGGIUNTA IMPORTANTE: Pulisce subito i vecchi pixel della mappa
        // prima ancora che il browser provi a ridimensionarli/stirarli.
        clear(); 
        background(255); 
        
    } else {
        homeState.canvas = createCanvas(100, 100); 
        homeState.canvas.parent(canvasContainer);
    }

    // CSS: Assicurati che sia visibile e occupi spazio
    homeState.canvas.style('display', 'block');
    homeState.canvas.style('width', '100%');
    homeState.canvas.style('height', '100%');
    homeState.canvas.style('visibility', 'visible');
    
    textFont(fonts.heavy);

    // Timeout per il resize e il riavvio
    setTimeout(() => {
        // Le tue operazioni standard
        onHomeResize(); 
        aggiornaTreemap(); 
        
        loop(); 
        drawHome(); 
        
        // --- FIX SIPARIO: RIMOZIONE ---
        // Ora che il drawHome ha disegnato il frame pulito sotto il sipario,
        // possiamo rimuovere il sipario.
        curtain.remove();
        
    }, 50); // 50ms sono impercettibili ma sufficienti a nascondere il glitch

    updateHomeTimelineBackground(select("#home-timeline-slider"));
    window.addEventListener('resize', onHomeResize);
}

function drawHome() {
    drawHomeCanvas(homeState);
}

function removeHome() {
    stopHomeAnimation(); 
    window.removeEventListener('resize', onHomeResize);
    
    // --- NON DISTRUGGERE IL CANVAS ---
    // Rimuoviamo solo il riferimento nello stato locale, 
    // ma lasciamo l'elemento DOM vivo finché non viene "adottato" dalla prossima pagina
    // o finché setupHome non lo riprende.
    
    // Se proprio vuoi essere pulito, puoi nasconderlo, 
    // ma setupHome lo renderà visibile con .style('display', 'block')
    if (homeState.canvas) {
        // homeState.canvas.hide(); // Opzionale
        homeState.canvas = null; 
    }
    
    hideHomeTooltip();
    
    homeState.uiElements = {};
    homeState.hoveredNode = null;
    homeState.animationInterval = null;
    homeState.isPlaying = false;

    let container = getContentContainer();
    if (container) {
        // Questo rimuove il div padre, il canvas diventerà orfano momentaneamente,
        // ma setupHome lo ritroverà con select('canvas').
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
        
        // Ottieni le dimensioni reali
        let rect = container.elt.getBoundingClientRect();
        let w = rect.width;
        
        // Se per qualche motivo w è 0 (es. cambio pagina veloce),
        // proviamo a prendere la larghezza della finestra come fallback temporaneo
        // per evitare che il canvas sparisca.
        if (w < 10) {
            w = container.elt.clientWidth || (windowWidth - 40); 
        }

        // Altezza calcolata: 60% viewport ma minimo 500px
        let h = Math.max(windowHeight * 0.60, 500);
        
        // Eseguiamo il resize solo se abbiamo valori sensati
        if (w > 10 && h > 10) {
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