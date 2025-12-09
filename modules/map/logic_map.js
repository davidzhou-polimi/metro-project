function disegnaElementiMappa(cityId, cityName) {
    let featuresLinee = [];
    let featuresStazioni = [];
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let endOfTime = appState.maxYear || 2025;

    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let lineCoordinatesMap = new Map();

    // Array per tracciare tutti i singoli segmenti fisici
    let allPhysicalSections = [];

    let totalSectionsFound = 0;

    // --- 1. CICLO LINEE ---
    for (let line of cityLines) {
        let rels = db.section_lines.filter((sl) => sl.line_id === line.id);

        if (!lineCoordinatesMap.has(line.id)) {
            lineCoordinatesMap.set(line.id, []);
        }
        let currentLinePoints = lineCoordinatesMap.get(line.id);

        for (let rel of rels) {
            let section = db.sections.find((s) => s.id === rel.section_id);
            if (section && section.geometry) {
                totalSectionsFound++;
                let coords = parseGeometry(section.geometry);

                let buildstart = parseYear(section.buildstart);
                let opening = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;

                // Fix dati sporchi
                if (buildstart && buildstart < 1800) buildstart = null;
                if (opening && opening < 1800) opening = null;

                // Logica "In Costruzione" vs "Snapshot"
                if (!opening) {
                    if (buildstart) {
                        opening = 9999;
                    } else {
                        opening = endOfTime;
                    }
                }

                if (!buildstart) {
                    if (opening !== endOfTime) buildstart = opening;
                    else buildstart = endOfTime;
                }

                if (coords) {
                    allPhysicalSections.push({
                        lineId: line.id,
                        coords: coords,
                        opening: opening,
                    });

                    for (let pt of coords) {
                        currentLinePoints.push(pt);
                    }

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
    }

    let cityStations = db.stations.filter((s) => s.city_id === cityId);
    let disableProximityCheck = totalSectionsFound === 0;
    const MAX_DISTANCE_THRESHOLD = 0.02;

    // --- 2. CICLO STAZIONI ---
    for (let station of cityStations) {
        let coords = parseGeometry(station.geometry);
        if (!coords) continue;

        let shouldShow = false;
        let stationLines = db.station_lines.filter(
            (sl) => sl.station_id === station.id
        );

        if (disableProximityCheck) {
            shouldShow = true;
        } else {
            shouldShow = stationLines.some((sl) => {
                let linePoints = lineCoordinatesMap.get(sl.line_id);
                if (!linePoints || linePoints.length === 0) return false;
                return (
                    getDistanceFromLine(coords, linePoints) <
                    MAX_DISTANCE_THRESHOLD
                );
            });
        }

        let buildstart = parseYear(station.buildstart);
        let opening = parseYear(station.opening);
        let closure = parseYear(station.closure) || 9999;

        if (buildstart && buildstart < 1800) buildstart = null;
        if (opening && opening < 1800) opening = null;

        if (!opening) {
            let servingLineIds = stationLines.map((sl) => sl.line_id);
            let candidateSections = allPhysicalSections.filter((sect) =>
                servingLineIds.includes(sect.lineId)
            );

            let validDates = [];

            for (let section of candidateSections) {
                let dist = getDistanceFromLine(coords, section.coords);
                if (dist < MAX_DISTANCE_THRESHOLD) {
                    validDates.push(section.opening);
                }
            }

            if (validDates.length > 0) {
                opening = Math.min(...validDates);
            } else {
                opening = endOfTime;
            }
        }

        if (opening === endOfTime && buildstart) {
            opening = 9999;
        }

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

    // --- 3. RENDERING ---
    if (mappa.getSource("metro-lines")) mappa.removeSource("metro-lines");
    if (mappa.getSource("metro-stations")) mappa.removeSource("metro-stations");

    mappa.addSource("metro-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: featuresLinee },
    });
    mappa.addSource("metro-stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: featuresStazioni },
    });

    [
        "lines-construction",
        "lines-operational",
        "lines-layer-hitbox",
        "stations-layer",
    ].forEach((id) => {
        if (mappa.getLayer(id)) mappa.removeLayer(id);
    });

    let initialVisibility = appState.hasValidHistory ? "none" : "visible";

    mappa.addLayer({
        id: "lines-construction",
        type: "line",
        source: "metro-lines",
        layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: initialVisibility,
        },
        paint: {
            "line-color": "#d1d5db",
            "line-width": 3,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
        },
    });
    mappa.addLayer({
        id: "lines-operational",
        type: "line",
        source: "metro-lines",
        layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: initialVisibility,
        },
        paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-opacity": 0.8,
        },
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
        paint: {
            "circle-radius": 4,
            "circle-color": "#ffffff",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#334155",
        },
    });

    aggiornaFiltriCombinati();

    if (hasData) {
        boundsCittaCorrente = bounds;
        toggleMapInteractions(false);
        // Padding iniziale 50px
        mappa.fitBounds(bounds, { padding: 50 });

        mappa.once("moveend", () => {
            // Rivelazione Layer
            mappa.setLayoutProperty("lines-construction", "visibility", "visible");
            mappa.setLayoutProperty("lines-operational", "visibility", "visible");
            mappa.setLayoutProperty("lines-layer-hitbox", "visibility", "visible");
            mappa.setLayoutProperty("stations-layer", "visibility", "visible");

            // Applichiamo il blocco con il buffer in PIXEL (bilanciato)
            bloccaVistaConBuffer();

            toggleMapInteractions(true);

            if (appState.hasValidHistory) {
                appState.hasCompletedFirstCycle = false;
                togglePlayback(true);
            }
        });
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
    mappa.on("click", (e) => {
        let features = mappa.queryRenderedFeatures(e.point, {
            layers: ["stations-layer", "lines-layer-hitbox"],
        });
        if (!features.length) return;
        let topFeature = features[0];

        if (topFeature.layer.id === "stations-layer") {
            let coordinates = topFeature.geometry.coordinates.slice();
            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(
                    `<div class="font-bold text-sm">${topFeature.properties.name}</div>`
                )
                .addTo(mappa);
            return;
        }
        if (topFeature.layer.id === "lines-layer-hitbox") {
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    `<div class="font-bold text-sm text-indigo-600">${topFeature.properties.name}</div>`
                )
                .addTo(mappa);
        }
    });
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
        new mapboxgl.Popup({ closeButton: false })
            .setLngLat(coords)
            .setHTML(`<div class="font-bold text-sm p-1">${station.name}</div>`)
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