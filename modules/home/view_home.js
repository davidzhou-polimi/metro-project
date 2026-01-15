// modules/home/view_home.js

// Costanti grafiche
const CORNER_RADIUS = 5;
const PADDING = 2;

/**
 * Crea l'intera struttura DOM della Home
 */
function createHomeLayout() {
    let wrapper = createDiv().parent(getContentContainer()).class("flex flex-col w-full mx-auto relative");

    // --- SEZIONE 1: HEADER CONTROLLI ---
    let headerControls = createDiv().parent(wrapper).class("flex flex-col gap-3");

// INIZIO INTERVENTO CHIARA

// Altezza fissa alla riga per garantire uniformità (h-12 = 48px)
    let mainControlRow = createDiv().parent(headerControls).class("flex flex-row w-full gap-2 h-12");

    // --- BARRA DI RICERCA (Nuova Struttura) ---
    
    // 1. Il wrapper ora è il "rettangolo" visibile. 
    // - border-2: Bordo leggermente più sottile ed elegante.
    // - flex items-center: Allinea icona e testo perfettamente al centro verticale.
    // - bg-white: Lo sfondo è qui.
    let searchWrapper = createDiv().parent(mainControlRow);
    searchWrapper.class("relative flex items-center w-64 shrink-0 px-3 border-2 border-neutral-900 rounded-lg bg-white shadow-sm transition-colors");
    
    // 2. L'icona è un elemento flex statico (non più absolute).
    let searchIconDiv = createDiv().parent(searchWrapper).class("flex items-center text-gray-400 mr-2"); // mr-2 da spazio al testo
    searchIconDiv.html('<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>');

    // 3. L'input non ha bordi, è trasparente e riempie lo spazio rimanente.
    let input = createElement('input').parent(searchWrapper);
    input.attribute('type', 'text').attribute('placeholder', 'Search city or country...');
    
    // - w-full: Occupa tutto lo spazio rimasto nel flex.
    // - bg-transparent: Per vedere lo sfondo del wrapper.
    // - border-none / outline-none: Rimuove lo stile di default.
    // - h-full: Per assicurare che il click funzioni ovunque.
    input.class("w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none font-medium placeholder-gray-400 text-neutral-900");
    
    input.input((e) => setHomeFilter('search', e.target.value));
    homeState.uiElements.searchInput = input;

    // 4. Tasto Clear (rimane absolute o può diventare flex, qui lo lascio absolute per stare a destra estrema)
    let clearBtn = createButton('').parent(searchWrapper);
    clearBtn.class("absolute right-2 flex items-center justify-center p-1 text-gray-400 hover:text-red-500 cursor-pointer hidden rounded-full hover:bg-gray-100");
    clearBtn.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>');
    clearBtn.mousePressed(() => {
        input.value('');
        setHomeFilter('search', '');
        clearBtn.addClass('hidden');
        input.elt.focus(); // Riporta il focus sull'input dopo aver cancellato
    });
    
    input.elt.addEventListener('input', () => {
        if(input.value().length > 0) clearBtn.removeClass('hidden');
        else clearBtn.addClass('hidden');
    });
    
    // Focus effect: Quando clicchi l'input, illumina il bordo del WRAPPER (più elegante)
    input.elt.addEventListener('focus', () => searchWrapper.addClass('ring-1 ring-neutral-900 border-neutral-900'));
    input.elt.addEventListener('blur', () => searchWrapper.removeClass('ring-1 ring-neutral-900 border-neutral-900'));


    // --- FILTRI CONTINENTI (Adattati al nuovo stile) ---

    let contFilterContainer = createDiv().parent(mainControlRow).class("flex flex-1 gap-2 w-full font-semibold cursor-pointer select-none overflow-x-auto no-scrollbar");
    
    const continents = ['Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Africa'];
    const contColors = ['bg-blue-600', 'bg-red-700', 'bg-orange-500', 'bg-yellow-500', 'bg-green-600', 'bg-purple-600'];

    homeState.uiElements.continentBtns = {};

    continents.forEach((cont, i) => {
        let btn = createDiv(cont).parent(contFilterContainer);
        // Aggiunto "h-full" esplicitamente per sicurezza, anche se flex-stretch lo fa già
        btn.class(`px-2 flex-1 flex items-center justify-center h-full text-sm md:text-base text-white rounded-lg shadow text-center transition-all duration-300 hover:opacity-80 opacity-100 whitespace-nowrap ${contColors[i]}`);
        btn.mousePressed(() => setHomeFilter('continent', cont));
        homeState.uiElements.continentBtns[cont] = btn;
    });
    
    // FINE INTERVENTO CHIARA

    // --- SEZIONE 2: CANVAS CONTAINER ---
    let canvasContainer = createDiv().parent(wrapper);
    canvasContainer.id('home-canvas-container');
    canvasContainer.class("mt-8 w-full shadow-lg rounded-xl overflow-hidden bg-white relative");

    // --- SEZIONE 3: TIMELINE ---
    let timelineWrapper = createDiv().parent(wrapper).class(
        "mt-12 px-4 rounded-xl flex flex-col md:flex-row items-center gap-4"
    );

    let tlInfo = createDiv().parent(timelineWrapper).class("w-full md:w-auto flex flex-col justify-center min-w-[100px]");
    createSpan("CITIES EXPANSION").parent(tlInfo).class("block text-[10px] font-semibold text-neutral-400 uppercase tracking-widest");
    
    let yearDisplay = createElement("h3", "2025").parent(tlInfo).class("text-3xl font-black text-neutral-700 tabular-nums");
    homeState.uiElements.yearDisplay = yearDisplay;

    let sliderContainer = createDiv().parent(timelineWrapper).class("w-full md:flex-1 flex items-center gap-4 px-2");
    
    let btnPlay = createButton(playIcon).parent(sliderContainer);
    btnPlay.class("rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnPlay.mousePressed(() => toggleHomePlayback());
    homeState.uiElements.playBtn = btnPlay;

    let sliderWrapper = createDiv().parent(sliderContainer).class("flex-grow relative");

    let slider = createElement("input").parent(sliderWrapper);
    slider.id("home-timeline-slider");
    slider.attribute("type", "range");
    slider.attribute("min", "1863");
    slider.attribute("max", "2025");
    slider.attribute("value", "2025");
    slider.class("w-full metro-slider cursor-pointer");
    slider.input(() => updateHomeTimelineBackground(slider));
    
    homeState.uiElements.slider = slider;

    let labels = createDiv().parent(sliderWrapper).class("flex justify-between text-xs text-neutral-400 font-bold mt-1 uppercase");
    createSpan("1863").parent(labels);
    createSpan("2025").parent(labels);

    // --- TOOLTIP ---
    createHomeTooltip(wrapper);
}

function updateHomeTimelineBackground(slider) {
    let val = parseInt(slider.value());
    if (homeState.isPlaying) toggleHomePlayback(false); 
    
    const min = 1863; const max = 2025;
    const perc = ((val - min) / (max - min)) * 100;
    slider.style("background", `linear-gradient(to right, #171717 ${perc}%, #D4D4D4 ${perc}%)`);
    
    setHomeFilter('year', val);
}

/**
 * Crea il tooltip della Home con lo stile "Dark Mode Minimal"
 * (Sfondo scuro, tipografia pulita, ombreggiatura morbida)
 */
function createHomeTooltip(parent) {
    // 1. Container: Sfondo scuro, angoli arrotondati, ombra morbida, posizione fissa
    let tt = createDiv().parent(parent).id('home-tooltip');
    // Usa neutral-900 per lo sfondo scuro, p-5 per spaziatura interna, shadow-2xl per profondità
    tt.class("hidden fixed z-50 bg-neutral-900 text-white p-4 rounded-xl shadow-xl min-w-[200px] font-sans pointer-events-none flex flex-col items-start");

    // Piccola, grigia, tutta maiuscola, tracciamento largo
    createSpan().parent(tt).id('tt-country').class("text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-1");

    // 3. Nome Città Principale (es. "MILAN")
    // Grande, bianco, grassetto pesante
    createElement('h2', 'CITY NAME').parent(tt).id('tt-title').class("text-xl font-bold text-white leading-none mb-2 tracking-tight");

    // 4. Dettagli Sottostanti (Country & Length)
    let infoDiv = createDiv().parent(tt).class("flex gap-0.5 leading-snug");
    
    // Length (es. "102 km") - Testo leggermente più scuro, numerico tabulare
    // Aggiungiamo un prefisso "Total length:" per chiarezza, stile sottotitolo
    let lenWrapper = createDiv().parent(infoDiv).class("flex items-baseline gap-1.5 text-sm text-neutral-400");
    //createSpan('Total length:').parent(lenWrapper).class("font-medium");
    createSpan('0 km').parent(lenWrapper).id('tt-len').class("font-bold text-neutral-300 tabular-nums");

    // 5. CTA (Opzionale ma consigliata per UX)
    // Molto sottile in fondo, separata da una linea scura
    let cta = createDiv().parent(tt).class("mt-4 pt-3 w-full border-t border-neutral-700");
    createDiv('CLICK TO EXPLORE MAP').parent(cta).class("text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em] text-center");
}

function updateContinentButtonsUI(selectedValues) {
    let btns = homeState.uiElements.continentBtns;
    for (let key in btns) {
        if (selectedValues === null) {
            btns[key].style('opacity', '1');
        } else {
            if (key === selectedValues) {
                btns[key].style('opacity', '1');
            } else {
                btns[key].style('opacity', '0.4'); // Più trasparenza per evidenziare meglio
            }
        }
    }
}

// --- P5 DRAWING LOGIC ---

function drawHomeCanvas(state) {
    background(255);

    if (!state.activeNodes || state.activeNodes.length === 0) {
        push();
        fill(150); textAlign(CENTER, CENTER); textSize(16); noStroke();
        textFont(fonts.medium);
        text("Nessuna metropolitana trovata.", width/2, height/2);
        pop();
        hideHomeTooltip();
        return;
    }

    drawHomeNodes(state.activeNodes);
}

function drawHomeNodes(nodes) {
    let wx = mouseX;
    let wy = mouseY;
    let foundHover = null;
    let filterTxt = homeState.filters.search;
    let hasSearch = filterTxt.length > 0; // Flag: stiamo cercando qualcosa?

    // ... (SPECIAL_SPLITS resta uguale) ...
    const SPECIAL_SPLITS = {
        "GUANGZHOU": "GUANG\nZHOU", "SHANGHAI": "SHANG\nHAI", "SHENZHEN": "SHEN\nZHEN",
        "CHONGQING": "CHONG\nQING", "HONG KONG": "HONG\nKONG", "NEW YORK": "NEW\nYORK",
        "NEW DELHI": "NEW\nDELHI", "MEXICO CITY": "MEXICO\nCITY", "LOS ANGELES": "LOS\nANGELES",
        "SAN FRANCISCO": "SAN\nFRANCISCO", "KUALA LUMPUR": "KUALA\nLUMPUR",
        "ST. PETERSBURG": "ST.\nPETERSBURG", "WASHINGTON": "WASH\nINGTON"
    };

    for (let n of nodes) {
        let dx = n.x + PADDING;
        let dy = n.y + PADDING;
        let dw = Math.max(0, n.w - PADDING * 2);
        let dh = Math.max(0, n.h - PADDING * 2);

        if (dw < 1 || dh < 1) continue;

        let isHover = wx >= dx && wx <= dx + dw && wy >= dy && wy <= dy + dh;
        if (isHover) foundHover = n;

        let isMatch = hasSearch && n.name.toLowerCase().includes(filterTxt);

        // --- GESTIONE COLORI ---
        let nodeColor = color(n.color);

        if (hasSearch) {
            if (isMatch) {
                // MATCH: Colore pieno + Bordo Spesso
                fill(nodeColor);
                stroke(0); 
                strokeWeight(3);
            } else {
                // NO MATCH: Colore sbiadito + Nessun bordo
                nodeColor.setAlpha(90); // Molto trasparente per far risaltare gli altri
                fill(nodeColor);
                noStroke();
            }
        } else {
            // NESSUNA RICERCA: Comportamento normale
            fill(nodeColor);
            if (isHover) {
                fill(lerpColor(nodeColor, color(255), 0.2));
            }
            noStroke();
        }

        rect(dx, dy, dw, dh, CORNER_RADIUS);

        // --- TESTO ---
        // Mostriamo il testo solo se c'è spazio E (se non stiamo cercando OPPURE se è un match)
        // Questo pulisce la vista durante la ricerca
        if (dw > 20 && dh > 20 && (!hasSearch || isMatch)) {
            fill(255); noStroke(); textAlign(LEFT, TOP);
            
            let label = n.name.toUpperCase();
            
            // ... (Calcolo dimensionamento testo resta uguale) ...
             let targetSize = Math.sqrt(n.size) * 2.8; 
            targetSize = constrain(targetSize, 10, 50);
            
            let sideMargin = 6;
            let availableW = dw - (sideMargin * 2);

            textSize(targetSize);
            let w1 = textWidth(label);
            let size1 = targetSize;
            if (w1 > availableW) size1 = targetSize * (availableW / w1) * 0.95;

            let label2 = SPECIAL_SPLITS[label] || (label.includes(" ") ? label.replace(" ", "\n") : null);
            let size2 = 0;
            if (label2) {
                let parts = label2.split("\n");
                textSize(targetSize);
                let maxW = Math.max(textWidth(parts[0]), textWidth(parts[1]));
                let sizeByW = (maxW > availableW) ? targetSize * (availableW / maxW) * 0.95 : targetSize;
                let sizeByH = (dh - (sideMargin * 2)) / 2.1;
                size2 = Math.min(sizeByW, sizeByH, targetSize);
            }

            let finalSize = size1;
            let finalLabel = label;
            if (label2 && size2 > size1 * 1.2) {
                finalSize = size2;
                finalLabel = label2;
            }

            if (finalSize > 6) {
                textSize(finalSize);
                textLeading(finalSize * 0.95);
                text(finalLabel, dx + sideMargin, dy + sideMargin);
            }
        }
    }

    homeState.hoveredNode = foundHover;
    
    if (foundHover) {
        cursor(HAND);
        updateAndShowHomeTooltip(foundHover);
    } else {
        cursor(ARROW);
        hideHomeTooltip();
    }
}

function mousePressed() {
    // FIX: Rendi il controllo più robusto
    // Controlla che siamo sulla Home e che il mouse sia sopra il canvas (hoveredNode non è null)
    if (pageState === 'HOME' && homeState.hoveredNode) {
        // Importante: Controlliamo se il click non è stato intercettato da un elemento UI sopra
        // ma poiché hoveredNode è calcolato su mouseX/Y del canvas, dovrebbe essere OK.
        handleHomeClick(homeState.hoveredNode);
        return false; // Prevenire default
    }
}

function updateAndShowHomeTooltip(node) {
    let tt = select('#home-tooltip');
    if(!tt) return;
    
    select('#tt-title').html(node.name);
    select('#tt-len').html(Math.round(node.length) + " km");
    select('#tt-country').html(node.country);

    // FIX: Calcolo posizione per 'fixed' position
    // Usiamo winMouseX e winMouseY di p5 (coordinate finestra)
    let posX = winMouseX;
    let posY = winMouseY;

    tt.style('left', posX + 'px');
    tt.style('top', (posY - 20) + 'px'); 
    tt.style('transform', 'translate(-50%, -100%)'); 
    
    tt.removeClass('hidden');
}

function hideHomeTooltip() {
    let tt = select('#home-tooltip');
    if(tt) tt.addClass('hidden');
}