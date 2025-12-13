// core/utils.js

function unpackData(dataObj) {
    if (!dataObj || !dataObj.values) return [];
    let unpacked = [];
    let fields = dataObj.fields;
    let values = dataObj.values;
    for (let i = 0; i < values.length; i++) {
        let row = values[i];
        let obj = {};
        for (let j = 0; j < fields.length; j++) {
            obj[fields[j]] = row[j];
        }
        unpacked.push(obj);
    }
    return unpacked;
}

// Funzione di utilità per processare i dati (Unpack)
// La chiamiamo solo quando serve per evitare di bloccare il browser all'avvio se non serve
function processaDati() {
    console.log("Elaborazione dati in corso...");
    // unpackData deve essere disponibile globalmente (es. in helpers.js o utils.js)
    if(typeof unpackData === 'undefined') {
        console.error("ERRORE: unpackData non trovato! Controlla helpers.js");
        return;
    }

    db = {
        cities: unpackData(rawData.cities),
        systems: unpackData(rawData.systems),
        lines: unpackData(rawData.lines),
        stations: unpackData(rawData.stations),
        station_lines: unpackData(rawData.station_lines),
        sections: unpackData(rawData.sections),
        section_lines: unpackData(rawData.section_lines),
    };
    
    // Se hai un filtro dati
    if (typeof filterData === "function") {
        db = filterData(db);
    }
    console.log("Dati elaborati e pronti in 'db'");
}

function parseGeometry(wktString) {
    if (!wktString) return null;
    if (wktString.startsWith("POINT")) {
        let clean = wktString.replace("POINT(", "").replace(")", "");
        let parts = clean.split(" ");
        return [parseFloat(parts[0]), parseFloat(parts[1])];
    }
    if (wktString.startsWith("LINESTRING")) {
        let clean = wktString.replace("LINESTRING(", "").replace(")", "");
        let pairs = clean.split(",");
        return pairs.map((pair) => {
            let coords = pair.trim().split(" ");
            return [parseFloat(coords[0]), parseFloat(coords[1])];
        });
    }
    return null;
}

function fixColor(hexCode) {
    if (!hexCode) return "#94a3b8";
    if (hexCode.startsWith("#")) return hexCode;
    return "#" + hexCode;
}

function parseYear(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        let y = parseInt(val.substring(0, 4));
        if (!isNaN(y)) return y;
    }
    return null;
}

function getDatiCitta(cityId) {
    let citySystems = db.systems.filter((s) => s.city_id === cityId);
    let cityLines = db.lines.filter((l) => l.city_id === cityId);

    let gerarchia = citySystems.map((system) => {
        let linesInSystem = cityLines.filter((l) => l.system_id === system.id);
        linesInSystem = linesInSystem.map((line) => {
            let rels = db.station_lines.filter((sl) => sl.line_id === line.id);
            let stations = rels
                .map((r) => db.stations.find((s) => s.id === r.station_id))
                .filter((s) => s);
            return { ...line, stations: stations };
        });
        return { ...system, lines: linesInSystem };
    });
    return gerarchia;
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