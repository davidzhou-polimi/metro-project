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
    isPlaying: false,
    resizeObserver: null
};

let touchStartX = 0;
let touchStartY = 0;
const SCROLL_THRESHOLD = 10; // Pixel di tolleranza

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
    container.class("h-[calc(100vh-4.5rem)] max-h-screen flex flex-col p-4 overflow-hidden");
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
    canvasContainer.style('position', 'relative');
    canvasContainer.style('flex', '1 1 auto'); // Il canvas si espande per riempire lo spazio
    canvasContainer.style('width', '100%');
    canvasContainer.style('min-height', '200px'); 

    // --- GESTIONE CANVAS ---
    let existingCanvas = select('canvas');
    if (existingCanvas) {
        homeState.canvas = existingCanvas;
        homeState.canvas.parent(canvasContainer);
    } else {
        homeState.canvas = createCanvas(100, 100); 
        homeState.canvas.parent(canvasContainer);
    }

    pixelDensity(window.devicePixelRatio);

    homeState.canvas.style('display', 'block');
    homeState.canvas.style('position', 'absolute');
    homeState.canvas.style('top', '0');
    homeState.canvas.style('left', '0');
    homeState.canvas.style('width', '100%');
    homeState.canvas.style('height', '100%');
    
    homeState.canvas.style('z-index', '1');
    homeState.canvas.style('opacity', '1');
    homeState.canvas.style('visibility', 'visible');

    textFont(fonts.heavy);

    // --- OBSERVER ---
    if (homeState.resizeObserver) homeState.resizeObserver.disconnect();

    homeState.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (width < 10 || height < 10) return;

            resizeCanvas(Math.floor(width), Math.floor(height));
            
            homeState.canvas.style('width', '100%');
            homeState.canvas.style('height', '100%');

            background(255); 
            aggiornaTreemap();
            loop(); 
            drawHome();
        }
    });

    homeState.resizeObserver.observe(canvasContainer.elt);
    updateHomeTimelineBackground(select("#home-timeline-slider"));
}

function mousePressed() {
    touchStartX = mouseX;
    touchStartY = mouseY;
}

function mouseReleased() {
    // Calcolo di quanto si è spostato il dito/mouse
    let distance = dist(touchStartX, touchStartY, mouseX, mouseY);

    // Se lo spostamento è superiore alla soglia, l'utente sta scrollando
    if (distance > SCROLL_THRESHOLD) {
        return; // Interrompe la funzione, non scatta il click
    }

    // Se così, è un click intenzionale
    if (homeState.hoveredNode) {
        handleHomeClick(homeState.hoveredNode);
    }
}

function drawHome() {
    drawHomeCanvas(homeState);
}

function removeHome() {
    stopHomeAnimation(); 

    // --- SPEGNI L'OBSERVER ---
    if (homeState.resizeObserver) {
        homeState.resizeObserver.disconnect();
        homeState.resizeObserver = null;
    }
    
    // Non serve più rimuovere l'event listener manuale
    // window.removeEventListener('resize', onHomeResize);
    
    // Non distruggere il canvas, lascialo per il riciclo
    if (homeState.canvas) {
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