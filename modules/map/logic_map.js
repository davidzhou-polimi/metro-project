function disegnaElementiMappa(cityId, cityName) {
    console.log(`--- DEBUG MAPPA: ${cityName} ---`);
    
    let featuresLinee = [];
    let featuresStazioni = [];
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let endOfTime = appState.maxYear || CURRENT_YEAR;
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
                if (!coords || !Array.isArray(coords) || coords.length === 0) {
                    console.warn(`Geometria invalida per sezione ${section.id}`, section.geometry);
                    continue;
                }
                
                let isValidGeo = coords.every(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]));
                if (!isValidGeo) {
                    console.warn(`Coordinate corrotte per sezione ${section.id}`);
                    continue;
                }

                totalSectionsFound++;
                
                let buildstart = parseYear(section.buildstart);
                let opening = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;

                // --- ERDITARIETÀ LINEA DA STAZIONI (Punto Inverso) ---
                if (!opening) {
                    let inheritedOp = getInheritedLineOpening(line.id);
                    if (inheritedOp) opening = inheritedOp;
                }

                // --- POINT 2: LIMITI RELAZIONALI (section_lines) ---
                let relFrom = parseYear(rel.fromyear);
                let relTo = parseYear(rel.toyear);

                if (relFrom) {
                    // Se la linea usa la sezione da un certo anno, l'apertura per QUELLA linea 
                    // non può essere precedente a relFrom.
                    if (!opening || opening < relFrom) opening = relFrom;
                }
                if (relTo) {
                    // Se la linea smette di usare la sezione in un certo anno
                    if (closure > relTo) closure = relTo;
                }
                
                if (buildstart && buildstart < 1860) buildstart = null;
                if (opening && opening < 1860) opening = null;

                if (!opening) {
                    if (buildstart) opening = 9999;
                    else opening = endOfTime;
                }
                if (!buildstart) {
                    if (opening !== endOfTime) buildstart = opening;
                    else buildstart = endOfTime;
                }

                allPhysicalSections.push({ 
                    lineId: line.id, 
                    coords: coords, 
                    opening: opening, 
                    closure: closure,
                    sectionId: section.id 
                });
                
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

        if (buildstart && buildstart < 1860) buildstart = null;
        if (opening && opening < 1860) opening = null;

        // --- GESTIONE DATE STAZIONE (Inclusi Limiti Relazionali) ---
        if (!opening) {
            let servingLineIds = stationLines.map((sl) => sl.line_id);
            // Consideriamo solo le sezioni delle linee che passano effettivamente per la stazione
            let validDates = [];
            for (let sect of allPhysicalSections) {
                if (servingLineIds.includes(sect.lineId)) {
                    let dist = getDistanceFromLine(coords, sect.coords);
                    if (dist < MAX_DISTANCE_THRESHOLD) {
                        // Verifichiamo se la station_line specifica ha un fromyear
                        let slRel = stationLines.find(sl => sl.line_id === sect.lineId);
                        let slFrom = slRel ? parseYear(slRel.fromyear) : null;
                        let effectiveOp = slFrom ? Math.max(sect.opening, slFrom) : sect.opening;
                        validDates.push(effectiveOp);
                    }
                }
            }
            if (validDates.length > 0) opening = Math.min(...validDates);
            else opening = endOfTime;
        }

        if (opening === endOfTime && buildstart) opening = 9999;
        if (!buildstart) {
            if (opening !== endOfTime) buildstart = opening;
            else buildstart = endOfTime;
        }

        // --- GESTIONE CHIUSURA STAZIONE (EREDITÀ LINEE) ---
        if (closure === 9999) {
            let servingLineIds = stationLines.map((sl) => sl.line_id);
            let isAnyLineStillOpen = false;
            let maxClosureDetected = 0;
            let sectionsNearCount = 0;

            for (let sect of allPhysicalSections) {
                if (servingLineIds.includes(sect.lineId)) {
                    let dist = getDistanceFromLine(coords, sect.coords);
                    if (dist < MAX_DISTANCE_THRESHOLD) {
                        sectionsNearCount++;
                        // Controlliamo il toyear della station_line
                        let slRel = stationLines.find(sl => sl.line_id === sect.lineId);
                        let slTo = slRel ? parseYear(slRel.toyear) : null;
                        
                        let effectiveClosure = sect.closure;
                        if (slTo && slTo < effectiveClosure) effectiveClosure = slTo;

                        if (!effectiveClosure || effectiveClosure >= endOfTime || effectiveClosure === 9999) {
                            isAnyLineStillOpen = true;
                            break;
                        }
                        if (effectiveClosure > maxClosureDetected) maxClosureDetected = effectiveClosure;
                    }
                }
            }

            if (sectionsNearCount > 0 && !isAnyLineStillOpen && maxClosureDetected > 0) {
                closure = maxClosureDetected;
            }
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
    // Salviamo globalmente per i popup:
    appState.cityFeaturesStazioni = featuresStazioni;

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
        paint: { "line-color": "#6e7b8d", "line-width": 5, "line-dasharray": [2, 2], "line-opacity": 0.8 },
    });
    mappa.addLayer({
        id: "lines-operational",
        type: "line",
        source: "metro-lines",
        layout: { "line-join": "round", "line-cap": "round", visibility: initialVisibility },
        paint: { "line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.8 },
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
function bloccaVistaConBuffer() {
    if (!mappa) return;

    // --- FIX: Usa i bounds della città invece della vista corrente ---
    // Se usassimo mappa.getBounds() mentre siamo zoomati, bloccheremmo la vista
    // in quella piccola area. Usando boundsCittaCorrente ripristiniamo i limiti globali.
    let boundsRiferimento = (typeof boundsCittaCorrente !== 'undefined' && boundsCittaCorrente && !boundsCittaCorrente.isEmpty()) 
        ? boundsCittaCorrente 
        : mappa.getBounds();

    // 1. Dimensioni contenitore in pixel
    const container = mappa.getContainer();
    const wPixel = container.clientWidth;
    const hPixel = container.clientHeight;

    // 2. Dimensioni mappa in gradi (basate sulla città intera)
    let spanLng = boundsRiferimento.getEast() - boundsRiferimento.getWest(); 
    let spanLat = boundsRiferimento.getNorth() - boundsRiferimento.getSouth(); 

    // 3. PIXEL DI MARGINE (Buffer): 400px per lato
    const PIXEL_BUFFER = 400; 

    // 4. Conversione Pixel -> Gradi (proporzionata alla città intera)
    let bufferX = (spanLng / wPixel) * PIXEL_BUFFER;
    let bufferY = (spanLat / hPixel) * PIXEL_BUFFER;

    // 5. Creazione MaxBounds
    let maxBounds = new mapboxgl.LngLatBounds(
        [boundsRiferimento.getWest() - bufferX, boundsRiferimento.getSouth() - bufferY],
        [boundsRiferimento.getEast() + bufferX, boundsRiferimento.getNorth() + bufferY]
    );

    // 6. Applicazione Limiti
    mappa.setMinZoom(1.5); 
    mappa.setMaxBounds(maxBounds);
}

function aggiornaFiltriCombinati() {
    if (!mappa) return;
    let year = appState.currentYear;
    
    // Recuperiamo la blacklist (assicurandoci che sia un array)
    let hiddenIds = appState.hiddenLineIds || [];

    const condIsOpened = ["<=", ["get", "opening"], year];
    const condNotClosed = [
        "any",
        ["==", ["get", "closure"], 9999],
        [">", ["get", "closure"], year],
    ];
    const condBuildStarted = ["<=", ["get", "buildstart"], year];
    const condNotYetOpen = [">", ["get", "opening"], year];
    
    // --- FILTRO MULTI-SELEZIONE ---
    // La condizione è: l'ID della linea NON deve essere nell'array hiddenIds
    const condNotHidden = hiddenIds.length > 0 
        ? ["!", ["in", ["get", "lineId"], ["literal", hiddenIds]]] 
        : true;

    const filterOp = ["all", condIsOpened, condNotClosed, condNotHidden];
    const filterCons = ["all", condBuildStarted, condNotYetOpen, condNotHidden];
    // Hitbox deve seguire la visibilità: se è nascosta, non deve essere cliccabile
    const filterHit = ["any", filterOp, filterCons];

    try {
        mappa.setFilter("lines-operational", filterOp);
        mappa.setFilter("lines-construction", filterCons);
        mappa.setFilter("lines-layer-hitbox", filterHit);
    } catch (e) {
        console.error("Errore update filtri linee:", e);
    }

    // --- FILTRO STAZIONI (Smart) ---
    // Nascondiamo le stazioni che non sono servite da nessuna linea visibile
    let filterSt = ["all", condBuildStarted, condNotClosed];

    if (appState.activeCityId) {
        let cityLines = db.lines.filter(l => l.city_id === appState.activeCityId);
        
        // Calcola quali linee sono visibili ORA
        let visibleLineIds = cityLines
            .map(l => l.id)
            .filter(id => !hiddenIds.includes(id));

        // Troviamo le relazioni per queste linee
        let visibleRelations = db.station_lines.filter(sl => visibleLineIds.includes(sl.line_id));
        
        // Estraiamo gli ID stazioni univoci
        let visibleStationIds = [...new Set(visibleRelations.map(r => r.station_id))];

        if (visibleStationIds.length > 0) {
            filterSt.push(["in", ["get", "id"], ["literal", visibleStationIds]]);
        } else {
            // Se tutte le linee sono nascoste, nascondi tutte le stazioni
            filterSt.push(["==", ["get", "id"], -1]);
        }
    }

    try {
        mappa.setFilter("stations-layer", filterSt);
    } catch (e) {}

    updateSidebarStats();
}

function resetFiltriMappa() {
    appState.hiddenLineIds = [];
    appState.currentYear = appState.maxYear;

    // Aggiorna le icone visivamente
    applicaCambiamentiVisibilita();

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

        chiudiPopupCorrente();

        // --- A. CLICK SU STAZIONE ---
        if (topFeature.layer.id === "stations-layer") {
            let props = topFeature.properties;
            // Recuperiamo l'oggetto stazione completo dal DB usando l'ID
            let stationData = db.stations.find(s => s.id === props.id);
            if (!stationData) return;

            let coordinates = topFeature.geometry.coordinates.slice();
            let htmlContent = getStationPopupHTML(stationData);

            currentPopup = new mapboxgl.Popup({ offset: 10, maxWidth: '300px', anchor: 'bottom' })
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
            currentPopup = new mapboxgl.Popup({ offset: 0, closeButton: false, anchor: 'bottom' })
                .setLngLat(e.lngLat)
                .setHTML(htmlContent)
                .addTo(mappa);

            // Sapendo che è 'bottom', coloriamo solo border-top-color.
            let popupElem = currentPopup.getElement();
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

    // Chiudiamo eventuali popup aperti PRIMA di muoverci
    chiudiPopupCorrente();

    // Sblocchiamo SOLO i confini di movimento per permettere il volo,
    // ma MANTENIAMO il limite di zoom minimo (1.5) così non si vede il mondo minuscolo.
    mappa.setMaxBounds(null);
    // mappa.setMinZoom(null); <--- RIMOSSO: Questo causava il bug "dezoom infinito"

    toggleMapInteractions(false);
    mappa.flyTo({ center: coords, zoom: 15 });

    mappa.once("moveend", () => {
        toggleMapInteractions(true);
        
        // Ri-applichiamo i limiti di movimento dopo lo zoom
        // così l'utente non può scappare via dalla città
        bloccaVistaConBuffer();

        let htmlContent = getStationPopupHTML(station);

        // Salviamo il riferimento in currentPopup
        currentPopup = new mapboxgl.Popup({ 
            offset: 10, 
            maxWidth: '300px',
            anchor: 'bottom'
        })
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
    let currentYear = appState.currentYear || new Date().getFullYear();

    // 1. DATE: Usiamo ESCLUSIVAMENTE i dati della stazione cliccata (specifica della linea)
    // Cerchiamo la feature appena salvata per usare le date vere (calcolate)
    let feature = (appState.cityFeaturesStazioni || []).find(f => f.properties.id === station.id);
    let bStart = feature ? feature.properties.buildstart : parseYear(station.buildstart);
    let open = feature ? feature.properties.opening : parseYear(station.opening);
    let close = feature ? feature.properties.closure : parseYear(station.closure);

    // 2. SERVING LINES: Qui invece aggreghiamo per mostrare il contesto (Interscambio)
    let targetName = station.name.trim().toLowerCase();
    
    // Cerchiamo fratelli per nome SOLO per popolare le pillole colorate
    let siblingStations = db.stations.filter(s => 
        s.city_id === station.city_id && 
        s.name.trim().toLowerCase() === targetName
    );

    let lineIds = new Set();
    for (let sib of siblingStations) {
        // Troviamo la corrispettiva feature calcolata
        let sibFeature = (appState.cityFeaturesStazioni || []).find(f => f.properties.id === sib.id);
        
        let sibB = sibFeature ? sibFeature.properties.buildstart : parseYear(sib.buildstart);
        let sibOp = sibFeature ? sibFeature.properties.opening : parseYear(sib.opening);
        let sibCl = sibFeature ? sibFeature.properties.closure : parseYear(sib.closure) || 9999;

        // Se l'apertura effettiva non è stata calcolata o è indefinita (es: endOfTime=9999), 
        // fallback alle date del DB.
        let baseStart = sibOp || sibB || 0;
        let baseEnd = sibCl;

        let rels = db.station_lines.filter(sl => sl.station_id === sib.id);
        for (let r of rels) {
            let relFrom = parseYear(r.fromyear);
            let relTo = parseYear(r.toyear);
            
            // Applichiamo i limiti di relazione line_station
            let effectiveStart = relFrom ? Math.max(baseStart, relFrom) : baseStart;
            let effectiveEnd = relTo ? Math.min(baseEnd, relTo) : baseEnd;

            // Una linea passa dalla stazione se:
            // 1. La stazione è aperta E la relazione è attiva in questo anno (uso effettivo)
            // 2. OPPURE la stazione è in costruzione E stiamo per aprirla (baseStart > currentYear >= sibB se sibB c'è)
            // Per includerla anche in fase di cantiere:
            let isOperating = currentYear >= effectiveStart && currentYear < effectiveEnd;
            let isConstructing = sibB && currentYear >= sibB && currentYear < effectiveStart;
            
            if (isOperating || isConstructing) {
                lineIds.add(r.line_id);
            }
        }
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

function chiudiPopupCorrente() {
    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }
}

// Formatta date (es. "2000 - 2005" o "Since 2000")
function formatDateRange(start, end, isOperational) {
    let s = parseInt(start);
    let e = parseInt(end);
    let endOfTime = appState.maxYear || CURRENT_YEAR; 

    if (!s || isNaN(s) || s > 2050) s = "N/A";
    
    if (isOperational) {
        // Se è operativo e la chiusura non c'è o è futura
        if (!e || isNaN(e) || e >= endOfTime || e === 9999) {
            return s === "N/A" ? "N/A" : `Since ${s}`;
        }
        return `${s} – ${e}`;
    } else {
        // Costruzione
        // e qui è l'anno di apertura (o presunto tale)
        if (!e || isNaN(e) || e >= endOfTime || e === 9999) {
            return s === "N/A" ? "N/A" : `Since ${s}`;
        }
        return `${s} – ${e}`;
    }
}