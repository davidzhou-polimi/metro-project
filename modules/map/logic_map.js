function disegnaElementiMappa(cityId, cityName) {
    console.log(`--- DEBUG MAPPA: ${cityName} ---`);
    
    let featuresLinee = [];
    let featuresStazioni = [];
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let endOfTime = appState.maxYear || 2025;
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let lineCoordinatesMap = new Map();
    let allPhysicalSections = [];
    let totalSectionsFound = 0;

    // 1. CICLO LINEE
    for (let line of cityLines) {
        let rels = db.section_lines.filter((sl) => sl.line_id === line.id);
        if (!lineCoordinatesMap.has(line.id)) lineCoordinatesMap.set(line.id, []);
        let currentLinePoints = lineCoordinatesMap.get(line.id);

        for (let rel of rels) {
            let section = db.sections.find((s) => s.id === rel.section_id);
            
            if (section && section.geometry) {
                let coords = parseGeometry(section.geometry);
                
                // --- FIX CRITICO: VALIDAZIONE COORDINATE ---
                // Se parseGeometry fallisce o restituisce roba strana, saltiamo per evitare crash
                if (!coords || !Array.isArray(coords) || coords.length === 0) {
                    console.warn(`Geometria invalida per sezione ${section.id}`, section.geometry);
                    continue;
                }
                
                // Controllo extra: ogni punto deve essere [num, num]
                let isValidGeo = coords.every(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]));
                if (!isValidGeo) {
                    console.warn(`Coordinate corrotte per sezione ${section.id}`);
                    continue;
                }
                // -------------------------------------------

                totalSectionsFound++;
                
                let buildstart = parseYear(section.buildstart);
                let opening = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;
                
                if (buildstart && buildstart < 1800) buildstart = null;
                if (opening && opening < 1800) opening = null;
                if (!opening) {
                    if (buildstart) opening = 9999;
                    else opening = endOfTime;
                }
                if (!buildstart) {
                    if (opening !== endOfTime) buildstart = opening;
                    else buildstart = endOfTime;
                }

                allPhysicalSections.push({ lineId: line.id, coords: coords, opening: opening });
                for (let pt of coords) currentLinePoints.push(pt);
                
                featuresLinee.push({
                    type: "Feature",
                    properties: {
                        color: fixColor(line.color),
                        lineId: line.id,
                        name: line.name,
                        buildstart: buildstart,
                        opening: opening,
                        closure: closure,
                        length: section.length || 0,
                    },
                    geometry: { type: "LineString", coordinates: coords },
                });
                
                coords.forEach((c) => bounds.extend(c));
                hasData = true;
            }
        }
    }

    // 2. CICLO STAZIONI
    let cityStations = db.stations.filter((s) => s.city_id === cityId);
    let disableProximityCheck = totalSectionsFound === 0;
    const MAX_DISTANCE_THRESHOLD = 0.02;

    for (let station of cityStations) {
        let coords = parseGeometry(station.geometry);
        // Validazione coordinate stazione
        if (!coords || isNaN(coords[0]) || isNaN(coords[1])) continue;

        let shouldShow = false;
        let stationLines = db.station_lines.filter((sl) => sl.station_id === station.id);

        if (disableProximityCheck) {
            shouldShow = true;
        } else {
            shouldShow = stationLines.some((sl) => {
                let linePoints = lineCoordinatesMap.get(sl.line_id);
                if (!linePoints || linePoints.length === 0) return false;
                return getDistanceFromLine(coords, linePoints) < MAX_DISTANCE_THRESHOLD;
            });
        }

        let buildstart = parseYear(station.buildstart);
        let opening = parseYear(station.opening);
        let closure = parseYear(station.closure) || 9999;

        if (buildstart && buildstart < 1800) buildstart = null;
        if (opening && opening < 1800) opening = null;

        if (!opening) {
            let servingLineIds = stationLines.map((sl) => sl.line_id);
            let candidateSections = allPhysicalSections.filter((sect) => servingLineIds.includes(sect.lineId));
            let validDates = [];
            for (let section of candidateSections) {
                let dist = getDistanceFromLine(coords, section.coords);
                if (dist < MAX_DISTANCE_THRESHOLD) validDates.push(section.opening);
            }
            if (validDates.length > 0) opening = Math.min(...validDates);
            else opening = endOfTime;
        }

        if (opening === endOfTime && buildstart) opening = 9999;
        if (!buildstart) {
            if (opening !== endOfTime) buildstart = opening;
            else buildstart = endOfTime;
        }

        if (shouldShow) {
            featuresStazioni.push({
                type: "Feature",
                properties: {
                    name: station.name,
                    id: station.id,
                    buildstart: buildstart,
                    opening: opening,
                    closure: closure,
                },
                geometry: { type: "Point", coordinates: coords },
            });
            bounds.extend(coords);
            hasData = true;
        }
    }

    // 3. RENDERING
    if (mappa.getSource("metro-lines")) mappa.removeSource("metro-lines");
    if (mappa.getSource("metro-stations")) mappa.removeSource("metro-stations");

    mappa.addSource("metro-lines", { type: "geojson", data: { type: "FeatureCollection", features: featuresLinee } });
    mappa.addSource("metro-stations", { type: "geojson", data: { type: "FeatureCollection", features: featuresStazioni } });

    ["lines-construction", "lines-operational", "lines-layer-hitbox", "stations-layer"].forEach((id) => {
        if (mappa.getLayer(id)) mappa.removeLayer(id);
    });

    let initialVisibility = appState.hasValidHistory ? "none" : "visible";

    mappa.addLayer({
        id: "lines-construction",
        type: "line",
        source: "metro-lines",
        layout: { "line-join": "round", "line-cap": "round", visibility: initialVisibility },
        paint: { "line-color": "#6e7b8d", "line-width": 3, "line-dasharray": [2, 2], "line-opacity": 0.8 },
    });
    mappa.addLayer({
        id: "lines-operational",
        type: "line",
        source: "metro-lines",
        layout: { "line-join": "round", "line-cap": "round", visibility: initialVisibility },
        paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.8 },
    });
    mappa.addLayer({
        id: "lines-layer-hitbox",
        type: "line",
        source: "metro-lines",
        layout: { visibility: initialVisibility },
        paint: { "line-width": 15, "line-opacity": 0 },
    });
    mappa.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "metro-stations",
        layout: { visibility: initialVisibility },
        paint: { "circle-radius": 4, "circle-color": "#ffffff", "circle-stroke-width": 1.5, "circle-stroke-color": "#334155" },
    });

    aggiornaFiltriCombinati();

    if (hasData) {
        boundsCittaCorrente = bounds;
        toggleMapInteractions(false);
        
        // --- FIX CRITICO: Check se i bounds sono validi prima di zoomare ---
        if (!bounds.isEmpty()) {
            mappa.fitBounds(bounds, { padding: 50 });

            mappa.once("moveend", () => {
                // Rivelazione Layer
                mappa.setLayoutProperty("lines-construction", "visibility", "visible");
                mappa.setLayoutProperty("lines-operational", "visibility", "visible");
                mappa.setLayoutProperty("lines-layer-hitbox", "visibility", "visible");
                mappa.setLayoutProperty("stations-layer", "visibility", "visible");

                // Blocco vista
                bloccaVistaConBuffer();
                toggleMapInteractions(true);

                if (appState.hasValidHistory) {
                    if (typeof sbloccaControlliTimeline === "function") sbloccaControlliTimeline();
                    if (typeof sbloccaControlliSidebar === "function") sbloccaControlliSidebar();

                    appState.hasCompletedFirstCycle = false;
                    togglePlayback(true);
                }
            });
        } else {
            console.error("Bounds vuoti. Nessuna coordinata valida trovata per questa città.");
            // Fallback: sblocca tutto per evitare che l'app si congeli
            toggleMapInteractions(true);
            let loader = select("#map-loader");
            if (loader) loader.remove();
        }
    } else {
        console.warn("Nessun dato da mostrare.");
        let loader = select("#map-loader");
        if (loader) loader.remove();
    }
}

// --- NUOVA FUNZIONE HELPER PER IL BLOCCO DELLA VISTA ---
// Calcola un buffer basato sui pixel dello schermo, così è uguale ovunque
function bloccaVistaConBuffer() {
    if (!mappa) return;

    let currentView = mappa.getBounds();
    let currentZoom = mappa.getZoom();

    // 1. Dimensioni contenitore in pixel
    const container = mappa.getContainer();
    const wPixel = container.clientWidth;
    const hPixel = container.clientHeight;

    // 2. Dimensioni mappa in gradi
    let spanLng = currentView.getEast() - currentView.getWest(); 
    let spanLat = currentView.getNorth() - currentView.getSouth(); 

    // 3. PIXEL DI MARGINE (Buffer): 100px per lato
    const PIXEL_BUFFER = 400; 

    // 4. Conversione Pixel -> Gradi
    let bufferX = (spanLng / wPixel) * PIXEL_BUFFER;
    let bufferY = (spanLat / hPixel) * PIXEL_BUFFER;

    // 5. Creazione MaxBounds
    let maxBounds = new mapboxgl.LngLatBounds(
        [currentView.getWest() - bufferX, currentView.getSouth() - bufferY],
        [currentView.getEast() + bufferX, currentView.getNorth() + bufferY]
    );

    // 6. Applicazione Limiti
    mappa.setMinZoom(currentZoom);
    mappa.setMaxBounds(maxBounds);
}

function aggiornaFiltriCombinati() {
    if (!mappa) return;
    let year = appState.currentYear;
    let isoId = appState.isolatedLineId;

    const condIsOpened = ["<=", ["get", "opening"], year];
    const condNotClosed = [
        "any",
        ["==", ["get", "closure"], 9999],
        [">", ["get", "closure"], year],
    ];
    const condBuildStarted = ["<=", ["get", "buildstart"], year];
    const condNotYetOpen = [">", ["get", "opening"], year];
    const condLineIso = isoId
        ? ["==", ["get", "lineId"], isoId]
        : ["has", "lineId"];

    const filterOp = ["all", condIsOpened, condNotClosed, condLineIso];
    const filterCons = ["all", condBuildStarted, condNotYetOpen, condLineIso];
    const filterHit = ["any", filterOp, filterCons];

    try {
        mappa.setFilter("lines-operational", filterOp);
        mappa.setFilter("lines-construction", filterCons);
        mappa.setFilter("lines-layer-hitbox", filterHit);
    } catch (e) {
        console.error(e);
    }

    let filterSt = ["all", condBuildStarted, condNotClosed];

    if (isoId) {
        let relazioni = db.station_lines.filter((sl) => sl.line_id === isoId);
        let validStationIds = relazioni.map((r) => r.station_id);

        if (validStationIds.length > 0) {
            filterSt.push(["in", ["get", "id"], ["literal", validStationIds]]);
        } else {
            filterSt = ["==", "id", -1];
        }
    }

    try {
        mappa.setFilter("stations-layer", filterSt);
    } catch (e) {}

    updateSidebarStats();
}

function isolaLineaSullaMappa(lineId) {
    appState.isolatedLineId = lineId;
    aggiornaFiltriCombinati();
}

function resetFiltriMappa() {
    appState.isolatedLineId = null;
    appState.currentYear = appState.maxYear;
    updateUIForAnimation();
    aggiornaFiltriCombinati();

    if (boundsCittaCorrente) {
        toggleMapInteractions(false);
        
        // *** FIX IMPORTANTE: SBLOCCARE PRIMA DI MUOVERE ***
        // Rimuoviamo i vincoli precedenti per permettere a fitBounds di lavorare liberamente
        mappa.setMaxBounds(null);
        mappa.setMinZoom(null);

        mappa.fitBounds(boundsCittaCorrente, { padding: 50 });
        
        mappa.once("moveend", () => {
            // Quando arriviamo alla vista resettata, ri-blocchiamo 
            // usando LA STESSA logica dell'avvio (buffer in pixel)
            bloccaVistaConBuffer();
            toggleMapInteractions(true);
        });
    }
}

function toggleMapInteractions(isActive) {
    if (!mappa) return;
    if (isActive) {
        mappa.scrollZoom.enable();
        mappa.dragPan.enable();
        mappa.doubleClickZoom.enable();
    } else {
        mappa.scrollZoom.disable();
        mappa.dragPan.disable();
        mappa.doubleClickZoom.disable();
    }
}

function aggiungiInterazioniMappa() {
    // 1. GESTIONE CLICK
    mappa.on("click", (e) => {
        let features = mappa.queryRenderedFeatures(e.point, {
            layers: ["stations-layer", "lines-layer-hitbox"],
        });

        if (!features.length) return;
        let topFeature = features[0];

        // --- A. CLICK SU STAZIONE ---
        if (topFeature.layer.id === "stations-layer") {
            let props = topFeature.properties;
            // Recuperiamo l'oggetto stazione completo dal DB usando l'ID
            let stationData = db.stations.find(s => s.id === props.id);
            if (!stationData) return;

            let coordinates = topFeature.geometry.coordinates.slice();
            let htmlContent = getStationPopupHTML(stationData);

            new mapboxgl.Popup({ offset: 10, maxWidth: '300px', anchor: 'bottom' })
                .setLngLat(coordinates)
                .setHTML(htmlContent)
                .addTo(mappa);
            
            return;
        }

        // --- B. CLICK SU LINEA ---
        if (topFeature.layer.id === "lines-layer-hitbox") {
            let props = topFeature.properties;
            let lineColor = props.color || "#333";
            let textColor = isColorLight(lineColor) ? "#000000" : "#ffffff";

            let htmlContent = `
                <div class="px-4 pt-2.5 pb-3 rounded-xl flex flex-col justify-center items-center min-w-[120px]"
                     style="background-color: ${lineColor}; color: ${textColor};">
                    <span class="text-[10px] uppercase tracking-widest opacity-85 font-medium">METRO LINE</span>
                    <h3 class="font-semibold text-xl leading-none text-center">
                        ${props.name}
                    </h3>
                </div>
            `;

            // Creiamo il popup
            let popup = new mapboxgl.Popup({ offset: 0, closeButton: false, anchor: 'bottom' })
                .setLngLat(e.lngLat)
                .setHTML(htmlContent)
                .addTo(mappa);

            // Sapendo che è 'bottom', coloriamo solo border-top-color.
            let popupElem = popup.getElement();
            let tip = popupElem.querySelector(".mapboxgl-popup-tip");
            if (tip) {
                tip.style.setProperty('border-top-color', lineColor, 'important');
            }
        }
    });

    // 2. GESTIONE CURSORE (HOVER)
    mappa.on("mousemove", (e) => {
        let features = mappa.queryRenderedFeatures(e.point, {
            layers: ["stations-layer", "lines-layer-hitbox"],
        });
        mappa.getCanvas().style.cursor = features.length ? "pointer" : "";
    });
}

function zoomSuStazione(station) {
    if (!mappa) return;
    let coords = parseGeometry(station.geometry);
    if (!coords) return;

    // Rimuoviamo temporaneamente i limiti per il volo
    mappa.setMaxBounds(null);
    mappa.setMinZoom(null);

    toggleMapInteractions(false);
    mappa.flyTo({ center: coords, zoom: 15 });

    mappa.once("moveend", () => {
        toggleMapInteractions(true);

        let htmlContent = getStationPopupHTML(station);
        new mapboxgl.Popup({ offset: 10, maxWidth: '300px', anchor: 'bottom' })
            .setLngLat(coords)
            .setHTML(htmlContent)
            .addTo(mappa);
    });
}

function calcolaBoundsCitta(cityId) {
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let lineIds = new Set(cityLines.map((l) => l.id));

    let rels = db.section_lines.filter(
        (sl) => sl.city_id === cityId && lineIds.has(sl.line_id)
    );

    for (let rel of rels) {
        let section = db.sections.find((s) => s.id === rel.section_id);
        if (section && section.geometry) {
            let coords = parseGeometry(section.geometry);
            if (coords) {
                coords.forEach((c) => bounds.extend(c));
                hasData = true;
            }
        }
    }

    let cityStations = db.stations.filter((s) => s.city_id === cityId);
    for (let station of cityStations) {
        let coords = parseGeometry(station.geometry);
        if (coords) {
            bounds.extend(coords);
            hasData = true;
        }
    }

    return hasData ? bounds : null;
}

function getDistanceFromLine(point, linePoints) {
    let minDistSq = Infinity;
    let px = point[0];
    let py = point[1];
    for (let i = 0; i < linePoints.length; i++) {
        let dx = px - linePoints[i][0];
        let dy = py - linePoints[i][1];
        let distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) minDistSq = distSq;
    }
    return Math.sqrt(minDistSq);
}

function getStationPopupHTML(station) {
    // 1. DATE: Usiamo ESCLUSIVAMENTE i dati della stazione cliccata (specifica della linea)
    // Se clicco Loreto M2, voglio vedere 1969, non 1964.
    let bStart = parseYear(station.buildstart);
    let open = parseYear(station.opening);
    let close = parseYear(station.closure);

    // 2. SERVING LINES: Qui invece aggreghiamo per mostrare il contesto (Interscambio)
    let targetName = station.name.trim().toLowerCase();
    
    // Cerchiamo fratelli per nome SOLO per popolare le pillole colorate
    let siblingStations = db.stations.filter(s => 
        s.city_id === station.city_id && 
        s.name.trim().toLowerCase() === targetName
    );

    let lineIds = new Set();
    for (let sib of siblingStations) {
        let rels = db.station_lines.filter(sl => sl.station_id === sib.id);
        rels.forEach(r => lineIds.add(r.line_id));
    }

    let servingLines = [];
    lineIds.forEach(lid => {
        let l = db.lines.find(line => line.id === lid);
        if (l) servingLines.push(l);
    });
    
    // Ordine alfabetico linee
    servingLines.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // 3. Costruzione HTML
    return `
        <div class="bg-white border-4 border-neutral-900 rounded-xl min-w-[220px]">
            <!-- Header -->
            <h3 class="p-3 bg-neutral-900 font-bold text-lg text-neutral-50 leading-tight">
                ${station.name}
            </h3>

            <!-- Serving Lines (Contesto) -->
            <div class="px-3 my-3">
                <span class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest block mb-1">SERVING LINES</span>
                <div class="flex flex-wrap gap-1.5">
                    ${servingLines.length > 0 ? servingLines.map(l => {
                        let tColor = isColorLight(fixColor(l.color)) ? '#000' : '#fff';
                        // Evidenziamo leggermente se la linea corrisponde a quella della stazione cliccata? 
                        // Opzionale, ma qui le mostriamo tutte uguali.
                        return `
                        <span class="text-sm font-bold px-2 py-0.5 rounded-md shadow-sm" 
                              style="background-color: ${fixColor(l.color)}; color: ${tColor};">
                            ${l.name}
                        </span>`;
                    }).join('') : '<span class="text-sm text-neutral-500 italic">No lines data</span>'}
                </div>
            </div>

            <!-- Date (Specifiche del record cliccato) -->
            <div class="px-3 my-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest block">CONSTR.</span>
                    <span class="font-bold text-neutral-700 tabular-nums">
                        ${formatDateRange(bStart, open, false)}
                    </span>
                </div>
                <div>
                    <span class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest block">OPERATIONAL</span>
                    <span class="font-bold text-neutral-700 tabular-nums">
                        ${formatDateRange(open, close, true)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Formatta date (es. "2000 - 2005" o "Since 2000")
function formatDateRange(start, end, isOperational) {
    let s = parseInt(start);
    let e = parseInt(end);
    let endOfTime = appState.maxYear || 2025; 

    if (!s || isNaN(s) || s > 2050) s = "?";
    
    if (isOperational) {
        // Se è operativo e la chiusura non c'è o è futura
        if (!e || isNaN(e) || e >= endOfTime || e === 9999) {
            return `Since ${s}`;
        }
        return `${s} – ${e}`;
    } else {
        // Costruzione
        if (!e || isNaN(e) || e >= endOfTime || e === 9999) {
            return `${s} – ...`;
        }
        return `${s} – ${e}`;
    }
}