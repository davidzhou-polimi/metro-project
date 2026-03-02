function disegnaElementiMappa(cityId, cityName) {
    let featuresLinee = [];
    let featuresStazioni = [];
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let endOfTime = appState.maxYear || CURRENT_YEAR;
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    // Mappa line.id -> line object per lookup rapido
    let lineMap = new Map(cityLines.map(l => [l.id, l]));
    
    // Mappa per salvare le coordinate di ogni linea (per il calcolo della distanza)
    let lineCoordinatesMap = new Map();
    let lineSectionsDataMap = new Map();
    let totalSectionsFound = 0;

    // 1. CICLO LINEE
    for (let line of cityLines) {
        let rels = db.section_lines.filter((sl) => sl.line_id === line.id);

        if (!lineCoordinatesMap.has(line.id)) lineCoordinatesMap.set(line.id, []);
        let currentLinePoints = lineCoordinatesMap.get(line.id);

        if (!lineSectionsDataMap.has(line.id)) lineSectionsDataMap.set(line.id, []);
        let currentLineSections = lineSectionsDataMap.get(line.id);

        for (let rel of rels) {
            let section = db.sections.find((s) => s.id === rel.section_id);

            if (!section) continue;

            if (section && section.geometry) {
                let coords = parseGeometry(section.geometry);
                
                // --- FIX CRITICO: VALIDAZIONE COORDINATE ---
                if (!coords || !Array.isArray(coords) || coords.length === 0) continue;
                
                let isValidGeo = coords.every(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]));
                if (!isValidGeo) continue;
                
                let buildstart = parseYear(section.buildstart);
                let opening = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;

                let isInstant = false;
                if (buildstart === opening || !buildstart) isInstant = true;

                // --- ERDITARIETÀ LINEA DA STAZIONI (Punto Inverso) ---
                if (!opening && !buildstart) {
                    let inheritedOp = getInheritedLineOpening(line.id);
                    if (inheritedOp) opening = inheritedOp;
                }

                // --- POINT 2: LIMITI RELAZIONALI (section_lines) ---
                let relFrom = parseYear(rel.fromyear);
                let relTo = parseYear(rel.toyear);

                if (relFrom) {
                    // Se la linea usa la sezione da un certo anno, l'apertura per QUELLA linea 
                    // non può essere precedente a relFrom.
                    if (!opening || opening < relFrom) {
                         opening = relFrom;
                         buildstart = relFrom;
                    }
                }
                if (relTo) {
                    // Se la linea smette di usare la sezione in un certo anno
                    if (closure > relTo) closure = relTo;
                }
                
                if (buildstart && buildstart < 1863) buildstart = null;
                if (opening && opening < 1863) opening = null;

                if (!opening) {
                    if (buildstart) opening = 9999;
                    else opening = endOfTime;
                }
                if (!buildstart) {
                    if (opening !== endOfTime) buildstart = opening;
                    else buildstart = endOfTime;
                }

                if (isInstant) buildstart = opening;

                currentLineSections.push({
                    coords: coords,
                    buildstart: buildstart,
                    opening: opening,
                    closure: closure
                });
                
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
                coords.forEach((c) => {
                    bounds.extend(c);
                    currentLinePoints.push(c);
                });
                totalSectionsFound++;
                hasData = true;
            }
        }
    }


    // 2. CICLO STAZIONI (BINDING RELAZIONALE + CONTROLLO SPAZIALE)
    let cityStations = db.stations.filter((s) => s.city_id === cityId);
    let disableProximityCheck = totalSectionsFound === 0;
    const MAX_DISTANCE_THRESHOLD = 0.02;

    for (let station of cityStations) {
        let coords = parseGeometry(station.geometry);
        if (!coords || isNaN(coords[0]) || isNaN(coords[1])) continue;

        let stationLineRel = db.station_lines.find((sl) => sl.station_id === station.id);
        if (!stationLineRel) continue; // Stazione orfana, saltiamo

        let boundLine = lineMap.get(stationLineRel.line_id);
        if (!boundLine) continue; // Linea non presente in questa città
        
        // Verifichiamo anche che la stazione non sia un outlier (troppo distante dalla sua linea)
        if (!disableProximityCheck) {
            let linePoints = lineCoordinatesMap.get(boundLine.id);
            if (!linePoints || linePoints.length === 0 || getDistanceFromLine(coords, linePoints) > MAX_DISTANCE_THRESHOLD) {
                continue; // Stazione troppo lontana dalla sua linea fisica, considerata "fantasma" e scartata
            }
        }

        let buildstart = parseYear(station.buildstart);
        let opening = parseYear(station.opening);
        let closure = parseYear(station.closure) || 9999;

        // --- NEW: Trova la sezione più vicina della linea per ereditare i limiti ---
        let nearestSection = null;
        let lineSections = lineSectionsDataMap.get(boundLine.id);
        if (lineSections && lineSections.length > 0) {
            let minDist = Infinity;
            for (let secData of lineSections) {
                let dist = getDistanceFromLine(coords, secData.coords);
                if (dist < minDist) {
                    minDist = dist;
                    nearestSection = secData;
                }
            }
        }

        if (nearestSection) {
            // Se la stazione "finge" di essere costruita decenni prima (es. perché parte di un'altra linea non mostrata)
            // forziamola a comparire solo quando iniziano i lavori sulla tratta a cui l'abbiamo legata 
            // (oppure direttamente all'apertura se la tratta non ha cantiere)
            if (nearestSection.buildstart && (!buildstart || buildstart < nearestSection.buildstart)) {
                buildstart = nearestSection.buildstart;
            }

            // La stazione non può essere operativa prima o dopo la sua tratta fisica
            if (nearestSection.opening && (!opening || opening < nearestSection.opening)) {
                opening = nearestSection.opening;
            }
            if (nearestSection.closure && closure > nearestSection.closure) {
                closure = nearestSection.closure;
            }
        }

        let isInstant = false;
        if (buildstart === opening || !buildstart) isInstant = true;

        // --- LIMITI RELAZIONALI (station_lines) ---
        let relFrom = parseYear(stationLineRel.fromyear);
        let relTo = parseYear(stationLineRel.toyear);

        if (relFrom) {
            if (!opening || opening < relFrom) opening = relFrom;
        }
        if (relTo) {
            if (closure > relTo) closure = relTo;
        }

        // --- EREDITARIETÀ (solo se mancano ENTRAMBE le date) ---
        if (!opening && !buildstart) {
            let inheritedOp = getInheritedLineOpening(boundLine.id);
            if (inheritedOp) opening = inheritedOp;
        }

        // --- FALLBACK DATE ---
        if (!opening) {
            if (buildstart) opening = 9999;
            else opening = endOfTime;
        }
        if (!buildstart) {
            if (opening !== endOfTime) buildstart = opening;
            else buildstart = endOfTime;
        }

        if (isInstant) buildstart = opening;

        featuresStazioni.push({
            type: "Feature",
            properties: {
                name: station.name,
                id: station.id,
                lineId: boundLine.id,
                color: fixColor(boundLine.color),
                buildstart: buildstart,
                opening: opening,
                closure: closure,
            },
            geometry: { type: "Point", coordinates: coords },
        });
        
        bounds.extend(coords);
        hasData = true;
    }

    // 3. RENDERING
    // Salviamo globalmente per i popup:
    appState.cityFeaturesStazioni = featuresStazioni;

    if (mappa.getSource("metro-lines")) mappa.removeSource("metro-lines");
    if (mappa.getSource("metro-stations")) mappa.removeSource("metro-stations");

    mappa.addSource("metro-lines", { type: "geojson", data: { type: "FeatureCollection", features: featuresLinee } });
    mappa.addSource("metro-stations", { type: "geojson", data: { type: "FeatureCollection", features: featuresStazioni } });

    ["lines-construction", "lines-operational", "lines-layer-hitbox", "stations-construction", "stations-operational"].forEach((id) => {
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
    // --- STAZIONI: Due layer separati per stato visivo ---
    mappa.addLayer({
        id: "stations-construction",
        type: "circle",
        source: "metro-stations",
        layout: { visibility: initialVisibility },
        paint: { 
            "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 3,  // zoom out: smaller radius
                15, 4   // zoom in: larger radius
            ], 
            "circle-color": "#ffffff", 
            "circle-stroke-width": [
                "interpolate", ["linear"], ["zoom"],
                10, 1.5,
                15, 2
            ], 
            "circle-stroke-color": "#6e7b8d" 
        },
    });
    mappa.addLayer({
        id: "stations-operational",
        type: "circle",
        source: "metro-stations",
        layout: { visibility: initialVisibility },
        paint: { 
            "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 3,  // zoom out: smaller radius
                15, 4   // zoom in: larger radius
            ], 
            "circle-color": "#ffffff", 
            "circle-stroke-width": [
                "interpolate", ["linear"], ["zoom"],
                10, 1.5,
                15, 2
            ], 
            "circle-stroke-color": ["get", "color"] 
        },
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
                mappa.setLayoutProperty("stations-construction", "visibility", "visible");
                mappa.setLayoutProperty("stations-operational", "visibility", "visible");

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

    // 1. Prendiamo i bounds ATTUALI della telecamera.
    // Siccome siamo nel "moveend" riga 264 (subito dopo fitBounds), mappa.getBounds()
    // rappresenta la vista ESATTA (16:9 o simili) che contiene la città più i 50px di padding.
    // Questo è il VERO box minimo proporzionale allo schermo che non fa "impazzire" Mapbox.
    let currentViewBounds = mappa.getBounds();

    // 2. Troviamo lo span della vista in gradi
    let viewLng = currentViewBounds.getEast() - currentViewBounds.getWest(); 
    let viewLat = currentViewBounds.getNorth() - currentViewBounds.getSouth(); 
    
    // 3. PIXEL DI MARGINE ESATTI (es. 400px per lato)
    const PIXEL_BUFFER = 400; 
    
    // Calcoliamo quanti gradi rappresenta un pixel.
    const container = mappa.getContainer();
    const wPixel = container.clientWidth || window.innerWidth;
    const hPixel = container.clientHeight || window.innerHeight;

    let degreesPerPixelX = viewLng / wPixel;
    let degreesPerPixelY = viewLat / hPixel;

    // --- PADDING PROPORZIONATO (Nuova Logica) ---
    // Invece di dare 400px slegati su X e Y (che su uno schermo largo gonfia
    // artificialmente l'asse Y percepito in gradi), proporzioniamo il buffer 
    // al lato maggiore dello schermo:
    let isLandscape = wPixel > hPixel;
    
    // Il lato MAGGIORE riceve esattamente i 400px di buffer desiderati.
    // Il lato MINORE riceve un buffer ridotto in proporzione all'aspect ratio.
    let bufferPixelsX = isLandscape ? PIXEL_BUFFER : (PIXEL_BUFFER * (wPixel / hPixel));
    let bufferPixelsY = isLandscape ? (PIXEL_BUFFER * (hPixel / wPixel)) : PIXEL_BUFFER;

    let bufferX = degreesPerPixelX * bufferPixelsX;
    let bufferY = degreesPerPixelY * bufferPixelsY;

    // 4. Creazione MaxBounds espandendo la vista esatta
    let maxBounds = new mapboxgl.LngLatBounds(
        [currentViewBounds.getWest() - bufferX, currentViewBounds.getSouth() - bufferY],
        [currentViewBounds.getEast() + bufferX, currentViewBounds.getNorth() + bufferY]
    );

    // 5. Configurazione Limiti e riavvolgimento
    // Il minZoom è calcolato dinamicamente per permettere un leggero margine e 
    // far combaciare la vista massima esatta senza lo scivolamento (wiggle room).
    mappa.setMaxBounds(maxBounds);
    
    // Impostiamo il minZoom un po' più lontano dello zoom target di fitBounds,
    // così l'utente può fare zoom-out fino al limite del maxBounds, ma non oltre.
    let currentZoom = mappa.getZoom();
    // Calcoliamo un margine ragionevole (ad es. -0.5 o basato sul PIXEL_BUFFER)
    mappa.setMinZoom(Math.max(1.5, currentZoom - 1)); 
}

function aggiornaFiltriCombinati() {
    if (!mappa) return;
    let year = appState.currentYear;

    // --- DIAGNOSTICA TEMPORANEA ---
    if (mappa.getSource("metro-lines")) {
        let features = mappa.querySourceFeatures("metro-lines");
        if (features.length > 0 && (year === appState.minYear || year === appState.minYear + 1)) {
            console.group(`[filtri] Anno: ${year} | minYear=${appState.minYear} | maxYear=${appState.maxYear} | hasValidHistory=${appState.hasValidHistory}`);
            features.forEach(f => {
                let p = f.properties;
                let passCons = p.buildstart <= year && p.opening > year;
                let passOp = p.opening <= year && p.closure > year;
                console.log(`  Linea "${p.name}" sezione: buildstart=${p.buildstart}, opening=${p.opening}, closure=${p.closure} → cons=${passCons}, op=${passOp}`);
            });
            console.groupEnd();
        }
    }
    // --- FINE DIAGNOSTICA ---

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

    // --- FILTRO STAZIONI (Semplificato via lineId binding) ---
    const filterStOp = ["all", condIsOpened, condNotClosed, condNotHidden];
    const filterStCons = ["all", condBuildStarted, condNotYetOpen, condNotHidden];

    try {
        mappa.setFilter("stations-operational", filterStOp);
        mappa.setFilter("stations-construction", filterStCons);
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
            layers: ["stations-operational", "stations-construction", "lines-layer-hitbox"],
        });

        if (!features.length) return;
        let topFeature = features[0];

        chiudiPopupCorrente();

        // --- A. CLICK SU STAZIONE ---
        if (topFeature.layer.id === "stations-operational" || topFeature.layer.id === "stations-construction") {
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
            layers: ["stations-operational", "stations-construction", "lines-layer-hitbox"],
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
    let constrText = formatDateRange(bStart, open, false);
    let operText = formatDateRange(open, close, true);
    
    let hasConstr = constrText !== 'N/A' && bStart !== open;
    let hasOper = operText !== 'N/A';
    
    let gridCols = (hasConstr && hasOper) ? 'grid-cols-2' : 'grid-cols-1';

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
            ${(hasConstr || hasOper) ? `
            <div class="px-3 my-3 grid ${gridCols} gap-3 text-sm">
                ${hasConstr ? `
                <div>
                    <span class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest block">${hasOper ? 'CONSTR.' : 'CONSTRUCTION'}</span>
                    <span class="font-bold text-neutral-700 tabular-nums">
                        ${constrText}
                    </span>
                </div>
                ` : ''}
                ${hasOper ? `
                <div>
                    <span class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest block">OPERATIONAL</span>
                    <span class="font-bold text-neutral-700 tabular-nums">
                        ${operText}
                    </span>
                </div>
                ` : ''}
            </div>` : ''}
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