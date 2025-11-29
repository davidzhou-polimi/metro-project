// --- 1. PRELOAD ---
function preload() {
    rawData.cities = loadJSON("data/cities.json");
    rawData.systems = loadJSON("data/systems.json");
    rawData.lines = loadJSON("data/lines.json");
    rawData.stations = loadJSON("data/stations.json");
    rawData.station_lines = loadJSON("data/station_lines.json");
    rawData.sections = loadJSON("data/sections.json");
    rawData.section_lines = loadJSON("data/section_lines.json");
}

// --- 2. SETUP ---
function setup() {
    noCanvas();

    let unpackedData = {
        cities: unpackData(rawData.cities),
        systems: unpackData(rawData.systems),
        lines: unpackData(rawData.lines),
        stations: unpackData(rawData.stations),
        station_lines: unpackData(rawData.station_lines),
        sections: unpackData(rawData.sections),
        section_lines: unpackData(rawData.section_lines),
    };

    if (typeof filterData === "function") {
        db = filterData(unpackedData);
    } else {
        console.warn("Filtro non attivo. Uso dati grezzi.");
        db = unpackedData;
    }

    injectCustomCSS();

    let params = getURLParams();
    if (params.city_id) {
        let targetCity = db.cities.find((c) => c.id == params.city_id);
        if (targetCity) {
            inizializzaMappa(targetCity);
        } else {
            creaListaCitta();
        }
    } else {
        creaListaCitta();
    }
}