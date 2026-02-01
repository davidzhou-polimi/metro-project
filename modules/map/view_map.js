// --- FUNZIONE PRINCIPALE (ORCHESTRATOR) ---

let lineCoordinatesMap;
let currentPopup = null; 

function inizializzaMappa(city) {
    // 1. Pulizia e Setup Stato
    if (typeof mappa !== "undefined" && mappa) {
        mappa.remove();
        mappa = null;
    }
    appState.activeCityId = city.id;
    appState.isolatedLineId = null;
    stopAnimation();
    document.title = `${city.name} - World Metro`;
    //sincronizzaURL();

    calcolaRangeAnni(city.id);

    let container = getContentContainer();
    container.html("");
    container.class("h-[calc(100vh-4.5rem)] max-h-screen flex flex-col p-4 overflow-hidden");

    let contentWrapper = createDiv()
        .parent(container)
        .class("flex flex-col lg:flex-row flex-1 min-h-0 gap-0 lg:gap-8 overflow-hidden");

    let mapWrapper = creaContenitoreMappa(contentWrapper);
    let sidebar = creaSidebar(contentWrapper, city);
    creaTimeline(container);

    lineCoordinatesMap = new Map();
    avviaMapbox(city, mapWrapper, lineCoordinatesMap);
}

// --- MODULO 1: UTILITY & CALCOLI ---
function calcolaRangeAnni(cityId) {
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let firstEventYear = 2025;
    let hasValidYears = false;
    let lineIds = new Set(cityLines.map((l) => l.id));

    let filteredSectionLines = db.section_lines.filter(
        (sl) => sl.city_id === cityId && lineIds.has(sl.line_id)
    );
    let validSectionIds = new Set(
        filteredSectionLines.map((sl) => sl.section_id)
    );
    let citySections = db.sections.filter((s) => validSectionIds.has(s.id));

    for (let s of citySections) {
        let b = parseYear(s.buildstart);
        let o = parseYear(s.opening);
        if (b && b > 1800 && b < firstEventYear) {
            firstEventYear = b;
            hasValidYears = true;
        }
        if (o && o > 1800 && o < firstEventYear) {
            firstEventYear = o;
            hasValidYears = true;
        }
    }

    appState.maxYear = 2025;
    appState.hasValidHistory = hasValidYears;

    if (!hasValidYears) {
        appState.minYear = 2000;
        appState.currentYear = appState.maxYear;
    } else {
        appState.minYear = firstEventYear - 1;
        appState.currentYear = appState.minYear;
    }
}

// MODIFICA: Aggiunto parametro 'year' opzionale per calcolo dinamico
function calcolaLunghezzaRete(cityId, systemLineIds = null, year = null) {
    let targetSectionIds = new Set();

    // Fallback data finale per coerenza con la logica mappa
    let endOfTime = appState.maxYear || 2025;

    if (systemLineIds) {
        let rels = db.section_lines.filter((sl) =>
            systemLineIds.includes(sl.line_id)
        );
        rels.forEach((r) => targetSectionIds.add(r.section_id));
    } else {
        let cityLines = db.lines.filter((l) => l.city_id === cityId);
        let lineIds = cityLines.map((l) => l.id);
        let rels = db.section_lines.filter((sl) =>
            lineIds.includes(sl.line_id)
        );
        rels.forEach((r) => targetSectionIds.add(r.section_id));
    }

    let totalMeters = 0;
    targetSectionIds.forEach((id) => {
        let section = db.sections.find((s) => s.id === id);
        if (section && section.length) {
            let meters = parseFloat(section.length);

            // FILTRO DINAMICO PER ANNO
            if (year !== null) {
                let b = parseYear(section.buildstart);
                let o = parseYear(section.opening);

                if (b && b < 1800) b = null;
                if (o && o < 1800) o = null;

                if (!o) o = endOfTime;
                if (!b) {
                    if (o === endOfTime) b = endOfTime;
                    else b = o;
                }

                let closure = parseYear(section.closure) || 9999;

                // Contiamo la sezione se esiste nell'anno corrente (In Costruzione O Operativa)
                let isActive = b <= year && closure > year;

                if (!isActive) meters = 0;
            }

            totalMeters += meters;
        }
    });

    return (totalMeters / 1000).toFixed(1).replace(".", ",");
}

// --- MODULO 2: UI BUILDING BLOCKS ---

function creaContenitoreMappa(parentWrapper) {
    let wrapper = createDiv().parent(parentWrapper);
    wrapper.class(
        "w-full lg:w-3/4 h-[40vh] lg:h-full rounded-xl overflow-hidden relative bg-neutral-50 shadow-sm flex-shrink-0 lg:flex-shrink"
    );

    let loaderDiv = createDiv().parent(wrapper);
    loaderDiv.id("map-loader");
    loaderDiv.class(
        "absolute inset-0 flex flex-col items-center justify-center z-10 bg-white transition-opacity duration-500"
    );

    let spinner = createDiv().parent(loaderDiv);
    spinner.class(
        "w-8 h-8 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mb-4"
    );

    createSpan("Loading map...")
        .parent(loaderDiv)
        .class(
            "text-neutral-500 text-sm font-semibold tracking-wide uppercase"
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
        "w-full lg:w-1/4 lg:h-full bg-white rounded-2xl border-[6px] border-neutral-900 flex flex-col flex-1 shadow-lg overflow-hidden"
    );

    let sbHeader = createDiv()
        .parent(sidebar)
        .class(
            "px-3 pt-0 lg:pt-3 pb-4 bg-neutral-900 flex justify-between items-center"
        );
    let titleContainer = createDiv().parent(sbHeader).class("flex flex-col");

    createElement("div", city.country)
        .parent(titleContainer)
        .class(
            "text-xs text-neutral-400 font-bold uppercase tracking-widest mb-0.5"
        );
    createElement("h2", city.name)
        .parent(titleContainer)
        .class(
            "text-2xl font-bold text-neutral-50 tracking-tight leading-none"
        );

    let kmTotali = calcolaLunghezzaRete(city.id);
    let statsDiv = createDiv()
        .parent(titleContainer)
        .class("flex items-center gap-2 mt-2");

    createSpan("NETWORK LENGTH")
        .parent(statsDiv)
        .class(
            "text-[10px] leading-none font-bold text-neutral-300 bg-neutral-700 px-2 py-1.5 rounded-md"
        );

    // MODIFICA: Aggiunto ID per aggiornamento dinamico
    let kmSpan = createSpan(`${kmTotali} km`)
        .parent(statsDiv)
        .class("text-sm font-bold text-neutral-300 tabular-nums");
    kmSpan.id("header-total-km");

    /*createSpan("Sistemi & Linee")
        .parent(sbHeader)
        .class("font-bold text-neutral-700");*/
    let btnReset = createButton(resetIcon).parent(sbHeader);
    btnReset.id("btn-reset");
    btnReset.attribute("disabled", "true");
    btnReset.class(
        "rounded-full bg-neutral-700 text-neutral-500 cursor-not-allowed p-2"
    );
    btnReset.mousePressed(() => resetFiltriMappa());

    let sbContent = createDiv()
        .parent(sidebar)
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

function costruisciSistemaUI(system, container) {
    let sysDetail = createElement("details")
        .parent(container)
        .class("group mb-2");
    sysDetail.attribute("open", "true");

    // MODIFICA: Aggiunto attributo data per selezione sicura
    sysDetail.attribute("data-system-name", system.name);

    let sysSummary = createElement("summary").parent(sysDetail);
    sysSummary.class(
        "group/dropdown cursor-pointer font-bold text-neutral-900 px-1.5 py-3 hover:text-neutral-700 transition-colors duration-300 select-none flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
    );

    let leftSide = createDiv()
        .parent(sysSummary)
        .class("flex items-center gap-2");
    createSpan(chevronIcon)
        .class(
            "group-open:rotate-180 transition duration-300 ease-out"
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
            "text-xs font-medium text-neutral-600 bg-white border border-neutral-300 px-2 py-1.5 rounded"
        );

    let lineCount = system.lines.length;
    let labelLinee = lineCount === 1 ? "line" : "lines";
    createSpan(`${lineCount} ${labelLinee}`)
        .parent(rightSide)
        .class("text-xs font-normal text-neutral-400");

    let linesDiv = createDiv().parent(sysDetail).class("flex flex-col gap-2");

    for (let line of system.lines) {
        costruisciLineaUI(line, linesDiv);
    }
}

function costruisciLineaUI(line, container) {
    let lineDetail = createElement("details")
        .parent(container)
        .class("group/line");

    // MODIFICA: Aggiunto ID univoco per nascondere/mostrare
    lineDetail.id("line-wrapper-" + line.id);

    let hexColor = fixColor(line.color);
    let useBlack = isColorLight(hexColor);

    let lineSummary = createElement("summary").parent(lineDetail);
    lineSummary
        .class(
            "cursor-pointer p-1.5 rounded-xl hover:opacity-90 flex flex-col items-start gap-1 select-none transition-opacity duration-300 shadow"
        )
        .style("background-color", hexColor)
        .style("color", useBlack ? "#000000" : "#ffffff");

    let headerLine = createDiv()
        .parent(lineSummary)
        .class("flex items-center justify-between w-full");
    /*let hexColor = fixColor(line.color);
    createSpan("")
        .parent(headerLine)
        .class("w-3 h-3 rounded-full shadow-sm block flex-shrink-0")
        .style("background-color", hexColor);*/

    let leftSideGroup = createDiv()
        .parent(headerLine)
        .class("flex items-center gap-2");

    createSpan(chevronIcon)
        .parent(leftSideGroup)
        .class(
            "group-open/line:rotate-180 transition duration-300 ease-out"
        );
        
    createSpan(line.name)
        .parent(leftSideGroup)
        .class("ml-1 font-semibold opacity-95");

    let btnIsolate = createSpan("Isolate line")
        .parent(headerLine)
        .class("text-[14px] font-medium tracking-wider hover:opacity-100 hover:underline hover:font-bold transition-all cursor-pointer px-1");

    btnIsolate.mousePressed((e) => {
        e.stopPropagation(); // Impedisce apertura/chiusura del details al click

        if (appState.isolatedLineId === line.id) {
            resetFiltriMappa();
        } else {
            isolaLineaSullaMappa(line.id);
        }
    });

    let statsContainer = createDiv().parent(lineSummary);
    statsContainer.id(`line-stats-${line.id}`);
    statsContainer.class("w-full grid grid-cols-3 gap-1.5");

    let stationsDiv = createDiv().parent(lineDetail);
    stationsDiv.id(`stations-list-${line.id}`);
    stationsDiv.class("pl-6 border-l-2 border-neutral-200 ml-3 mt-2 space-y-1");
}

function popolaStazioniUI(cityId) {
    updateSidebarStats();
}

function creaTimeline(container) {
    let timelineWrapper = createDiv().parent(container).class(
        "w-full mt-0 lg:mt-6 py-9 lg:py-4 bg-white/50 rounded-xl flex flex-col md:flex-row items-center gap-4 flex-shrink-0"
    );

    if (!appState.hasValidHistory) {
        timelineWrapper.class(
            "min-h-20 mt-4 flex items-center justify-center text-neutral-400 text-xs font-medium italic"
        );
        timelineWrapper.html("Construction data not available for this city.");
        return;
    }

    let tlInfo = createDiv()
        .parent(timelineWrapper)
        .class("w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start w-full md:w-auto gap-1");
    createSpan("NETWORK EVOLUTION")
        .parent(tlInfo)
        .class(
            "block text-[10px] font-semibold text-neutral-400 uppercase tracking-widest"
        );
    let yearDisplay = createElement("h3", appState.minYear)
        .parent(tlInfo)
        .class("text-3xl font-black text-neutral-700 tabular-nums");

    let sliderContainer = createDiv()
        .parent(timelineWrapper)
        .class("flex-1 w-full md:w-auto flex items-center gap-6 ml-0 md:ml-2");

    let btnPlay = createButton(playIcon).parent(sliderContainer);
    btnPlay.id("btn-play");
    btnPlay.attribute("disabled", "true");
    btnPlay.class(
        "rounded-full bg-neutral-200 text-neutral-400 cursor-not-allowed p-2"
    );
    btnPlay.mousePressed(() => togglePlayback());

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
            "flex justify-between text-xs text-neutral-400 font-bold mt-1 uppercase"
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
            "rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2"
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
            "rounded-full bg-white text-neutral-800 hover:text-neutral-900 hover:rotate-180 transition duration-700 ease-out cursor-pointer p-2"
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
    el.style("background", `linear-gradient(to right, #171717 ${value}%, #D4D4D4 ${value}%)`);
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
        "top-right"
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

function isolaLineaSullaMappa(lineId) {
    if (appState.isolatedLineId === lineId) {
        resetFiltriMappa();
    } else {
        appState.isolatedLineId = lineId;
        aggiornaFiltriCombinati();
    }
}

// MODIFICA: Logica completamente dinamica per numeri, visibilità e stazioni
function updateSidebarStats() {
    if (!appState.activeCityId) return;

    let year = appState.currentYear;
    let endOfTime = appState.maxYear || 2025;

    // 1. HEADER DINAMICO
    let headerKm = select("#header-total-km");
    if (headerKm) {
        let totalCityKm = calcolaLunghezzaRete(
            appState.activeCityId,
            null,
            year
        );
        headerKm.html(`${totalCityKm} km`);
    }

    let datiCitta = getDatiCitta(appState.activeCityId);

    for (let system of datiCitta) {
        // Selezione sicura tramite attributo dati (NO p5 select per evitare errori)
        let allSystems = document.querySelectorAll(
            `details[data-system-name="${system.name}"]`
        );
        if (allSystems.length === 0) continue;
        let sysDetailNative = allSystems[0];

        let activeLinesCount = 0;
        let systemLineIds = [];

        for (let line of system.lines) {
            let lineWrapper = select(`#line-wrapper-${line.id}`);
            if (!lineWrapper) continue;

            let rels = db.section_lines.filter((sl) => sl.line_id === line.id);
            let sections = rels
                .map((r) => db.sections.find((s) => s.id === r.section_id))
                .filter((s) => s);

            let kmOp = 0;
            let kmCons = 0;
            let isLineActiveInYear = false;

            for (let s of sections) {
                let len = s.length || 0;
                if (len > 100) len = len / 1000;

                let b = parseYear(s.buildstart);
                let o = parseYear(s.opening);

                if (b && b < 1800) b = null;
                if (o && o < 1800) o = null;

                if (!o) o = endOfTime;
                if (!b) {
                    if (o === endOfTime) b = endOfTime;
                    else b = o;
                }

                let closure = parseYear(s.closure) || 9999;
                let isOp = o < year && closure > year;
                let isCons = b <= year && o >= year;

                if (isOp) kmOp += len;
                if (isCons) kmCons += len;

                // Se esiste (cantiere o operativa), è attiva
                if (isOp || isCons) isLineActiveInYear = true;
            }

            // VISIBILITÀ LINEA
            if (isLineActiveInYear) {
                lineWrapper.style("display", "block");
                activeLinesCount++;
                systemLineIds.push(line.id);
            } else {
                lineWrapper.style("display", "none");
                continue;
            }

            // AGGIORNAMENTO BADGE STATISTICHE LINEA
            let statsContainer = select(`#line-stats-${line.id}`);
            if (statsContainer) {
                let htmlParts = [];
                // Qui dovremmo calcolare le stazioni VISIBILI per il badge (semplificato: se linea attiva, controlla stazioni)

                // Ricostruiamo lista stazioni per contare quelle attive
                let stationRels = db.station_lines.filter(
                    (sl) => sl.line_id === line.id
                );
                let activeStations = [];
                for (let rel of stationRels) {
                    let station = db.stations.find(
                        (s) => s.id === rel.station_id
                    );
                    if (station) {
                        let b = parseYear(station.buildstart);
                        let o = parseYear(station.opening);
                        let c = parseYear(station.closure) || 9999;
                        if (b && b < 1800) b = null;
                        if (o && o < 1800) o = null;
                        if (!o) o = endOfTime;
                        if (!b) {
                            if (o === endOfTime) b = endOfTime;
                            else b = o;
                        }
                        if (b <= year && c > year) activeStations.push(station);
                    }
                }

                let visibleStationCount = activeStations.length;
                let commonBadgeClasses =
                    "flex flex-1 items-center justify-center text-neutral-600 text-sm leading-none font-medium bg-white p-2.5 rounded-lg gap-1";
                let constructionBadgeClasses =
                    "flex flex-1 items-center justify-center text-orange-600 text-sm leading-none font-medium bg-white p-2.5 rounded-lg gap-1";

                    //if (visibleStationCount > 0) {
                let label = visibleStationCount === 1 ? "station" : "stations";
                htmlParts.push(
                    `<span class="${commonBadgeClasses}">${visibleStationCount} ${label}</span>`
                );
                //}
                //if (kmOp > 0) {
                htmlParts.push(
                    `<span class="${commonBadgeClasses}">${operativeIcon}${kmOp.toFixed(
                        1
                    )} km</span>`
                );
                //}
                //if (kmCons > 0) {
                htmlParts.push(
                    `<span class="${kmCons > 0 ? constructionBadgeClasses : commonBadgeClasses}">${constructionIcon}${kmCons.toFixed(
                        1
                    )} km</span>`
                );
                //}
                if (sections.length === 0 && stationRels.length === 0) {
                    htmlParts.push(
                        `<span class="${commonBadgeClasses}">MISSING DATA</span>`
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
                                stationsDiv
                            );
                            stElem.class(
                                "text-xs text-neutral-600 hover:underline hover:font-bold cursor-pointer py-1 truncate"
                            );
                            stElem.mousePressed(() => zoomSuStazione(station));
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
                "summary > div:last-child"
            );
            if (rightSide) {
                let kmSistema = calcolaLunghezzaRete(
                    appState.activeCityId,
                    systemLineIds,
                    year
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
}

// --- FUNZIONE MST + SUBTREE SIZE (Invariato) ---
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
