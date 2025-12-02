// --- FUNZIONE PRINCIPALE (ORCHESTRATOR) ---

let lineCoordinatesMap; 

function inizializzaMappa(city) {
    // 1. Pulizia e Setup Stato
    if (typeof mappa !== 'undefined' && mappa) {
        mappa.remove();
        mappa = null;
    }
    vistaAttuale = "mappa";
    appState.activeCityId = city.id;
    appState.isolatedLineId = null;
    stopAnimation();
    document.title = `${city.name} - Metro World`; 
    aggiornaURL(city.id);

    calcolaRangeAnni(city.id);

    let container = select("#app-container");
    container.html("");

    creaNavbar(container, city);
    
    let contentWrapper = createDiv().parent(container).class("flex flex-col lg:flex-row h-[75vh] gap-4");
    
    let mapWrapper = creaContenitoreMappa(contentWrapper); 
    let sidebar = creaSidebar(contentWrapper, city);       
    creaTimeline(container);                               

    lineCoordinatesMap = new Map(); 
    avviaMapbox(city, mapWrapper, lineCoordinatesMap);
}

// --- MODULO 1: UTILITY & CALCOLI ---
function aggiornaURL(cityId) {
    if (window.history.pushState) {
        let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?city_id=${cityId}`;
        window.history.pushState({ path: newurl }, "", newurl);
    }
}

function calcolaRangeAnni(cityId) {
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let firstEventYear = 2025;
    let hasValidYears = false;
    let lineIds = new Set(cityLines.map((l) => l.id));

    let filteredSectionLines = db.section_lines.filter((sl) => sl.city_id === cityId && lineIds.has(sl.line_id));
    let validSectionIds = new Set(filteredSectionLines.map((sl) => sl.section_id));
    let citySections = db.sections.filter((s) => validSectionIds.has(s.id));

    for (let s of citySections) {
        let b = parseYear(s.buildstart);
        let o = parseYear(s.opening);
        if (b && b > 1800 && b < firstEventYear) { firstEventYear = b; hasValidYears = true; }
        if (o && o > 1800 && o < firstEventYear) { firstEventYear = o; hasValidYears = true; }
    }

    appState.maxYear = 2025;
    
    // Salviamo questo stato per usarlo nella creazione UI
    appState.hasValidHistory = hasValidYears;

    if (!hasValidYears) {
        // NESSUN DATO STORICO: Iniziamo direttamente dalla fine
        appState.minYear = 2000; // Valore dummy
       appState.currentYear = appState.maxYear; 
    } else {
        // ABBIAMO DATI: Comportamento normale
        appState.minYear = firstEventYear - 1;
        appState.currentYear = appState.minYear;
    }
}

// --- MODULO 2: UI BUILDING BLOCKS ---

function creaNavbar(container, city) {
    let navBar = createDiv().parent(container).class("flex items-center justify-between mb-4 pb-2 border-b border-slate-100");
    let btnBack = createButton("Torna indietro");
    btnBack.parent(navBar).class("bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 font-medium transition-colors text-sm");
    btnBack.mousePressed(creaListaCitta);

    let titleContainer = createDiv().parent(navBar).class("text-right");
    createElement("h2", city.name).parent(titleContainer).class("text-3xl font-extrabold text-slate-800 tracking-tight");
    createElement("div", city.country).parent(titleContainer).class("text-sm text-slate-500 font-semibold uppercase tracking-wider");
}

function creaContenitoreMappa(parentWrapper) {
    // Wrapper principale (relativo)
    let wrapper = createDiv().parent(parentWrapper);
    wrapper.class("w-full lg:w-3/4 h-full rounded-xl overflow-hidden shadow-lg relative border border-slate-200 bg-slate-50");

    // 1. IL LOADER (Visibile subito)
    let loaderDiv = createDiv().parent(wrapper);
    loaderDiv.id("map-loader");
    loaderDiv.class("absolute inset-0 flex flex-col items-center justify-center z-10 bg-white transition-opacity duration-500");
    
    // --- SPINNER CON TAILWIND ---
    let spinner = createDiv().parent(loaderDiv);
    spinner.class("w-12 h-12 border-8 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4");

    // Testo sotto lo spinner
    createSpan("Loading map...").parent(loaderDiv).class("text-slate-400 text-sm font-semibold tracking-wide uppercase");

    // 2. LA MAPPA (Invisibile all'inizio)
    let mapDivNativo = document.createElement("div");
    mapDivNativo.id = "map";
    mapDivNativo.className = "absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000"; 
    
    wrapper.elt.appendChild(mapDivNativo);
    mappaContainer = select("#map");

    return wrapper;
}

function creaSidebar(parentWrapper, city) {
    let sidebar = createDiv().parent(parentWrapper);
    sidebar.class("w-full lg:w-1/4 h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col");

    // Header Sidebar
    let sbHeader = createDiv().parent(sidebar).class("p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center");
    createSpan("Sistemi & Linee").parent(sbHeader).class("font-bold text-slate-700");
    let btnReset = createButton("Mostra tutto").parent(sbHeader);
    btnReset.class("text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer");
    btnReset.mousePressed(() => resetFiltriMappa());

    // Contenuto Sidebar
    let sbContent = createDiv().parent(sidebar).class("flex-1 overflow-y-auto p-2");
    
    // Popolamento Linee
    let datiCitta = getDatiCitta(city.id);
    if (datiCitta.length === 0) {
        createP("Nessuna linea trovata.").parent(sbContent).class("p-4 text-slate-500 italic");
        return sidebar;
    }

    // --- NUOVO: ORDINAMENTO ALFABETICO ---
    
    // 1. Ordina i SISTEMI (es. Metro prima di Tram, o A-Z)
    datiCitta.sort((a, b) => {
        let nameA = a.name.toUpperCase();
        let nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    // 2. Ordina le LINEE dentro ogni sistema (es. M1, M2, M3...)
    // Usiamo localCompare con numeric:true per ordinare correttamente "M1, M2, M10" (non M1, M10, M2)
    for (let system of datiCitta) {
        system.lines.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }
    // -------------------------------------

    for (let system of datiCitta) {
        costruisciSistemaUI(system, sbContent);
    }
    
    updateSidebarStats();
    return sidebar;
}

function costruisciSistemaUI(system, container) {
    let sysDetail = createElement("details").parent(container).class("group mb-2");
    sysDetail.attribute("open", "true");
    
    let sysSummary = createElement("summary").parent(sysDetail);
    sysSummary.class("cursor-pointer font-bold text-slate-800 p-2 bg-slate-100 rounded hover:bg-slate-200 select-none flex justify-between items-center");
    createSpan(system.name).parent(sysSummary);
    
    let badge = createSpan(`${system.lines.length} linee`);
    badge.parent(sysSummary).class("text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 ml-2");

    let linesDiv = createDiv().parent(sysDetail).class("pl-2 mt-1 space-y-1");

    for (let line of system.lines) {
        costruisciLineaUI(line, linesDiv);
    }
}

function costruisciLineaUI(line, container) {
    let lineDetail = createElement("details").parent(container).class("group/line");
    let lineSummary = createElement("summary").parent(lineDetail);
    lineSummary.class("cursor-pointer p-2 rounded hover:bg-slate-50 text-sm flex flex-col items-start gap-1 select-none transition-colors");

    let headerLine = createDiv().parent(lineSummary).class("flex items-center gap-2 w-full");
    let hexColor = fixColor(line.color);
    createSpan("").parent(headerLine).class("w-3 h-3 rounded-full shadow-sm block flex-shrink-0").style("background-color", hexColor);
    createSpan(line.name).parent(headerLine).class("font-medium text-slate-700");

    let statsContainer = createDiv().parent(lineSummary);
    statsContainer.id(`line-stats-${line.id}`);
    statsContainer.class("flex flex-wrap gap-1 ml-5 mt-1");

    let stationsDiv = createDiv().parent(lineDetail);
    stationsDiv.id(`stations-list-${line.id}`);
    stationsDiv.class("pl-6 border-l-2 border-slate-100 ml-3 mt-1 space-y-1");
}

/**
 * Popola l'elenco delle stazioni per ogni linea, dopo che i dati delle coordinate sono pronti.
 * Questa funzione viene chiamata dopo l'avvio della mappa.
 */
function popolaStazioniUI(cityId) {
    let datiCitta = getDatiCitta(cityId);
    for (let system of datiCitta) {
        for (let line of system.lines) {
            let stationsDiv = select(`#stations-list-${line.id}`);
            if (!stationsDiv) continue;

            // Puliamo il contenitore per evitare duplicati se chiamato più volte
            stationsDiv.html("");

            if (line.stations.length > 0) {
                // --- ORDINAMENTO GEOGRAFICO AVANZATO ---
                // Usa la logica del Baricentro + Backtracking
                let sortedStations = ordinaStazioniNaturalmente(line.stations);

                let btnShowLine = createDiv("Isola linea").parent(stationsDiv);
                btnShowLine.class("text-xs font-bold text-indigo-600 cursor-pointer py-1 mb-1 hover:underline");
                btnShowLine.mousePressed(() => isolaLineaSullaMappa(line.id));

                for (let station of sortedStations) {
                    let stElem = createDiv(station.name).parent(stationsDiv);
                    stElem.class("text-xs text-slate-600 hover:text-indigo-600 cursor-pointer py-1 truncate");
                    stElem.mousePressed(() => zoomSuStazione(station));
                }
            } else {
                createDiv("Nessuna stazione.").parent(stationsDiv).class("text-xs text-slate-400 italic py-1");
            }
        }
    }
}

function creaTimeline(container) {
    let timelineWrapper = createDiv().parent(container).class("mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4");
    
    if (!appState.hasValidHistory) {
        timelineWrapper.class("mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 italic text-sm");
        timelineWrapper.html("Dati storici di costruzione non disponibili per questa città.");
        return;
    }

    let tlInfo = createDiv().parent(timelineWrapper).class("w-full md:w-1/6 flex flex-col justify-center");
    createSpan("EVOLUZIONE RETE").parent(tlInfo).class("block text-[10px] font-bold text-slate-400 uppercase tracking-widest");
    let yearDisplay = createElement("h3", appState.minYear).parent(tlInfo).class("text-3xl font-black text-indigo-600 tabular-nums");

    let sliderContainer = createDiv().parent(timelineWrapper).class("w-full md:w-5/6 flex items-center gap-4 px-2");
    
    // Bottone Play
    let btnPlay = createButton("PLAY").parent(sliderContainer);
    btnPlay.id("btn-play");
    btnPlay.attribute("disabled", "true");
    btnPlay.class("w-16 h-10 flex-shrink-0 bg-slate-200 text-slate-400 rounded-md flex items-center justify-center font-bold text-xs cursor-not-allowed transition-colors tracking-wider");
    btnPlay.mousePressed(() => togglePlayback());

    let sliderWrapper = createDiv().parent(sliderContainer).class("flex-grow relative");
    
    // Slider
    let slider = createElement("input").parent(sliderWrapper);
    slider.id("timeline-slider");
    slider.attribute("type", "range");
    slider.attribute("min", appState.minYear);
    slider.attribute("max", appState.maxYear);
    slider.attribute("value", appState.minYear);
    slider.attribute("step", "1");
    slider.attribute("disabled", "true");
    slider.class("w-full metro-slider cursor-not-allowed opacity-50 grayscale");

    let labels = createDiv().parent(sliderWrapper).class("flex justify-between text-xs text-slate-400 font-bold mt-1 uppercase");
    createSpan(appState.minYear).parent(labels);
    createSpan(appState.maxYear).parent(labels);

    slider.input(() => {
        let val = parseInt(slider.value());
        appState.currentYear = val;
        yearDisplay.html(val);
        aggiornaFiltriCombinati();
        if (appState.isPlaying) togglePlayback(false);
    });
}

function sbloccaControlliTimeline() {
    let btnPlay = select("#btn-play");
    if (btnPlay) {
        btnPlay.removeAttribute("disabled");
        btnPlay.class("w-16 h-10 flex-shrink-0 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer tracking-wider");
    }

    let slider = select("#timeline-slider");
    if (slider) {
        slider.removeAttribute("disabled");
        slider.class("w-full metro-slider cursor-pointer");
    }
}

// --- MODULO 3: MAPBOX LOGIC & ANIMATION ---

function avviaMapbox(city, mapWrapper, lineCoordinatesMap) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    mappa = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/davidzhoupolimi/cmieolleq000t01qubidr1mfe",
        center: [0, 0], 
        zoom: 1,
        attributionControl: false,
        projection: 'mercator',
    });

    mappa.addControl(new mapboxgl.AttributionControl(), "bottom-right");
    mappa.addControl(new mapboxgl.NavigationControl(), "top-right");
    mappa.addControl(new mapboxgl.ScaleControl());

    mappa.on("load", () => {
        mappa.resize();
        mappa.once("idle", () => {
            let loader = select("#map-loader");

            if (loader) loader.addClass("opacity-0");
            mappaContainer.removeClass("opacity-0");

            setTimeout(() => {
                if (loader) loader.remove();
                
                disegnaElementiMappa(city.id, city.name);
                aggiungiInterazioniMappa();
                popolaStazioniUI(city.id); 
                
            }, 600);
        });
    });
}

function isolaLineaSullaMappa(lineId) {
    // Se clicco su una linea già isolata, resetto.
    if (appState.isolatedLineId === lineId) {
        resetFiltriMappa();
    } else {
        appState.isolatedLineId = lineId;
        aggiornaFiltriCombinati();
    }
}

function resetFiltriMappa() {
    appState.isolatedLineId = null;
    // Se siamo in playback, fermiamolo per evitare confusione
    if (appState.isPlaying) togglePlayback(false);
    aggiornaFiltriCombinati();
}

function updateSidebarStats() {
    let year = appState.currentYear;
    let cityLines = db.lines.filter((l) => l.city_id == appState.activeCityId);
    
    // Usiamo lo stesso fallback della Mappa
    let endOfTime = appState.maxYear || 2025; 

    for (let line of cityLines) {
        let spanId = `#line-stats-${line.id}`;
        let container = select(spanId);
        if (!container) continue;

        let rels = db.section_lines.filter((sl) => sl.line_id === line.id);
        let sections = rels.map((r) => db.sections.find((s) => s.id === r.section_id)).filter((s) => s);

        let kmOp = 0;
        let kmCons = 0;

        for (let s of sections) {
            let len = s.length || 0;
            if (len > 100) len = len / 1000;
            
            let b = parseYear(s.buildstart);
            let o = parseYear(s.opening);
            
            // 1. FIX DATI SPORCHI (UGUALE A LOGIC_MAP)
            if (b && b < 1800) b = null;
            if (o && o < 1800) o = null;

            // 2. LOGICA "SNAPSHOT" vs "COSTRUZIONE" (UGUALE A LOGIC_MAP)
            if (!o) {
                if (b) { o = 9999; } else { o = endOfTime; }
            }

            if (!b) {
                if (o !== endOfTime) b = o;
                else b = endOfTime;
            }
            
            // 3. CALCOLO STATO
            let closure = parseYear(s.closure) || 9999;
            let isOp = o <= year && closure > year;
            let isCons = b <= year && o > year;

            if (isOp) kmOp += len;
            if (isCons) kmCons += len;
        }

        // --- STAZIONI (Logica semplificata per UI) ---
        let stationRels = db.station_lines.filter((sl) => sl.line_id === line.id);
        let visibleStationCount = 0;
        
        for (let rel of stationRels) {
            let station = db.stations.find((s) => s.id === rel.station_id);
            if (station) {
                let b = parseYear(station.buildstart);
                let o = parseYear(station.opening);
                let c = parseYear(station.closure) || 9999;
                
                if (b && b < 1800) b = null;
                if (o && o < 1800) o = null;

                if (!o) {
                     if (b) o = 9999;
                     else o = endOfTime;
                }
                
                if (o <= year && c > year) {
                    visibleStationCount++;
                }
            }
        }

        let htmlParts = [];
        if (visibleStationCount > 0) {
            let label = visibleStationCount === 1 ? "STAZIONE" : "STAZIONI";
            htmlParts.push(`<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">${visibleStationCount} ${label}</span>`);
        }
        if (kmCons > 0) {
            htmlParts.push(`<span class="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">IN COSTRUZIONE: ${kmCons.toFixed(1)}km</span>`);
        }
        if (kmOp > 0) {
            htmlParts.push(`<span class="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">OPERATIVI: ${kmOp.toFixed(1)}km</span>`);
        }
        if (sections.length === 0 && stationRels.length === 0) {
            htmlParts.push(`<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">DATI MANCANTI</span>`);
        }
        container.html(htmlParts.join(""));
    }
}

// --- FUNZIONE MST + SUBTREE SIZE (vicoli ciechi prima) ---
function ordinaStazioniNaturalmente(stations) {
    if (!stations || stations.length < 2) return stations;

    // 1. Preparazione Nodi e MST (Invariato, funziona bene)
    let nodes = stations.map((s, i) => {
        let coords = parseGeometry(s.geometry);
        return coords ? { original: s, coords: coords, adj: [], visited: false } : null;
    }).filter(s => s !== null);

    if (nodes.length === 0) return stations;

    // Costruzione MST semplice (Distanza Euclidea)
    let edges = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            let dx = nodes[i].coords[0] - nodes[j].coords[0];
            let dy = nodes[i].coords[1] - nodes[j].coords[1];
            let distSq = dx*dx + dy*dy;
            if (distSq < 0.05 * 0.05) edges.push({ u: i, v: j, w: distSq });
        }
    }
    edges.sort((a, b) => a.w - b.w);

    let parent = new Array(nodes.length).fill(0).map((_, i) => i);
    function find(i) { return parent[i] === i ? i : parent[i] = find(parent[i]); }
    function union(i, j) {
        let rootI = find(i);
        let rootJ = find(j);
        if (rootI !== rootJ) { parent[rootI] = rootJ; return true; } return false;
    }

    for (let e of edges) {
        if (union(e.u, e.v)) {
            nodes[e.u].adj.push(nodes[e.v]);
            nodes[e.v].adj.push(nodes[e.u]);
        }
    }

    // 2. Identifica Start (Ovest)
    let leaves = nodes.filter(n => n.adj.length === 1);
    if (leaves.length === 0) leaves = nodes;
    leaves.sort((a, b) => a.coords[0] - b.coords[0]);
    let startNode = leaves[0];

    // 3. DFS Principale
    let finalOrder = [];
    let stack = [startNode];
    startNode.visited = true;

    // Funzione per contare i nodi nel ramo (Senza visitare davvero)
    function getBranchSize(node, fromNode) {
        let size = 1;
        let q = [node];
        let seen = new Set([fromNode, node]); // Blocchiamo il ritorno
        
        while(q.length > 0) {
            let curr = q.shift();
            for (let n of curr.adj) {
                // Conta solo nodi non visitati globalmente (ancora da fare)
                // E non tornare indietro verso 'fromNode'
                if (!n.visited && !seen.has(n)) {
                    seen.add(n);
                    size++;
                    q.push(n);
                }
            }
        }
        return size;
    }

    while (stack.length > 0) {
        let curr = stack.pop();
        finalOrder.push(curr.original);

        let neighbors = curr.adj.filter(n => !n.visited);

        if (neighbors.length > 0) {
            // Calcola dimensioni rami
            let weightedNeighbors = neighbors.map(n => {
                return { node: n, size: getBranchSize(n, curr) };
            });

            // ORDINAMENTO STACK:
            // Vogliamo estrarre PRIMA i rami PICCOLI (Size basso).
            // Stack LIFO: Ultimo Inserito = Primo Estratto.
            // Quindi inseriamo: [Grande, Medio, Piccolo].
            // Estrazione: Piccolo -> Medio -> Grande.
            
            // Ordiniamo per Size DECRESCENTE (Grande -> Piccolo)
            // Array: [Romolo(20), Abbiategrasso(1)]
            // Push Romolo (Fondo). Push Abbiategrasso (Cima).
            // Pop -> Abbiategrasso.
            
            weightedNeighbors.sort((a, b) => b.size - a.size);

            for (let wn of weightedNeighbors) {
                wn.node.visited = true;
                stack.push(wn.node);
            }
        }
    }

    // Recupero isole
    let unvisited = nodes.filter(n => !n.visited);
    if (unvisited.length > 0) {
        unvisited.sort((a, b) => a.coords[0] - b.coords[0]);
        for (let n of unvisited) finalOrder.push(n.original);
    }

    return finalOrder;
}