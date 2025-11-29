/*
 * Metro Systems Visualization
 * Visualizzazione integrata p5.js + Mapbox GL JS.
 * Gestisce la navigazione (Mondo -> Continente -> Paese) e visualizza i sistemi metropolitani.
 */

// --- Variabili globali ---
const MAPBOX_TOKEN = "pk.eyJ1IjoiZGF2aWR6aG91cG9saW1pIiwiYSI6ImNtaWRyOHlwaDAxZGYyanM1MXcyczdnOGQifQ.zowAVbBakEIILncSsxCqiA";

let canvas;
let mapboxMap;

// Dataset
let continents;
let countries;
let lines;
let systems;
let cities;
let metroCities = [];

// Stato dell'applicazione
let hoveredContinentId = null;
let hoveredCountryId = null;
let viewState = "world"; // Stati possibili: 'world', 'continent', 'country'
let selectedContinent = null;
let selectedCountry = null;

// --- Funzioni p5.js ---

function preload() {
    continents = loadJSON("data/continents.geojson");
    countries = loadJSON("data/countries.geojson");
    lines = loadJSON("data/lines.json");
    systems = loadJSON("data/systems.json");
    cities = loadJSON("data/cities.json");
}

function setup() {
    // Inizializzazione canvas p5.js
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("p5-container");

    // Collegamento interfaccia
    select("#resetButton").mousePressed(resetMap);

    // Inizializzazione Mapbox
    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapboxMap = new mapboxgl.Map({
        container: "map-container",
        style: "mapbox://styles/mapbox/light-v10",
        center: [0, 0],
        zoom: 1.5,
        pitch: 0,
    });

    // Elaborazione dati e avvio mappa
    processMetroData();
    mapboxMap.on("load", onMapReady);
}

/**
 * Configurazione iniziale della mappa e dei layer una volta caricata.
 */
function onMapReady() {
    console.log("Mappa caricata. Configurazione layer...");

    // Disabilitazione interazioni utente standard (zoom, pan, ecc.)
    // per controllare la navigazione via codice.
    mapboxMap.dragPan.disable();
    mapboxMap.scrollZoom.disable();
    mapboxMap.boxZoom.disable();
    mapboxMap.dragRotate.disable();
    mapboxMap.keyboard.disable();
    mapboxMap.doubleClickZoom.disable();
    mapboxMap.touchZoomRotate.disable();

    // --- Configurazione Layer Continenti ---
    mapboxMap.addSource("continents-source", {
        type: "geojson",
        data: continents,
        generateId: true,
    });

    mapboxMap.addLayer({
        id: "continents-layer",
        type: "fill",
        source: "continents-source",
        paint: {
            "fill-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#f08080", // Colore hover
                "#c0c0c0", // Colore default
            ],
            "fill-opacity": 0.7,
            "fill-outline-color": "#000000",
        },
    });

    // --- Interazioni Continenti ---
    
    // Click: Zoom sul continente e caricamento paesi
    mapboxMap.on("click", "continents-layer", (e) => {
        if (viewState !== "world") return;

        const feature = e.features[0];
        selectedContinent = feature.properties.CONTINENT;
        viewState = "continent";
        
        const bounds = getBounds(feature.geometry.coordinates);
        mapboxMap.fitBounds(bounds, { padding: 40 });

        mapboxMap.setLayoutProperty("continents-layer", "visibility", "none");
        showCountries(selectedContinent);
    });

    // Hover effect
    mapboxMap.on("mousemove", "continents-layer", (e) => {
        if (viewState !== "world") return;
        
        if (e.features.length > 0) {
            if (hoveredContinentId !== null) {
                mapboxMap.setFeatureState(
                    { source: "continents-source", id: hoveredContinentId },
                    { hover: false }
                );
            }
            hoveredContinentId = e.features[0].id;
            mapboxMap.setFeatureState(
                { source: "continents-source", id: hoveredContinentId },
                { hover: true }
            );
        }
    });

    mapboxMap.on("mouseleave", "continents-layer", () => {
        if (hoveredContinentId !== null) {
            mapboxMap.setFeatureState(
                { source: "continents-source", id: hoveredContinentId },
                { hover: false }
            );
        }
        hoveredContinentId = null;
    });

    // Sincronizzazione: ridisegna p5.js quando la mappa Mapbox si muove
    mapboxMap.on("move", () => {
        redraw();
    });
}

/**
 * Gestisce la visualizzazione dei paesi specifici per il continente selezionato.
 * Carica la sorgente dati se non presente e applica i filtri.
 */
function showCountries(continentName) {
    // Aggiunta sorgente dati paesi (solo se non esiste)
    if (!mapboxMap.getSource("countries-source")) {
        mapboxMap.addSource("countries-source", {
            type: "geojson",
            data: countries,
            generateId: true,
        });
    }

    // Configurazione layer paesi (solo se non esiste)
    if (!mapboxMap.getLayer("countries-layer")) {
        mapboxMap.addLayer({
            id: "countries-layer",
            type: "fill",
            source: "countries-source",
            paint: {
                "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false],
                    "#7CFC00", // Verde hover
                    "#90ee90", // Verde default
                ],
                "fill-opacity": 0.8,
                "fill-outline-color": "#000000",
            },
        });

        // --- Interazioni Paesi ---
        
        // Click: Zoom sul paese e attivazione marker città
        mapboxMap.on("click", "countries-layer", (e) => {
            if (viewState !== "continent") return;

            const feature = e.features[0];
            selectedCountry = feature.properties.name;
            viewState = "country";
            
            const bounds = getBounds(feature.geometry.coordinates);
            mapboxMap.fitBounds(bounds, { padding: 40 });

            // Nascondi i paesi per mostrare i dettagli (marker p5)
            mapboxMap.setLayoutProperty("countries-layer", "visibility", "none");

            // Forza aggiornamento canvas p5
            redraw();
        });

        // Hover effect paesi
        mapboxMap.on("mousemove", "countries-layer", (e) => {
            if (viewState !== "continent") return;
            if (e.features.length > 0) {
                if (hoveredCountryId !== null) {
                    mapboxMap.setFeatureState(
                        { source: "countries-source", id: hoveredCountryId },
                        { hover: false }
                    );
                }
                hoveredCountryId = e.features[0].id;
                mapboxMap.setFeatureState(
                    { source: "countries-source", id: hoveredCountryId },
                    { hover: true }
                );
            }
        });

        mapboxMap.on("mouseleave", "countries-layer", () => {
            if (hoveredCountryId !== null) {
                mapboxMap.setFeatureState(
                    { source: "countries-source", id: hoveredCountryId },
                    { hover: false }
                );
            }
            hoveredCountryId = null;
        });
    }

    // Applicazione filtro per mostrare solo i paesi del continente selezionato
    mapboxMap.setFilter("countries-layer", ["==", "continent", continentName]);
    mapboxMap.setLayoutProperty("countries-layer", "visibility", "visible");
}

/**
 * Loop di rendering di p5.js.
 * Disegna i marker delle città sopra la mappa Mapbox.
 */
function draw() {
    clear(); // Pulisce il canvas p5 per il nuovo frame

    // Disegna solo se siamo nella vista di dettaglio di un paese
    if (viewState === "country" && selectedCountry) {
        for (let city of metroCities) {
            // Verifica corrispondenza paese
            if (city.country === selectedCountry) {
                // Proiezione coordinate geografiche -> pixel schermo
                let pix = mapboxMap.project([city.lon, city.lat]);

                fill(255, 0, 0);
                noStroke();
                circle(pix.x, pix.y, 8);
            }
        }
    }
}

/**
 * Reimposta la visualizzazione allo stato iniziale (Mondo).
 */
function resetMap() {
    // Reset stato
    viewState = "world";
    selectedContinent = null;
    selectedCountry = null;

    // Animazione camera
    mapboxMap.flyTo({
        center: [0, 0],
        zoom: 1.5,
        pitch: 0,
    });

    // Gestione visibilità layer
    mapboxMap.setLayoutProperty("continents-layer", "visibility", "visible");

    if (mapboxMap.getLayer("countries-layer")) {
        mapboxMap.setLayoutProperty("countries-layer", "visibility", "none");
    }

    redraw(); // Pulisce i marker p5
}

/**
 * Calcola il Bounding Box (confini geografici) per Poligoni e MultiPoligoni.
 * Necessario per la funzione fitBounds di Mapbox.
 */
function getBounds(coords) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    function processCoords(poly) {
        for (const part of poly) {
            for (const p of part) {
                if (p[0] < minLng) minLng = p[0];
                if (p[0] > maxLng) maxLng = p[0];
                if (p[1] < minLat) minLat = p[1];
                if (p[1] > maxLat) maxLat = p[1];
            }
        }
    }

    if (coords[0][0][0] && typeof coords[0][0][0][0] !== "undefined") {
        // MultiPolygon
        for (const poly of coords) {
            processCoords(poly);
        }
    } else {
        // Polygon
        processCoords(coords);
    }

    return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * Filtra i dati grezzi per identificare le città dotate di metropolitana.
 * Catena logica: Lines (Mode 4/5) -> Systems -> Cities.
 */
function processMetroData() {
    console.log("Elaborazione dati metropolitane...");

    const metroSystemIds = new Set();
    // Filtro linee: mode 4 (Metro) o 5 (Light Rail/Metro)
    for (const line of lines.values) {
        const transportMode = line[6];
        if (transportMode === 4 || transportMode === 5) {
            const systemId = line[5];
            metroSystemIds.add(systemId);
        }
    }

    const metroCityIds = new Set();
    // Associazione Sistema -> Città
    for (const system of systems.values) {
        const systemId = system[0];
        if (metroSystemIds.has(systemId)) {
            const cityId = system[1];
            metroCityIds.add(cityId);
        }
    }

    // Creazione array finale città con coordinate
    for (const city of cities.values) {
        const cityId = city[0];
        if (metroCityIds.has(cityId)) {
            const pointString = city[2];
            // Parsing stringa WKT "POINT(lon lat)"
            const coords = pointString
                .substring(6, pointString.length - 1)
                .split(" ");
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);

            metroCities.push({
                id: cityId,
                name: city[1],
                country: city[5],
                lat: lat,
                lon: lon,
            });
        }
    }
    console.log(`Città filtrate con metro: ${metroCities.length}`);
}