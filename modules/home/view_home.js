// modules/home/view_home.js

const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 768;
};

// Costanti grafiche
const CORNER_RADIUS = 5;
const PADDING = 2;

/**
 * Crea l'intera struttura DOM della Home con Flexbox per garantire visibilità
 */
function createHomeLayout() {
    // Il wrapper occupa tutta l'altezza (h-full) e non permette lo scroll (overflow-hidden)
    let wrapper = createDiv().parent(getContentContainer()).class("flex flex-col flex-1 min-h-0 overflow-hidden");

    // --- SEZIONE 1: HEADER CONTROLLI (Altezza fissa) ---
    let headerControls = createDiv().parent(wrapper).class("flex flex-col gap-3 shrink-0");
    let mainControlRow = createDiv().parent(headerControls).class("flex flex-row w-full gap-2 h-12 relative");

    // Barra di ricerca
    let searchWrapper = createDiv().parent(mainControlRow);
    searchWrapper.class("relative flex items-center w-12 md:w-64 shrink-0 md:px-3 border-2 border-neutral-900 rounded-lg bg-white shadow-sm transition-all duration-300 overflow-hidden");
    
    let searchIconDiv = createDiv().parent(searchWrapper).class("flex items-center justify-center text-gray-400 cursor-pointer md:cursor-default shrink-0 w-12 md:w-5 h-full");
    searchIconDiv.html('<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>');

    let input = createElement('input').parent(searchWrapper);
    input.attribute('type', 'text').attribute('placeholder', 'Search city...');
    input.class("w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none font-medium placeholder-gray-400 text-neutral-900 hidden md:block");
    input.input((e) => setHomeFilter('search', e.target.value));
    homeState.uiElements.searchInput = input;

    let clearBtn = createButton('').parent(searchWrapper);
    clearBtn.class("absolute right-20 md:right-2 flex items-center justify-center p-1 text-gray-400 hover:text-black cursor-pointer hidden rounded-full");
    clearBtn.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>');

    let closeMobileBtn = createButton('Cancel').parent(searchWrapper);
    closeMobileBtn.class("hidden md:hidden px-3 h-full text-xs font-bold text-black-600 hover:underline shrink-0");

    searchIconDiv.mousePressed(() => {
        if (windowWidth < 768) {
            searchWrapper.class("absolute inset-0 z-20 flex items-center transition-all duration-300 border-2 border-neutral-900 rounded-lg bg-white shadow-sm px-3 w-full");
            input.removeClass("hidden");
            closeMobileBtn.removeClass("hidden");
            input.elt.focus();
        }
    });

    closeMobileBtn.mousePressed(() => {
        searchWrapper.class("relative flex items-center transition-all duration-300 border-2 border-neutral-900 rounded-lg bg-white shadow-sm overflow-hidden px-0 md:px-3 w-12 md:w-64");
        input.addClass("hidden");
        closeMobileBtn.addClass("hidden");
        input.value('');
        setHomeFilter('search', ''); // Pulisce il filtro alla chiusura
        clearBtn.addClass('hidden');
    });

    clearBtn.mousePressed(() => {
        input.value('');
        setHomeFilter('search', '');
        clearBtn.addClass('hidden');
        input.elt.focus();
    });

    input.elt.addEventListener('input', () => {
        if (input.value().length > 0) clearBtn.removeClass('hidden');
        else clearBtn.addClass('hidden');
    });

    input.elt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = input.value().toLowerCase().trim();
            if (searchTerm.length > 0) {
                // Ricerca di una corrispondenza nei dati processati
                // Filtraggio x vedere quali nodi sono attualmente "attivi" o corrispondenti
                let matches = homeState.activeNodes.filter(n => 
                    n.name.toLowerCase().includes(searchTerm)
                );

                // Se c'è una corrispondenza univoca
                if (matches.length === 1) {
                    handleHomeClick(matches[0]);
                    
                    // Se su mobile, chiude la barra dopo l'invio
                    if (windowWidth < 768) {
                        cancelBtn.elt.click(); 
                    }
                }
            }
        }
    });

    homeState.uiElements.searchInput = input;

    const handleSearchNavigation = () => {
    const query = homeState.uiElements.searchInput.value().toLowerCase().trim();
    if (query.length === 0) return;

    // Cerchiamo tra i nodi processati (tutte le città disponibili)
    const matches = homeState.processedData.filter(city => 
        city.name.toLowerCase().startsWith(query)
    );

    // Se c'è un'unica corrispondenza (o se una corrisponde esattamente)
    if (matches.length === 1) {
        handleHomeClick(matches[0]);
    } else {
        // Se ci sono più match, controlla se uno è identico alla query
        const exactMatch = matches.find(m => m.name.toLowerCase() === query);
        if (exactMatch) handleHomeClick(exactMatch);
    }
    };

    // Filtri Continenti
    let contFilterContainer = createDiv().parent(mainControlRow).class("flex flex-1 gap-2 w-full font-semibold cursor-pointer select-none overflow-x-auto no-scrollbar");
    const continents = ['Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Africa'];
    const contColors = ['bg-blue-600', 'bg-red-700', 'bg-orange-500', 'bg-yellow-500', 'bg-green-600', 'bg-purple-600'];
    homeState.uiElements.continentBtns = {};

    continents.forEach((cont, i) => {
        let btn = createDiv(cont).parent(contFilterContainer);
        btn.class(`px-2 flex-1 flex items-center justify-center h-full text-sm text-white rounded-lg shadow text-center transition-all duration-300 hover:opacity-80 opacity-100 whitespace-nowrap ${contColors[i]}`);
        btn.mousePressed(() => setHomeFilter('continent', cont));
        homeState.uiElements.continentBtns[cont] = btn;
    });

    // --- SEZIONE 2: CANVAS CONTAINER (Flessibile) ---
    let canvasContainer = createDiv().parent(wrapper);
    canvasContainer.id('home-canvas-container');
    // flex-1 permette al canvas di occupare tutto lo spazio centrale
    canvasContainer.class("mt-4 w-full shadow-lg rounded-xl overflow-hidden bg-white relative flex-1 min-h-0");

    // --- SEZIONE 3: TIMELINE (Sempre visibile in basso) ---
    let timelineWrapper = createDiv().parent(wrapper).class(
        "w-full mt-0 lg:mt-6 py-9 lg:py-4 bg-white/50 rounded-xl flex flex-col md:flex-row items-center shrink-0"
    );

    let tlInfo = createDiv().parent(timelineWrapper).class("flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start w-full md:w-auto gap-1");
    createSpan("CITIES EXPANSION").parent(tlInfo).class("block text-[10px] font-semibold text-neutral-400 uppercase tracking-widest");
    let yearDisplay = createElement("h3", "2025").parent(tlInfo).class("text-3xl font-black text-neutral-700 tabular-nums");
    homeState.uiElements.yearDisplay = yearDisplay;

    let sliderContainer = createDiv().parent(timelineWrapper).class("flex-1 w-full md:w-auto flex items-center gap-6 ml-0 md:ml-2");
    let btnPlay = createButton(playIcon).parent(sliderContainer);
    btnPlay.class("rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2 shrink-0 mx-0 md:mx-2 my-4 md:my-0");
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
 * Tooltip della Home
 */
function createHomeTooltip(parent) {
    // Rimozione parent specifico e lo appendiamo al body o lo teniamo nel wrapper 
    // ma con logica di posizionamento assoluta rispetto alla finestra
    let tt = createDiv().parent(parent).id('home-tooltip');
    
    // Opacity-0 e pointer-events-none, x permettere al browser di calcolare le dimensioni (offsetW/H)
    tt.class("opacity-0 pointer-events-none fixed z-[9999] bg-neutral-900 text-white p-4 rounded-xl shadow-xl min-w-[200px] font-sans flex flex-col items-start transition-opacity duration-200");

    createSpan().parent(tt).id('tt-country').class("text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-1");
    createElement('h2', 'CITY NAME').parent(tt).id('tt-title').class("text-xl font-bold text-white leading-none mb-2 tracking-tight");

    let infoDiv = createDiv().parent(tt).class("flex gap-0.5 leading-snug");
    let lenWrapper = createDiv().parent(infoDiv).class("flex items-baseline gap-1.5 text-sm text-neutral-400");
    createSpan('0 km').parent(lenWrapper).id('tt-len').class("font-bold text-neutral-300 tabular-nums");

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
        text("No metro found", width/2, height/2);
        pop();
        hideHomeTooltip();
        return;
    }

    drawHomeNodes(state.activeNodes);
}

function drawHomeNodes(nodes) {
    const isMobile = windowWidth < 768;
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

        let isHover = !isMobile && wx >= dx && wx <= dx + dw && wy >= dy && wy <= dy + dh;
        if (isHover) foundHover = n;

        let isMatch = hasSearch && n.name.toLowerCase().includes(filterTxt);

        // GESTIONE COLORI
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

        // TESTO
        // Mostriamo il testo solo se c'è spazio E se non stiamo cercando OPPURE se è un match
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
    
    if (foundHover && !isMobile) {
        cursor(HAND);
        updateAndShowHomeTooltip(foundHover);
    } else {
        cursor(HAND);
        hideHomeTooltip();
    }
}

function mousePressed() {
if (pageState === 'HOME') {
        let targetNode = null;

        // Su mobile cerchiamo manualmente il nodo cliccato
        if (windowWidth < 768) {
            targetNode = homeState.activeNodes.find(n => 
                mouseX >= n.x + PADDING && 
                mouseX <= n.x + n.w - PADDING && 
                mouseY >= n.y + PADDING && 
                mouseY <= n.y + n.h - PADDING
            );
        } else {
            // Su desktop usiamo l'hover calcolato dal draw
            targetNode = homeState.hoveredNode;
        }

        if (targetNode) {
            handleHomeClick(targetNode);
            return false; // Prevenire default
        }
    }
}

function updateAndShowHomeTooltip(node) {
    let tt = select('#home-tooltip');
    if(!tt) return;
    
    // 1. Aggiorna i testi
    select('#tt-title').html(node.name.toUpperCase());
    select('#tt-len').html(Math.round(node.length) + " km");
    select('#tt-country').html(node.country);

    // 2. Rendi visibile per calcolare le dimensioni
    tt.style('opacity', '1');
    
    let ttWidth = tt.elt.offsetWidth;
    let ttHeight = tt.elt.offsetHeight;
    let margin = 15; // Margine dai bordi dello schermo

    // Coordinate mouse rispetto alla finestra (winMouseX/Y di p5)
    let mX = winMouseX;
    let mY = winMouseY;

    // LOGICA ORIZZONTALE
    let finalX = mX;
    let translateX = "-50%"; // Di default centrato sul mouse

    // Se lato sinistro tooltip esce dallo schermo
    if (mX - (ttWidth / 2) < margin) {
        translateX = "0%";
        finalX = margin;
    } 
    // Se lato destro esce dallo schermo
    else if (mX + (ttWidth / 2) > windowWidth - margin) {
        translateX = "-100%";
        finalX = windowWidth - margin;
    }

    // LOGICA VERTICALE (EVITA COPRIRE NAVBAR)
    let finalY = mY - 20; // Default: sopra il mouse
    let translateY = "-100%";

    // Se mouse è troppo in alto (vicino alla navbar e filtri, circa 120px) o se il tooltip uscirebbe dal bordo superiore
    if (mY - ttHeight - 20 < 120) {
        finalY = mY + 25; // Posiziona sotto il cursore
        translateY = "0%";
    }

    // 3. Applica i calcoli
    tt.style('left', finalX + 'px');
    tt.style('top', finalY + 'px');
    tt.style('transform', `translate(${translateX}, ${translateY})`);
}

function hideHomeTooltip() {
    let tt = select('#home-tooltip');
    if(tt) {
        tt.style('opacity', '0');
        // Spostiamo lontano per evitare che blocchi click involontari anche se opacity 0
        tt.style('left', '-500px'); 
    }
}