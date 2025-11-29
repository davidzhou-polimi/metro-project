/*
 * Drill-down Map Visualization
 * Gestione della mappa interattiva: Mondo -> Continente -> Paese -> Dettagli (Città/Sezioni).
 */

let cities;
let lines;
let sections;
let transportModes;
let countriesData; 
let continents;

// Variabili globali per la mappa e lo stato
let volcanoMap;
let globalWorldBounds;
let toggleCheckbox;
const mapboxAccessToken = "pk.eyJ1IjoiZGF2aWR6aG91cG9saW1pIiwiYSI6ImNtaWRyOHlwaDAxZGYyanM1MXcyczdnOGQifQ.zowAVbBakEIILncSsxCqiA";

let citiesGeoJSON;
let sectionsGeoJSON;

// Stato della visualizzazione corrente
let currentView = 'world'; // 'world', 'continent', o 'country'
let currentContinent = null;
let currentCountry = null;

const continentColors = {
    "Africa": "#FF6347",
    "Asia": "#4682B4",
    "Europe": "#32CD32",
    "North America": "#FFD700",
    "South America": "#BA55D3",
    "Oceania": "#FFA07A",
    "Australia": "#FFA07A",
    "Seven seas (open ocean)": "#FFFFFF",
    "default": "#808080"
};

function preload() {
    // Caricamento dei dataset JSON e GeoJSON
    cities = loadJSON("data/cities.json");
    lines = loadJSON("data/lines.json");
    sections = loadJSON("data/sections.json");
    transportModes = loadJSON("data/transport_modes.json");
    continents = loadJSON("data/continents.geojson");
    countriesData = loadJSON("data/countries.geojson");
}

/**
 * Converte i dati delle "sections" (formato WKT) in un oggetto GeoJSON valido.
 * Include la gestione delle proprietà per i popup.
 */
function processSections() {
    let features = [];
    let geometryIndex = sections.fields.indexOf('geometry');
    let idIndex = sections.fields.indexOf('id');

    if (geometryIndex === -1) {
        console.error("Colonna 'geometry' non trovata nei dati delle sezioni.");
        return;
    }

    for (let riga of sections.values) {
        let geometryString = riga[geometryIndex];
        let id = (idIndex !== -1) ? riga[idIndex] : 'N/A';

        if (geometryString) {
            try {
                // Parsing della stringa WKT in geometria GeoJSON
                let geojsonGeometry = wellknown.parse(geometryString);
                
                let feature = {
                    type: 'Feature',
                    geometry: geojsonGeometry,
                    properties: {
                        id: id,
                        dataType: 'Section'
                    }
                };
                features.push(feature);

            } catch (e) {
                console.error("Errore nel parsing WKT (Sezioni): ", geometryString, e);
            }
        }
    }

    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Converte i dati delle "cities" (formato WKT) in un oggetto GeoJSON valido.
 */
function processCities() {
    let features = [];
    let geometryIndex = cities.fields.indexOf('coords'); 
    let idIndex = cities.fields.indexOf('id');

    if (geometryIndex === -1) {
        console.error("Colonna 'coords' non trovata nei dati delle città.");
        return;
    }

    for (let riga of cities.values) {
        let geometryString = riga[geometryIndex];
        let id = (idIndex !== -1) ? riga[idIndex] : 'N/A';

        if (geometryString) {
            try {
                let geojsonGeometry = wellknown.parse(geometryString);
                
                let feature = {
                    type: 'Feature',
                    geometry: geojsonGeometry,
                    properties: {
                        id: id,
                        dataType: 'City'
                    }
                };
                // Aggiunta della feature alla collezione
                features.push(feature);

            } catch (e) {
                console.error("Errore nel parsing WKT (Città): ", geometryString, e);
            }
        }
    }
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Gestisce la visibilità dei layer (Città vs Sezioni)
 * in base allo stato della checkbox, attivo solo nella vista 'country'.
 */
function updateMap() {
    if (currentView !== 'country') return;

    if (toggleCheckbox.checked()) {
        volcanoMap.setLayoutProperty('cities-layer', 'visibility', 'none');
        volcanoMap.setLayoutProperty('sections-layer', 'visibility', 'visible');
    } else {
        volcanoMap.setLayoutProperty('cities-layer', 'visibility', 'visible');
        volcanoMap.setLayoutProperty('sections-layer', 'visibility', 'none');
    }
}

/**
 * Configura le interazioni del mouse (cursore e popup) per un layer specifico.
 */
function setupPopups(layerId, idPrefix) {
    volcanoMap.on('mouseenter', layerId, () => {
        volcanoMap.getCanvas().style.cursor = 'pointer';
    });
    
    volcanoMap.on('mouseleave', layerId, () => {
        volcanoMap.getCanvas().style.cursor = '';
    });

    volcanoMap.on('click', layerId, (e) => {
        if (e.features.length > 0) {
            let feature = e.features[0];
            let id = feature.properties.id;
            
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`${idPrefix} ID: ${id}`)
                .addTo(volcanoMap);
        }
    });
}

/**
 * Calcola i confini geografici (Bounding Box) di un continente.
 * Gestisce sia Polygon che MultiPolygon iterando su tutte le coordinate.
 */
function getContinentBounds(geometry) {
    const bounds = new mapboxgl.LngLatBounds();

    function extendBounds(coordinates) {
        coordinates.forEach(point => bounds.extend(point));
    }

    if (geometry.type === 'Polygon') {
        extendBounds(geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
            extendBounds(polygon[0]);
        });
    }
    return bounds;
}

/**
 * Calcola i confini geografici di un paese.
 * Nota: Per i MultiPolygon, considera solo il poligono con il maggior numero di punti
 * per evitare di includere territori remoti o isole distanti nel calcolo dello zoom.
 */
function getCountryBounds(geometry) {
    const bounds = new mapboxgl.LngLatBounds();

    if (geometry.type === 'Polygon') {
        geometry.coordinates[0].forEach(point => {
            bounds.extend(point);
        });
    } else if (geometry.type === 'MultiPolygon') {
        let largestPolygon = null;
        let maxPoints = 0;

        geometry.coordinates.forEach(polygon => {
            const pointCount = polygon[0].length;
            if (pointCount > maxPoints) {
                maxPoints = pointCount;
                largestPolygon = polygon;
            }
        });

        if (largestPolygon) {
            largestPolygon[0].forEach(point => {
                bounds.extend(point);
            });
        }
    }
    return bounds;
}

function setup() {
    noCanvas();
    
    // Inizializzazione mappa Mapbox
    mapboxgl.accessToken = mapboxAccessToken;
    globalWorldBounds = [[-170, -63], [170, 85]];

    volcanoMap = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        projection: "mercator", // Mercator ottimizza il comportamento di fitBounds
        customAttribution: 'Progetto di Mappatura Drill-Down',
        renderWorldCopies: false,
        center: [0, 30.5],
        zoom: 1.15,
        // Disabilitazione interazioni utente per controllo programmatico
        dragPan: false, dragRotate: false, scrollZoom: false,
        boxZoom: false, doubleClickZoom: false,
        touchZoomRotate: false, keyboard: false
    });

    volcanoMap.on('load', () => {

        // Impostazione vista iniziale
        volcanoMap.fitBounds(globalWorldBounds, {
            padding: 20,
            duration: 0
        });

        // Elaborazione dati GeoJSON
        citiesGeoJSON = processCities();
        sectionsGeoJSON = processSections();

        // --- Aggiunta Sorgenti Dati ---
        
        volcanoMap.addSource('continents-source', {
            type: 'geojson',
            data: continents
        });

        volcanoMap.addSource('countries-source', {
            type: 'geojson',
            data: countriesData
        });
        
        volcanoMap.addSource('cities-source', {
            type: 'geojson',
            data: citiesGeoJSON
        });

        volcanoMap.addSource('sections-source', {
            type: 'geojson',
            data: sectionsGeoJSON
        });

        // --- Configurazione Layer ---
        
        // 1. Layer Continenti (Vista Mondo - Inizialmente visibile)
        volcanoMap.addLayer({
            id: 'continents-layer',
            type: 'fill',
            source: 'continents-source',
            paint: {
                'fill-color': [
                    'match',
                    ['get', 'CONTINENT'],
                    'Africa', continentColors.Africa,
                    'Asia', continentColors.Asia,
                    'Europe', continentColors.Europe,
                    'North America', continentColors["North America"],
                    'South America', continentColors["South America"],
                    'Oceania', continentColors.Oceania,
                    "Australia", continentColors.Australia,
                    continentColors.default
                ],
                'fill-opacity': 0.7,
                'fill-outline-color': '#FFFFFF'
            },
            layout: { 'visibility': 'visible' }
        });

        // 2. Layer Paesi (Vista Continente - Inizialmente nascosti)
        volcanoMap.addLayer({
            id: 'countries-fill-layer',
            type: 'fill',
            source: 'countries-source',
            paint: { 'fill-color': '#E0E0E0', 'fill-opacity': 0.8 },
            layout: { 'visibility': 'none' },
            filter: null
        });
        
        volcanoMap.addLayer({
            id: 'countries-outline-layer',
            type: 'line',
            source: 'countries-source',
            paint: { 'line-color': '#000000', 'line-width': 1 },
            layout: { 'visibility': 'none' },
            filter: null
        });

        // 3. Layer Dettagli (Vista Paese - Inizialmente nascosti)
        volcanoMap.addLayer({
            id: 'cities-layer',
            type: 'circle',
            source: 'cities-source',
            paint: { 'circle-radius': 5, 'circle-color': '#007cbf' },
            layout: { 'visibility': 'none' }
        });
        
        volcanoMap.addLayer({
            id: 'sections-layer',
            type: 'line',
            source: 'sections-source',
            paint: { 'line-color': '#ff0000', 'line-width': 3 },
            layout: { 'visibility': 'none' }
        });

        // --- Gestione Eventi e Interazioni ---

        // Transizione: Mondo -> Continente
        volcanoMap.on('click', 'continents-layer', (e) => {
            if (currentView !== 'world' || !e.features.length) return;

            const feature = e.features[0];
            const continentName = feature.properties.CONTINENT; 
            if (!continentName) return;

            currentView = 'continent';
            currentContinent = continentName;

            const bounds = getContinentBounds(feature.geometry);
            
            // Scambio visibilità layer e applicazione filtri prima dell'animazione
            volcanoMap.setLayoutProperty('continents-layer', 'visibility', 'none');
            
            const filter = ['==', 'continent', continentName]; 
            volcanoMap.setFilter('countries-fill-layer', filter);
            volcanoMap.setFilter('countries-outline-layer', filter);
            
            volcanoMap.setLayoutProperty('countries-fill-layer', 'visibility', 'visible');
            volcanoMap.setLayoutProperty('countries-outline-layer', 'visibility', 'visible');

            volcanoMap.fitBounds(bounds, { padding: 20, duration: 0 });
        });

        // Transizione: Continente -> Paese
        volcanoMap.on('click', 'countries-fill-layer', (e) => {
            if (currentView !== 'continent' || !e.features.length) return;

            const feature = e.features[0];
            const countryName = feature.properties.name; 

            currentView = 'country';
            currentCountry = countryName;

            const bounds = getCountryBounds(feature.geometry);
            
            // Attivazione layer di dettaglio
            updateMap(); 

            volcanoMap.fitBounds(bounds, { padding: 40, duration: 0 });
        });

        // Gestione cursore mouse
        const setCursor = (layer, view) => {
            volcanoMap.on('mouseenter', layer, () => {
                if (currentView === view) volcanoMap.getCanvas().style.cursor = 'pointer';
            });
            volcanoMap.on('mouseleave', layer, () => {
                volcanoMap.getCanvas().style.cursor = '';
            });
        };

        setCursor('continents-layer', 'world');
        setCursor('countries-fill-layer', 'continent');
        
        // --- Controlli UI ---

        toggleCheckbox = select('#view-toggle');
        toggleCheckbox.changed(updateMap);

        const resetButton = select('#reset-zoom-btn');
        resetButton.mousePressed(() => {
            if (currentView === 'world') return;

            // Reset dello stato
            currentView = 'world';
            currentContinent = null;
            currentCountry = null;
            
            // Ripristino visibilità layer iniziali
            volcanoMap.setLayoutProperty('continents-layer', 'visibility', 'visible');
            volcanoMap.setLayoutProperty('countries-fill-layer', 'visibility', 'none');
            volcanoMap.setLayoutProperty('countries-outline-layer', 'visibility', 'none');
            volcanoMap.setLayoutProperty('cities-layer', 'visibility', 'none');
            volcanoMap.setLayoutProperty('sections-layer', 'visibility', 'none');
            
            // Rimozione filtri
            volcanoMap.setFilter('countries-fill-layer', null);
            volcanoMap.setFilter('countries-outline-layer', null);

            volcanoMap.fitBounds(globalWorldBounds, {
                padding: 20, 
                duration: 0 
            });
        });

        select('#map').removeClass('invisible');
    });
}