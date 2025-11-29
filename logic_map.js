function disegnaElementiMappa(cityId, cityName) {
    let featuresLinee = [];
    let featuresStazioni = [];
    let bounds = new mapboxgl.LngLatBounds();
    let hasData = false;

    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let lineCoordinatesMap = new Map();
    let totalSectionsFound = 0;

    for (let line of cityLines) {
        let rels = db.section_lines.filter((sl) => sl.line_id === line.id);
        for (let rel of rels) {
            let section = db.sections.find((s) => s.id === rel.section_id);
            if (section && section.geometry) {
                totalSectionsFound++;
                let coords = parseGeometry(section.geometry);
                let buildstart = parseYear(section.buildstart);
                let opening = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;
                if (!opening) opening = 9999;
                if (!buildstart) {
                    if (opening === 9999) buildstart = appState.minYear;
                    else buildstart = opening;
                }
                if (coords) {
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
                    if (!lineCoordinatesMap.has(line.id)) lineCoordinatesMap.set(line.id, []);
                    let currentPoints = lineCoordinatesMap.get(line.id);
                    for (let pt of coords) currentPoints.push(pt);
                }
            }
        }
    }

    let cityStations = db.stations.filter((s) => s.city_id === cityId);
    let disableProximityCheck = totalSectionsFound === 0;
    const MAX_DISTANCE_THRESHOLD = 0.005;

    for (let station of cityStations) {
        let coords = parseGeometry(station.geometry);
        if (!coords) continue;
        let shouldShow = false;
        if (disableProximityCheck) {
            shouldShow = true;
        } else {
            let stationLines = db.station_lines.filter((sl) => sl.station_id === station.id);
            shouldShow = stationLines.some((sl) => {
                let linePoints = lineCoordinatesMap.get(sl.line_id);
                if (!linePoints) return false;
                return getDistanceFromLine(coords, linePoints) < MAX_DISTANCE_THRESHOLD;
            });
        }

        let buildstart = parseYear(station.buildstart);
        let opening = parseYear(station.opening);
        let closure = parseYear(station.closure) || 9999;
        if (!opening) opening = 9999;
        if (!buildstart) {
            if (opening === 9999) buildstart = appState.minYear;
            else buildstart = opening;
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

    mappa.addSource("metro-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: featuresLinee },
    });
    mappa.addSource("metro-stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: featuresStazioni },
    });

    mappa.addLayer({
        id: "lines-construction",
        type: "line",
        source: "metro-lines",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#d1d5db", "line-width": 3, "line-dasharray": [2, 2], "line-opacity": 0.8 },
    });

    mappa.addLayer({
        id: "lines-operational",
        type: "line",
        source: "metro-lines",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.8 },
    });

    mappa.addLayer({
        id: "lines-layer-hitbox",
        type: "line",
        source: "metro-lines",
        layout: {},
        paint: { "line-width": 15, "line-opacity": 0 },
    });

    mappa.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "metro-stations",
        paint: { "circle-radius": 4, "circle-color": "#ffffff", "circle-stroke-width": 1.5, "circle-stroke-color": "#334155" },
    });

    aggiornaFiltriCombinati();

    if (hasData) {
        boundsCittaCorrente = bounds;
        toggleMapInteractions(false);
        mappa.fitBounds(bounds, { padding: 50 });
        mappa.once("moveend", () => {
            let currentView = mappa.getBounds();
            let currentZoom = mappa.getZoom();
            mappa.setMinZoom(currentZoom);
            let buffer = 0.15;
            let maxBounds = new mapboxgl.LngLatBounds(
                [currentView.getWest() - buffer, currentView.getSouth() - buffer],
                [currentView.getEast() + buffer, currentView.getNorth() + buffer]
            );
            mappa.setMaxBounds(maxBounds);
            toggleMapInteractions(true);
            togglePlayback(true);
        });
    }
}

function aggiornaFiltriCombinati() {
    if (!mappa) return;
    let year = appState.currentYear;
    let isoId = appState.isolatedLineId;

    const condIsOpened = ["<=", ["get", "opening"], year];
    const condNotClosed = ["any", ["==", ["get", "closure"], 9999], [">", ["get", "closure"], year]];
    const condBuildStarted = ["<=", ["get", "buildstart"], year];
    const condNotYetOpen = [">", ["get", "opening"], year];
    const condLineIso = isoId ? ["==", "lineId", isoId] : ["has", "lineId"];

    const filterOp = ["all", condIsOpened, condNotClosed, condLineIso];
    const filterCons = ["all", condBuildStarted, condNotYetOpen, condLineIso];
    const filterHit = ["any", filterOp, filterCons];

    try {
        mappa.setFilter("lines-operational", filterOp);
        mappa.setFilter("lines-construction", filterCons);
        mappa.setFilter("lines-layer-hitbox", filterHit);
    } catch (e) { console.error(e); }

    let filterSt = ["all", condBuildStarted];
    if (isoId) {
        let relazioni = db.station_lines.filter((sl) => sl.line_id === isoId);
        let validStationIds = relazioni.map((r) => r.station_id);
        if (validStationIds.length > 0) {
            filterSt.push(["in", ["get", "id"], ["literal", validStationIds]]);
        } else {
            filterSt = ["==", "id", -1];
        }
    }
    try { mappa.setFilter("stations-layer", filterSt); } catch (e) {}

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
        mappa.fitBounds(boundsCittaCorrente, { padding: 50 });
        mappa.once("moveend", () => toggleMapInteractions(true));
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
        let features = mappa.queryRenderedFeatures(e.point, { layers: ["stations-layer", "lines-layer-hitbox"] });
        if (!features.length) return;
        let topFeature = features[0];

        if (topFeature.layer.id === "stations-layer") {
            let coordinates = topFeature.geometry.coordinates.slice();
            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(`<div class="font-bold text-sm">${topFeature.properties.name}</div>`)
                .addTo(mappa);
            return;
        }
        if (topFeature.layer.id === "lines-layer-hitbox") {
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`<div class="font-bold text-sm text-indigo-600">${topFeature.properties.name}</div>`)
                .addTo(mappa);
        }
    });
    mappa.on("mousemove", (e) => {
        let features = mappa.queryRenderedFeatures(e.point, { layers: ["stations-layer", "lines-layer-hitbox"] });
        mappa.getCanvas().style.cursor = features.length ? "pointer" : "";
    });
}

function zoomSuStazione(station) {
    if (!mappa) return;
    let coords = parseGeometry(station.geometry);
    if (!coords) return;
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

    // 1. Cerca coordinate nelle Linee
    let cityLines = db.lines.filter((l) => l.city_id === cityId);
    let lineIds = new Set(cityLines.map(l => l.id));
    
    // Ottimizzazione: Filtriamo solo le sezioni di questa città
    let rels = db.section_lines.filter(sl => sl.city_id === cityId && lineIds.has(sl.line_id));
    
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

    // 2. Cerca coordinate nelle Stazioni (se non ci sono linee, o per completezza)
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