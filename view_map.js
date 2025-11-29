function inizializzaMappa(city) {
    vistaAttuale = "mappa";
    appState.activeCityId = city.id;
    appState.isolatedLineId = null;
    stopAnimation();

    if (window.history.pushState) {
        let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?city_id=${city.id}`;
        window.history.pushState({ path: newurl }, "", newurl);
    }

    let container = select("#app-container");
    container.html("");

    // Navbar
    let navBar = createDiv().parent(container).class("flex items-center justify-between mb-4 pb-2 border-b border-slate-100");
    let btnBack = createButton("Torna indietro");
    btnBack.parent(navBar).class("bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 font-medium transition-colors text-sm");
    btnBack.mousePressed(creaListaCitta);

    let titleContainer = createDiv().parent(navBar).class("text-right");
    createElement("h2", city.name).parent(titleContainer).class("text-3xl font-extrabold text-slate-800 tracking-tight");
    createElement("div", city.country).parent(titleContainer).class("text-sm text-slate-500 font-semibold uppercase tracking-wider");

    // Layout
    let contentWrapper = createDiv().parent(container).class("flex flex-col lg:flex-row h-[75vh] gap-4");

    mappaContainer = createDiv().parent(contentWrapper);
    mappaContainer.id("map");
    mappaContainer.class("w-full lg:w-3/4 h-full rounded-xl overflow-hidden shadow-lg relative border border-slate-200");

    let sidebar = createDiv().parent(contentWrapper);
    sidebar.class("w-full lg:w-1/4 h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col");

    let sbHeader = createDiv().parent(sidebar).class("p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center");
    createSpan("Sistemi & Linee").parent(sbHeader).class("font-bold text-slate-700");
    let btnReset = createButton("Mostra tutto").parent(sbHeader);
    btnReset.class("text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer");
    btnReset.mousePressed(() => resetFiltriMappa());

    let sbContent = createDiv().parent(sidebar).class("flex-1 overflow-y-auto p-2");

    // Calcolo Anni
    let cityLines = db.lines.filter((l) => l.city_id === city.id);
    let firstEventYear = 2025;
    let hasValidYears = false;
    let lineIds = new Set(cityLines.map((l) => l.id));

    let filteredSectionLines = db.section_lines.filter((sl) => sl.city_id === city.id && lineIds.has(sl.line_id));
    let validSectionIds = new Set(filteredSectionLines.map((sl) => sl.section_id));
    let citySections = db.sections.filter((s) => validSectionIds.has(s.id));

    for (let s of citySections) {
        let b = parseYear(s.buildstart);
        let o = parseYear(s.opening);
        if (b && b > 1800 && b < firstEventYear) { firstEventYear = b; hasValidYears = true; }
        if (o && o > 1800 && o < firstEventYear) { firstEventYear = o; hasValidYears = true; }
    }

    if (!hasValidYears) firstEventYear = 2000;
    appState.minYear = firstEventYear - 1;
    appState.maxYear = 2025;
    appState.currentYear = appState.minYear;

    // Popolamento Sidebar
    let datiCitta = getDatiCitta(city.id);
    if (datiCitta.length === 0) createP("Nessuna linea trovata.").parent(sbContent).class("p-4 text-slate-500 italic");

    for (let system of datiCitta) {
        let sysDetail = createElement("details").parent(sbContent).class("group mb-2");
        sysDetail.attribute("open", "true");
        let sysSummary = createElement("summary").parent(sysDetail);
        sysSummary.class("cursor-pointer font-bold text-slate-800 p-2 bg-slate-100 rounded hover:bg-slate-200 select-none flex justify-between items-center");
        createSpan(system.name).parent(sysSummary);
        let lineCount = system.lines.length;
        let badge = createSpan(`${lineCount} ${lineCount === 1 ? "linea" : "linee"}`);
        badge.parent(sysSummary).class("text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 ml-2");

        let linesDiv = createDiv().parent(sysDetail).class("pl-2 mt-1 space-y-1");

        for (let line of system.lines) {
            let lineDetail = createElement("details").parent(linesDiv).class("group/line");
            let lineSummary = createElement("summary").parent(lineDetail);
            lineSummary.class("cursor-pointer p-2 rounded hover:bg-slate-50 text-sm flex flex-col items-start gap-1 select-none transition-colors");

            let headerLine = createDiv().parent(lineSummary).class("flex items-center gap-2 w-full");
            let hexColor = fixColor(line.color);
            createSpan("").parent(headerLine).class("w-3 h-3 rounded-full shadow-sm block flex-shrink-0").style("background-color", hexColor);
            createSpan(line.name).parent(headerLine).class("font-medium text-slate-700");

            let statsId = `line-stats-${line.id}`;
            let statsContainer = createDiv().parent(lineSummary);
            statsContainer.id(statsId);
            statsContainer.class("flex flex-wrap gap-1 ml-5 mt-1");

            let stationsDiv = createDiv().parent(lineDetail).class("pl-6 border-l-2 border-slate-100 ml-3 mt-1 space-y-1");

            if (line.stations.length > 0) {
                let btnShowLine = createDiv("Isola linea").parent(stationsDiv);
                btnShowLine.class("text-xs font-bold text-indigo-600 cursor-pointer py-1 mb-1 hover:underline");
                btnShowLine.mousePressed(() => isolaLineaSullaMappa(line.id));

                for (let station of line.stations) {
                    let stElem = createDiv(station.name).parent(stationsDiv);
                    stElem.class("text-xs text-slate-600 hover:text-indigo-600 cursor-pointer py-1 truncate");
                    stElem.mousePressed(() => zoomSuStazione(station));
                }
            } else {
                createDiv("Nessuna stazione registrata.").parent(stationsDiv).class("text-xs text-slate-400 italic py-1");
            }
        }
    }

    updateSidebarStats();

    // --- TIMELINE ---
    let timelineWrapper = createDiv().parent(container).class("mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4");
    let tlInfo = createDiv().parent(timelineWrapper).class("w-full md:w-1/6 flex flex-col justify-center");
    createSpan("EVOLUZIONE RETE").parent(tlInfo).class("block text-[10px] font-bold text-slate-400 uppercase tracking-widest");
    let yearDisplay = createElement("h3", appState.minYear).parent(tlInfo).class("text-3xl font-black text-indigo-600 tabular-nums");

    let sliderContainer = createDiv().parent(timelineWrapper).class("w-full md:w-5/6 flex items-center gap-4 px-2");
    let btnPlay = createButton("PLAY").parent(sliderContainer);
    btnPlay.id("btn-play");
    btnPlay.class("w-16 h-10 flex-shrink-0 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer tracking-wider");
    btnPlay.mousePressed(() => togglePlayback());

    let sliderWrapper = createDiv().parent(sliderContainer).class("flex-grow relative");
    let slider = createElement("input").parent(sliderWrapper);
    slider.id("timeline-slider");
    slider.attribute("type", "range");
    slider.attribute("min", appState.minYear);
    slider.attribute("max", appState.maxYear);
    slider.attribute("value", appState.minYear);
    slider.attribute("step", "1");
    slider.class("w-full metro-slider cursor-pointer");

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
        
        // Aspetta mezzo secondo prima di calcolare e volare
        setTimeout(() => {
            disegnaElementiMappa(city.id, city.name);
            aggiungiInterazioniMappa();
        }, 500);
    });
}

function updateSidebarStats() {
    let year = appState.currentYear;
    let cityLines = db.lines.filter((l) => l.city_id == appState.activeCityId);

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
            if (!o) o = 9999;
            if (!b) {
                if (o === 9999) b = appState.minYear;
                else b = o;
            }
            let isOp = o <= year && (parseYear(s.closure) || 9999) > year;
            let isCons = b <= year && o > year;
            if (isOp) kmOp += len;
            if (isCons) kmCons += len;
        }

        let stationRels = db.station_lines.filter((sl) => sl.line_id === line.id);
        let visibleStationCount = 0;
        for (let rel of stationRels) {
            let station = db.stations.find((s) => s.id === rel.station_id);
            if (station) {
                let b = parseYear(station.buildstart);
                let o = parseYear(station.opening);
                let c = parseYear(station.closure) || 9999;
                if (!o) o = 9999;
                if (!b) {
                    if (o === 9999) b = appState.minYear;
                    else b = o;
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