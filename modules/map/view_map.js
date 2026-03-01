// --- FUNZIONE PRINCIPALE (ORCHESTRATOR) ---

let lineCoordinatesMap;
let currentPopup = null;

function inizializzaMappa(city) {
    Tooltip.init();

    // 1. Pulizia e Setup Stato
    if (typeof mappa !== "undefined" && mappa) {
        mappa.remove();
        mappa = null;
    }
    appState.activeCityId = city.id;
    appState.hiddenLineIds = [];

    stopAnimation();
    document.title = `${city.name} – World Metro`;
    //sincronizzaURL();

    calcolaRangeAnni(city.id);

    let container = getContentContainer();
    container.html("");
    container.class(
        "min-h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-4.5rem)] flex flex-col p-4 overflow-hidden",
    );

    let contentWrapper = createDiv()
        .parent(container)
        .class(
            "flex flex-col lg:flex-row flex-1 min-h-0 gap-4 overflow-hidden relative",
        );

    let mapWrapper = creaContenitoreMappa(contentWrapper);
    let sidebar = creaSidebar(contentWrapper, city);
    creaTimeline(container);

    lineCoordinatesMap = new Map();
    avviaMapbox(city, mapWrapper, lineCoordinatesMap);
}

// --- MODULO 1: UTILITY & CALCOLI ---
function calcolaRangeAnni(cityId) {
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let firstEventYear = CURRENT_YEAR;
    let hasValidYears = false;
    let lineIds = new Set(cityLines.map((l) => l.id));

    let filteredSectionLines = db.section_lines.filter(
        (sl) => sl.city_id === cityId && lineIds.has(sl.line_id),
    );
    let validSectionIds = new Set(
        filteredSectionLines.map((sl) => sl.section_id),
    );
    let citySections = db.sections.filter((s) => validSectionIds.has(s.id));

    for (let s of citySections) {
        let b = parseYear(s.buildstart);
        let o = parseYear(s.opening);
        if (b && b < firstEventYear) {
            firstEventYear = b;
            hasValidYears = true;
        }
        if (o && o < firstEventYear) {
            firstEventYear = o;
            hasValidYears = true;
        }
    }

    let filteredStationLines = db.station_lines.filter(
        (sl) => sl.city_id === cityId && lineIds.has(sl.line_id),
    );
    let validStationIds = new Set(
        filteredStationLines.map((sl) => sl.station_id),
    );
    let cityStations = db.stations.filter((s) => validStationIds.has(s.id));

    for (let st of cityStations) {
        let b = parseYear(st.buildstart);
        let o = parseYear(st.opening);
        if (b && b < firstEventYear) {
            firstEventYear = b;
            hasValidYears = true;
        }
        if (o && o < firstEventYear) {
            firstEventYear = o;
            hasValidYears = true;
        }
    }

    appState.maxYear = CURRENT_YEAR;
    appState.hasValidHistory = hasValidYears;

    if (!hasValidYears) {
        appState.minYear = 2000;
        appState.currentYear = appState.maxYear;
    } else {
        appState.minYear = firstEventYear - 1;
        appState.currentYear = appState.minYear;
    }
}

function calcolaLunghezzaRete(cityId, systemLineIds = null, year = null) {
    return calculateNetworkLength(cityId, {
        lineIds: systemLineIds,
        year: year,
        formatted: true
    });
}

// --- MODULO 2: UI BUILDING BLOCKS ---

function creaContenitoreMappa(parentWrapper) {
    let wrapper = createDiv().parent(parentWrapper);
    wrapper.class(
        "w-full lg:w-3/4 h-[40vh] lg:h-full rounded-xl overflow-hidden relative bg-neutral-50 shadow-sm flex-shrink-0 lg:flex-shrink",
    );

    let loaderDiv = createDiv().parent(wrapper);
    loaderDiv.id("map-loader");
    loaderDiv.class(
        "absolute inset-0 flex flex-col items-center justify-center z-10 bg-white transition-opacity duration-500",      
    );

    let spinner = createDiv().parent(loaderDiv);
    spinner.class(
        "w-8 h-8 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mb-4",
    );

    createSpan("Loading map...")
        .parent(loaderDiv)
        .class(
            "text-neutral-500 text-sm font-semibold tracking-wide uppercase",
        );

    let mapDivNativo = document.createElement("div");
    mapDivNativo.id = "map";
    mapDivNativo.className =
        "absolute inset-0 w-full h-full opacity-0 transition-opacity duration-1000";

    wrapper.elt.appendChild(mapDivNativo);
    mappaContainer = select("#map");

    return wrapper;
}

function creaSidebar(parentWrapper, city) {
    let sidebar = createDiv().parent(parentWrapper);
    sidebar.class(
        "w-full lg:w-1/4 lg:h-full bg-white rounded-2xl border-[6px] border-neutral-900 flex flex-col flex-1 shadow-lg overflow-hidden transition-[max-height] duration-500 ease-in-out sidebar-mobile-container",
    );

    let sbHeader = createDiv()
        .parent(sidebar)
        .class(
            "px-3 pt-0 lg:pt-3 pb-4 bg-neutral-900 flex justify-between items-center cursor-pointer lg:cursor-default",  
        );
    let titleContainer = createDiv().parent(sbHeader).class("flex flex-col");

    let titleRow = createDiv()
        .parent(titleContainer)
        .class("flex items-center gap-2");
    let mobileChevron = createSpan(icons.chevron)
        .parent(titleRow)
        .class(
            "text-neutral-50 transition-transform duration-300 lg:hidden mobile-chevron-icon -rotate-90",
        );

    createElement("h2", city.name)
        .parent(titleContainer)
        .class(
            "text-2xl font-bold text-neutral-50 tracking-tight leading-none",
        );

    createElement("div", city.country)
        .parent(titleContainer)
        .class(
            "text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1 lg:ml-0 ml-7",
        );

    sbHeader.mouseClicked(() => {
        if (mouseButton !== LEFT) return;
        if (window.innerWidth < 1024) {
            sidebar.toggleClass("mobile-expanded");
            mobileChevron.toggleClass("rotate-0");
        }
    });

    let kmTotali = calcolaLunghezzaRete(city.id);
    let statsDiv = createDiv()
        .parent(titleContainer)
        .class("flex items-center gap-2 mt-2 lg:ml-0 ml-7");

    createSpan("NETWORK LENGTH")
        .parent(statsDiv)
        .class(
            "text-[10px] leading-none font-bold text-neutral-300 bg-neutral-700 px-2 py-1.5 rounded-md",
        );

    let kmSpan = createSpan(`${kmTotali} km`)
        .parent(statsDiv)
        .class("text-sm font-bold text-neutral-300 tabular-nums");
    kmSpan.id("header-total-km");

    /*createSpan("Sistemi & Linee")
        .parent(sbHeader)
        .class("font-bold text-neutral-700");*/
    let btnReset = createButton(icons.reset).parent(sbHeader);
    btnReset.id("btn-reset");
    btnReset.attribute("disabled", "true");
    btnReset.class(
        "rounded-full bg-neutral-700 text-neutral-500 cursor-not-allowed p-2",
    );

    btnReset.elt.addEventListener("mouseenter", () => {
        Tooltip.show(
            `<span class="font-bold block">Reset map view</span>`,
            btnReset.elt,
            { placement: 'bottom' }
        );
    });
    btnReset.elt.addEventListener("mouseleave", () => Tooltip.hide());

    btnReset.mouseClicked(() => {
        if (mouseButton !== LEFT) return;
        Tooltip.hide();
        resetFiltriMappa();
    });

    let sbContent = createDiv()
        .parent(sidebar)
        .id("sidebar-systems-list")
        .class("flex-1 overflow-y-auto px-1.5 py-1 custom-scrollbar");

    let datiCitta = getDatiCitta(city.id);
    if (datiCitta.length === 0) {
        createP("No line found.")
            .parent(sbContent)
            .class("p-4 text-neutral-500 italic");
        return sidebar;
    }

    datiCitta.sort((a, b) => {
        let nameA = a.name.toUpperCase();
        let nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    for (let system of datiCitta) {
        system.lines.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base",
            });
        });
    }

    for (let system of datiCitta) {
        costruisciSistemaUI(system, sbContent);
    }

    updateSidebarStats();
    return sidebar;
}

window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
        let sidebar = select(".sidebar-mobile-container");
        let chevron = select(".mobile-chevron-icon");
        if (sidebar) sidebar.removeClass("mobile-expanded");
        if (chevron) chevron.removeClass("rotate-0");
    }
});

function costruisciSistemaUI(system, container) {
    let sysDetail = createElement("details")
        .parent(container)
        .class("group");
    sysDetail.attribute("open", "true");

    sysDetail.attribute("data-system-name", system.name);

    let sysSummary = createElement("summary").parent(sysDetail);
    sysSummary.class(
        "group/dropdown cursor-pointer font-bold text-neutral-900 px-1.5 pt-3 hover:text-neutral-700 transition-colors duration-300 select-none flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2",
    );

    let leftSide = createDiv()
        .parent(sysSummary)
        .class("flex items-center gap-0.5");

    createSpan(icons.chevron)
        .class(
            "-rotate-90 group-open:rotate-0 transition duration-300 ease-out",
        )
        .parent(leftSide);

    createSpan(system.name).parent(leftSide);

    let rightSide = createDiv()
        .parent(sysSummary)
        .class("flex items-center gap-2");

    let systemLineIds = system.lines.map((l) => l.id);
    let kmSistema = calcolaLunghezzaRete(null, systemLineIds);

    createSpan(`${kmSistema} km`)
        .parent(rightSide)
        .class(
            "text-xs font-medium text-neutral-600 bg-white border border-neutral-300 px-2 py-1.5 rounded",
        );

    let lineCount = system.lines.length;
    let labelLinee = lineCount === 1 ? "line" : "lines";
    createSpan(`${lineCount} ${labelLinee}`)
        .parent(rightSide)
        .class("text-xs font-normal text-neutral-400");

    let linesDiv = createDiv().parent(sysDetail).class("flex flex-col gap-2 pt-3 pb-2");

    for (let line of system.lines) {
        costruisciLineaUI(line, linesDiv);
    }
}

function costruisciLineaUI(line, container) {
    let lineDetail = createElement("details")
        .parent(container)
        .class("group/line relative");

    lineDetail.id("line-wrapper-" + line.id);

    let hexColor = fixColor(line.color);
    let useBlack = isColorLight(hexColor);

    // Controlliamo stato iniziale
    let isHidden = appState.hiddenLineIds && appState.hiddenLineIds.includes(line.id);

    let lineSummary = createElement("summary").parent(lineDetail);

    // IMPORTANTE: Assegniamo un ID nativo per trovarlo dopo con document.getElementById
    lineSummary.id(`line-summary-${line.id}`);

    // Classi Base
    let baseClasses = "cursor-pointer p-1.5 rounded-xl hover:opacity-80 flex flex-col items-start gap-1 select-none transition-all duration-300 shadow";

    lineSummary.class(`${baseClasses} ${isHidden ? "opacity-50 hover:opacity-70" : ""}`)
        .style("background-color", hexColor)
        .style("color", useBlack ? "#000000" : "#ffffff");

    lineSummary.elt.addEventListener("click", (e) => {
        // Verifica stato corrente (non solo quello all'avvio)
        let currentHidden = appState.hiddenLineIds && appState.hiddenLineIds.includes(line.id);

        if (currentHidden) {
            e.preventDefault(); // BLOCCA L'APERTURA
            e.stopPropagation();

            // 1. Aggiungi animazione shake
            let el = document.getElementById(`line-summary-${line.id}`);
            if (el) {
                el.classList.add("animate-shake");
                // Rimuovi dopo 300ms
                setTimeout(() => el.classList.remove("animate-shake"), 300);
            }

            // 2. Mostra Tooltip
            let elToggle = document.getElementById(`line-toggle-btn-${line.id}`);
            if(elToggle) {
                Tooltip.show(
                    `<span class="font-bold text-red-400 block">Line disabled</span>
                    <span class="text-neutral-400 font-normal">Unhide to view stations</span>`,
                    elToggle,
                    {
                        placement: 'left',
                        duration: 1500,
                    }
                );
            }
        }
    });

    let headerLine = createDiv()
        .parent(lineSummary)
        .class("flex items-center justify-between w-full relative");

    let leftSideGroup = createDiv()
        .parent(headerLine)
        .class("flex items-center gap-0.5");

    createSpan(icons.chevron)
        .parent(leftSideGroup)
        .class("-rotate-90 group-open/line:rotate-0 transition duration-300 ease-out");

    createSpan(line.name)
        .parent(leftSideGroup)
        .class("font-semibold opacity-100");

    // --- ICONE DI AZIONE ---
    let currentIcon = isHidden ? icons.showLine : icons.hideLine;

    let buttonGroup = createDiv()
        .parent(headerLine)
        .class("flex items-center z-10");

    // --- ICONA OCCHIO ---
    let lineToggleBtn = createSpan(currentIcon)
        .parent(buttonGroup)
        .class("cursor-pointer p-1 rounded-full hover:bg-black/10 transition-colors relative");

    lineToggleBtn.id(`line-toggle-btn-${line.id}`);

    // --- ICONA ISOLA ---
    let lineIsolateBtn = createSpan(icons.isolate)
        .parent(buttonGroup)
        .class("cursor-pointer p-1 rounded-full hover:bg-black/10 transition-colors relative");

    lineIsolateBtn.id(`line-isolate-btn-${line.id}`);

    // --- TOOLTIP ---
    lineToggleBtn.elt.addEventListener("mouseenter", () => {
        Tooltip.show(
            `<span class="font-bold block">Hide/Show line</span>
            <span class="text-neutral-400 font-normal">Toggle line visibility</span>`,
            lineToggleBtn.elt,
            { placement: 'left' }
        );
    });

    lineToggleBtn.elt.addEventListener("mouseleave", () => Tooltip.hide());

    lineIsolateBtn.elt.addEventListener("mouseenter", () => {
        Tooltip.show(
            `<span class="font-bold block">Isolate line</span>
            <span class="text-neutral-400 font-normal">Hide all other lines</span>`,
            lineIsolateBtn.elt,
            { placement: 'left' }
        );
    });

    lineIsolateBtn.elt.addEventListener("mouseleave", () => Tooltip.hide());

    lineToggleBtn.elt.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Tooltip.hide();
        toggleVisibilitaLinea(line.id);
    });

    lineIsolateBtn.elt.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Tooltip.hide();
        isolaSoloQuestaLinea(line.id);
    });

    let statsContainer = createDiv().parent(lineSummary);
    statsContainer.id(`line-stats-${line.id}`);
    statsContainer.class("w-full grid grid-cols-3 gap-1.5");

    let stationsDiv = createDiv().parent(lineDetail);
    stationsDiv.id(`stations-list-${line.id}`);
    stationsDiv.class("pl-6 border-l-2 border-neutral-200 ml-5 mt-2 space-y-1");
}

// Funzione 1: Toggle semplice (Click)
function toggleVisibilitaLinea(lineId) {
    if (!appState.hiddenLineIds) appState.hiddenLineIds = [];

    const index = appState.hiddenLineIds.indexOf(lineId);

    if (index > -1) {
        // Era nascosto -> MOSTRA (Rimuovi da blacklist)
        appState.hiddenLineIds.splice(index, 1);
    } else {
        // Era visibile -> NASCONDI (Aggiungi a blacklist)
        appState.hiddenLineIds.push(lineId);
    }

    // --- LOGICA AUTO-CLOSE: Se nascondo, chiudo il dettaglio ---
    if (isNowHidden) {
        let details = document.getElementById(`line-wrapper-${lineId}`);
        if (details && details.hasAttribute("open")) {
            details.removeAttribute("open");
        }
    }

    applicaCambiamentiVisibilita();
}

function toggleVisibilitaLinea(lineId) {
    if (!appState.hiddenLineIds) appState.hiddenLineIds = [];

    const index = appState.hiddenLineIds.indexOf(lineId);
    let isNowHidden = false;

    if (index > -1) {
        // Era nascosto -> MOSTRA
        appState.hiddenLineIds.splice(index, 1);
        isNowHidden = false;
    } else {
        // Era visibile -> NASCONDI
        appState.hiddenLineIds.push(lineId);
        isNowHidden = true;
    }

    // --- LOGICA AUTO-CLOSE: Se nascondo, chiudo il dettaglio ---
    if (isNowHidden) {
        let details = document.getElementById(`line-wrapper-${lineId}`);
        if (details && details.hasAttribute("open")) {
            details.removeAttribute("open");
        }
    }

    applicaCambiamentiVisibilita();
}

// Funzione 2: Isolamento (ALT + Click)
function isolaSoloQuestaLinea(targetLineId) {
    if (!appState.activeCityId) return;

    // Recupera TUTTE le linee della città corrente
    let cityLines = db.lines.filter(l => l.city_id === appState.activeCityId);

    // La nuova blacklist deve contenere TUTTI gli ID tranne quello target
    appState.hiddenLineIds = cityLines
        .map(l => l.id)
        .filter(id => id !== targetLineId);

    // Chiudi tutti i pannelli delle linee appena nascoste
    for (let line of cityLines) {
        if (line.id !== targetLineId) {
            let details = document.getElementById(`line-wrapper-${line.id}`);
            if (details) details.removeAttribute("open");
        }
    }

    applicaCambiamentiVisibilita();
}

// Funzione Helper Centrale per aggiornare tutto
function applicaCambiamentiVisibilita() {
    // 1. Aggiorna la mappa
    aggiornaFiltriCombinati();

    // 2. Aggiorna UI Sidebar
    let cityLines = db.lines.filter(l => l.city_id === appState.activeCityId);

    for (let line of cityLines) {
        let isHidden = appState.hiddenLineIds.includes(line.id);

        // A. Aggiorna Icona Occhio
        let btn = select(`#line-toggle-btn-${line.id}`);
        if (btn) {
            btn.html(isHidden ? icons.showLine : icons.hideLine);
        }

        // B. Aggiorna Stile Blocco Intero (SOLUZIONE BUG VISIVO)
        // Usiamo Javascript nativo per gestire le classi in modo affidabile
        let summaryBlock = document.getElementById(`line-summary-${line.id}`);
        if (summaryBlock) {
            if (isHidden) {
                summaryBlock.classList.add("opacity-50", "hover:opacity-70");
            } else {
                summaryBlock.classList.remove("opacity-50", "hover:opacity-70");
            }
        }
    }

    // 3. Sblocca il tasto Reset
    if (typeof sbloccaControlliSidebar === 'function') {
        sbloccaControlliSidebar();
    }
}

function popolaStazioniUI(cityId) {
    updateSidebarStats();
}

function creaTimeline(container) {
    let timelineWrapper = createDiv()
        .parent(container)
        .class(
            "w-full px-4 pb-4 md:pt-3 mt-6 bg-white/50 rounded-xl flex flex-col md:flex-row items-center shrink-0 md:gap-8",
        );

    if (!appState.hasValidHistory) {
        timelineWrapper.class(
            "min-h-20 mt-4 flex items-center justify-center text-neutral-400 text-xs font-medium italic",
        );
        timelineWrapper.html("Construction data not available for this city.");
        return;
    }

    let tlInfo = createDiv()
        .parent(timelineWrapper)
        .class(
            "w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start w-full md:w-auto gap-1",
        );
    createSpan("NETWORK EVOLUTION")
        .parent(tlInfo)
        .class(
            "block text-[10px] font-semibold text-neutral-400 uppercase tracking-widest",
        );
    let yearDisplay = createElement("h3", appState.minYear)
        .parent(tlInfo)
        .class("text-2xl md:text-3xl font-black text-neutral-700 tabular-nums");

    let sliderContainer = createDiv()
        .parent(timelineWrapper)
        .class("flex-1 w-full md:w-auto flex items-center gap-4");

    let btnPlay = createButton(icons.play).parent(sliderContainer);
    btnPlay.id("btn-play");
    btnPlay.attribute("disabled", "true");
    btnPlay.class(
        "rounded-full bg-neutral-200 text-neutral-400 cursor-not-allowed p-2",
    );
    btnPlay.mouseClicked(() => {
        if (mouseButton === LEFT) togglePlayback();
    });

    let sliderWrapper = createDiv()
        .parent(sliderContainer)
        .class("flex-grow relative");

    let slider = createElement("input").parent(sliderWrapper);
    slider.id("map-timeline-slider");
    slider.attribute("type", "range");
    slider.attribute("min", appState.minYear);
    slider.attribute("max", appState.maxYear);
    slider.attribute("value", appState.minYear);
    slider.attribute("step", "1");
    slider.attribute("disabled", "true");
    slider.class("w-full metro-slider cursor-pointer");

    let labels = createDiv()
        .parent(sliderWrapper)
        .class(
            "flex justify-between text-xs text-neutral-400 font-bold mt-1 uppercase",
        );
    createSpan(appState.minYear).parent(labels);
    createSpan(appState.maxYear).parent(labels);

    slider.input(() => {
        let val = parseInt(slider.value());
        appState.currentYear = val;
        yearDisplay.html(val);
        aggiornaFiltriCombinati();
        if (appState.isPlaying) togglePlayback(false);
        updateTimelineBackground(slider); // Ascolta l'evento input (mentre trascini)
    });
}

function sbloccaControlliTimeline() {
    let btnPlay = select("#btn-play");
    if (btnPlay) {
        btnPlay.removeAttribute("disabled");
        btnPlay.class(
            "rounded-full bg-neutral-900 hover:bg-neutral-700 text-white transition-colors cursor-pointer p-2",
        );
    }

    let slider = select("#map-timeline-slider");
    if (slider) {
        slider.removeAttribute("disabled");
        slider.class("w-full metro-slider cursor-pointer");
    }
}

function sbloccaControlliSidebar() {
    let btnReset = select("#btn-reset");
    if (btnReset) {
        btnReset.removeAttribute("disabled");
        btnReset.class(
            "rounded-full bg-white text-neutral-800 hover:text-neutral-900 hover:rotate-180 transition duration-700 ease-out cursor-pointer p-2",
        );
    }
}

function updateTimelineBackground(el) {
    const min = parseFloat(el.elt.min);
    const max = parseFloat(el.elt.max);
    const val = el.value();

    // Calcola la percentuale (valore - min) / (max - min) * 100
    const value = ((val - min) / (max - min)) * 100;

    // Colore sinistro: #171717 (Nero)
    // Colore destro: #D4D4D4 (Grigio)
    el.style(
        "background",
        `linear-gradient(to right, #171717 ${value}%, #D4D4D4 ${value}%)`,
    );
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
        projection: "mercator",
    });

    mappa.addControl(new mapboxgl.AttributionControl(), "bottom-right");
    mappa.addControl(
        new mapboxgl.NavigationControl({
            showCompass: false,
        }),
        "top-right",
    );
    mappa.addControl(new mapboxgl.ScaleControl());
    // disable map rotation using right click + drag
    mappa.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    mappa.touchZoomRotate.disableRotation();

    mappa.on("load", () => {
        mappa.resize();
        mappa.once("idle", () => {
            let loader = select("#map-loader");

            if (loader) loader.addClass("opacity-0");
            mappaContainer.removeClass("opacity-0");
            mapWrapper.addClass("shadow-lg");

            setTimeout(() => {
                if (loader) loader.remove();

                disegnaElementiMappa(city.id, city.name);
                aggiungiInterazioniMappa();

                updateSidebarStats();
            }, 600);
        });
    });
}

function updateSidebarStats() {
    if (!appState.activeCityId) return;

    let year = appState.currentYear;
    let endOfTime = appState.maxYear || CURRENT_YEAR;

    // 1. HEADER DINAMICO
    let headerKm = select("#header-total-km");
    if (headerKm) {
        let totalCityKm = calcolaLunghezzaRete(
            appState.activeCityId,
            null,
            year,
        );
        headerKm.html(`${totalCityKm} km`);
    }

    let datiCitta = getDatiCitta(appState.activeCityId);
    let activeCityLinesCount = 0;

    for (let system of datiCitta) {
        // Selezione sicura tramite attributo dati (NO p5 select per evitare errori)
        let allSystems = document.querySelectorAll(
            `details[data-system-name="${system.name}"]`,
        );
        if (allSystems.length === 0) continue;
        let sysDetailNative = allSystems[0];

        let activeLinesCount = 0;
        let systemLineIds = [];

        for (let line of system.lines) {
            let lineWrapper = select(`#line-wrapper-${line.id}`);
            if (!lineWrapper) continue;

            let sectionRels = db.section_lines.filter((sl) => sl.line_id === line.id);
            let kmOp = 0;
            let kmCons = 0;
            let isLineActiveInYear = false;

            for (let rel of sectionRels) {
                let s = db.sections.find((sec) => sec.id === rel.section_id);
                if (!s) continue;

                let len = s.length || 0;
                if (len > 100) len = len / 1000;

                let b = parseYear(s.buildstart);
                let o = parseYear(s.opening);
                let closure = parseYear(s.closure) || 9999;

                // --- ERDITARIETÀ LINEA DA STAZIONI (Punto Inverso) ---
                if (!o && !b) {
                    let inheritedOp = getInheritedLineOpening(line.id);
                    if (inheritedOp) o = inheritedOp;
                }

                // --- POINT 2: LIMITI RELAZIONALI (section_lines) ---
                let relFrom = parseYear(rel.fromyear);
                let relTo = parseYear(rel.toyear);
                if (relFrom) {
                    if (!o || o < relFrom) o = relFrom;
                }
                if (relTo) {
                    if (closure > relTo) closure = relTo;
                }

                if (b && b < 1860) b = null;
                if (o && o < 1860) o = null;

                if (!o) o = endOfTime;
                if (!b) {
                    if (o === endOfTime) b = endOfTime;
                    else b = o;
                }

                let isOp = o <= year && closure > year;
                let isCons = b <= year && o > year;

                if (isOp) kmOp += len;
                if (isCons) kmCons += len;

                // Se esiste (cantiere o operativa), è attiva
                if (isOp || isCons) isLineActiveInYear = true;
            }

            // VISIBILITÀ LINEA
            if (isLineActiveInYear) {
                lineWrapper.style("display", "block");
                activeLinesCount++;
                activeCityLinesCount++;
                systemLineIds.push(line.id);
            } else {
                lineWrapper.style("display", "none");
                continue;
            }

            // AGGIORNAMENTO BADGE STATISTICHE LINEA
            let statsContainer = select(`#line-stats-${line.id}`);
            if (statsContainer) {
                let htmlParts = [];

                let stationRels = db.station_lines.filter(
                    (sl) => sl.line_id === line.id,
                );
                let activeStations = [];
                for (let rel of stationRels) {
                    let station = db.stations.find(
                        (s) => s.id === rel.station_id,
                    );
                    if (station) {
                        let b = parseYear(station.buildstart);
                        let o = parseYear(station.opening);
                        let c = parseYear(station.closure) || 9999;

                        // --- POINT 2: LIMITI RELAZIONALI (station_lines) ---
                        let relFrom = parseYear(rel.fromyear);
                        let relTo = parseYear(rel.toyear);
                        if (relFrom) {
                            if (!o || o < relFrom) o = relFrom;
                        }
                        if (relTo) {
                            if (c > relTo) c = relTo;
                        }

                        if (b && b < 1860) b = null;
                        if (o && o < 1860) o = null;
                        if (!o) o = endOfTime;
                        if (!b) {
                            if (o === endOfTime) b = endOfTime;
                            else b = o;
                        }
                        if (o <= year && c > year) activeStations.push(station);
                    }
                }

                let visibleStationCount = activeStations.length;

                // DEFINIZIONE CLASSI: Usiamo SOLO quella comune (testo grigio neutro)
                let commonBadgeClasses =
                    "flex flex-1 items-center justify-center text-neutral-600 text-sm leading-none font-medium bg-white px-1.5 py-2 rounded-lg gap-1";

                let label = visibleStationCount === 1 ? "station" : "stations";

                // 1. STAZIONI
                htmlParts.push(
                    `<span class="${commonBadgeClasses}">
                        <span class="mt-[2px]">${visibleStationCount} ${label}</span>
                    </span>`,
                );

                // 2. KM OPERATIVI (Icona VERDE se > 0, Testo NEUTRO)
                let opIconColorClass = kmOp > 0 ? "text-emerald-600" : "";

                htmlParts.push(
                    `<span class="${commonBadgeClasses}">
                        <span class="${opIconColorClass}">${icons.operative}</span>
                        <span class="mt-[2px]">${kmOp.toFixed(1)} km</span>
                    </span>`,
                );

                // 3. KM IN COSTRUZIONE (Icona ARANCIO se > 0, Testo NEUTRO)
                let iconColorClass = kmCons > 0 ? "text-orange-600" : "";

                htmlParts.push(
                    `<span class="${commonBadgeClasses}">
                        <span class="${iconColorClass}">${icons.construction}</span>
                        <span class="mt-[2px]">${kmCons.toFixed(1)} km</span>
                    </span>`,
                );

                // In assenza di dati
                if (sectionRels.length === 0 && stationRels.length === 0) {
                    htmlParts.push(
                        `<span class="${commonBadgeClasses}">MISSING DATA</span>`,
                    );
                }

                statsContainer.html(htmlParts.join(""));

                // LISTA STAZIONI (Renderizzata solo se linea attiva)
                let stationsDiv = select(`#stations-list-${line.id}`);
                if (stationsDiv) {
                    stationsDiv.html(""); // Pulisci
                    if (visibleStationCount > 0) {
                        let sortedStations =
                            ordinaStazioniNaturalmente(activeStations);

                        for (let station of sortedStations) {
                            let stElem = createDiv(station.name).parent(
                                stationsDiv,
                            );
                            stElem.class(
                                "text-xs text-neutral-600 hover:underline hover:font-bold cursor-pointer py-1 truncate", 
                            );
                            stElem.mouseClicked(() => {
                                if (mouseButton === LEFT) zoomSuStazione(station);
                            });
                        }
                    } else {
                        createDiv("No stations found")
                            .parent(stationsDiv)
                            .class("text-xs text-neutral-400 italic py-1");
                    }
                }
            }
        }

        // VISIBILITÀ SISTEMA
        if (activeLinesCount > 0) {
            sysDetailNative.style.display = "block";
            let rightSide = sysDetailNative.querySelector(
                "summary > div:last-child",
            );
            if (rightSide) {
                let kmSistema = calcolaLunghezzaRete(
                    appState.activeCityId,
                    systemLineIds,
                    year,
                );
                let labelLinee = activeLinesCount === 1 ? "line" : "lines";
                rightSide.innerHTML = `
                    <span class="text-[10px] leading-none font-medium text-neutral-600 bg-neutral-100 px-2 py-1.5 rounded">${kmSistema} km</span>
                    <span class="text-xs font-normal text-neutral-500">${activeLinesCount} ${labelLinee}</span>
                `;
            }
        } else {
            sysDetailNative.style.display = "none";
        }
    }

    // --- GESTIONE SIDEBAR VUOTA ---
    let systemsList = select("#sidebar-systems-list");
    if (systemsList) {
        let emptyMsgId = "sidebar-empty-placeholder";
        let existingMsg = select("#" + emptyMsgId);
        
        if (activeCityLinesCount === 0 && !appState.isPlaying) {
            if (!existingMsg) {
                let msg = createDiv()
                    .parent(systemsList)
                    .id(emptyMsgId)
                    .class("flex flex-col items-center justify-center py-12 px-6 text-center opacity-60");
                
                createSpan(icons.info)
                    .parent(msg)
                    .class("scale-150 mb-5");
                
                createP("No active systems found for this year")
                    .parent(msg)
                    .class("text-sm font-medium text-neutral-600 mb-1");
                
                createP("Try navigating the timeline.")
                    .parent(msg)
                    .class("text-xs text-neutral-400 max-w-[180px]");
            }
        } else {
            if (existingMsg) existingMsg.remove();
        }
    }
}

// --- FUNZIONE MST + SUBTREE SIZE ---
function ordinaStazioniNaturalmente(stations) {
    if (!stations || stations.length < 2) return stations;

    let nodes = stations
        .map((s, i) => {
            let coords = parseGeometry(s.geometry);
            return coords
                ? { original: s, coords: coords, adj: [], visited: false }
                : null;
        })
        .filter((s) => s !== null);

    if (nodes.length === 0) return stations;

    let edges = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            let dx = nodes[i].coords[0] - nodes[j].coords[0];
            let dy = nodes[i].coords[1] - nodes[j].coords[1];
            let distSq = dx * dx + dy * dy;
            if (distSq < 0.05 * 0.05) edges.push({ u: i, v: j, w: distSq });
        }
    }
    edges.sort((a, b) => a.w - b.w);

    let parent = new Array(nodes.length).fill(0).map((_, i) => i);
    function find(i) {
        return parent[i] === i ? i : (parent[i] = find(parent[i]));
    }
    function union(i, j) {
        let rootI = find(i);
        let rootJ = find(j);
        if (rootI !== rootJ) {
            parent[rootI] = rootJ;
            return true;
        }
        return false;
    }

    for (let e of edges) {
        if (union(e.u, e.v)) {
            nodes[e.u].adj.push(nodes[e.v]);
            nodes[e.v].adj.push(nodes[e.u]);
        }
    }

    let leaves = nodes.filter((n) => n.adj.length === 1);
    if (leaves.length === 0) leaves = nodes;
    leaves.sort((a, b) => a.coords[0] - b.coords[0]);
    let startNode = leaves[0];

    let finalOrder = [];
    let stack = [startNode];
    startNode.visited = true;

    function getBranchSize(node, fromNode) {
        let size = 1;
        let q = [node];
        let seen = new Set([fromNode, node]);

        while (q.length > 0) {
            let curr = q.shift();
            for (let n of curr.adj) {
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

        let neighbors = curr.adj.filter((n) => !n.visited);

        if (neighbors.length > 0) {
            let weightedNeighbors = neighbors.map((n) => {
                return { node: n, size: getBranchSize(n, curr) };
            });

            weightedNeighbors.sort((a, b) => b.size - a.size);

            for (let wn of weightedNeighbors) {
                wn.node.visited = true;
                stack.push(wn.node);
            }
        }
    }

    let unvisited = nodes.filter((n) => !n.visited);
    if (unvisited.length > 0) {
        unvisited.sort((a, b) => a.coords[0] - b.coords[0]);
        for (let n of unvisited) finalOrder.push(n.original);
    }

    return finalOrder;
}

// --- EVENTO TASTIERA GLOBALE (SPAZIO = PLAY/PAUSE) ---
document.addEventListener("keydown", (e) => {
    // Non intercettare se l'utente sta digitando in un input o textarea
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
        return;
    }

    // 1. Controlla se c'è una città attiva (siamo nella mappa)
    // Usiamo una verifica generica sullo stato o sulla variabile mappa
    let isMapActive = typeof appState !== "undefined" && appState.activeCityId;

    if (isMapActive && e.code === "Space") {
        e.preventDefault(); // Blocca lo scroll della pagina ("salto")

        // 2. Controlla che la timeline esista e sia abilitata
        let btnPlay = document.getElementById("btn-play");
        let isTimelineReady = btnPlay && !btnPlay.hasAttribute("disabled");

        if (isTimelineReady && typeof togglePlayback === "function") {
            togglePlayback();
        }
    }
});
