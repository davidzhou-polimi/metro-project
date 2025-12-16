// modules/home/logic_home.js

// --- CONFIGURAZIONE ---
const CONTINENT_COLORS_MAP = {
    'Europe': '#2563EB',        // Blue
    'North America': '#B91C1C', // Red
    'South America': '#F97316', // Orange
    'Asia': '#EAB308',          // Yellow
    'Oceania': '#16A34A',       // Green
    'Africa': '#9333EA',        // Purple
    'default': '#9CA3AF'        // Grey
};

/**
 * Elabora i dati grezzi dal DB globale per preparare gli oggetti visualizzabili.
 * Calcola lunghezza totale e assegna il continente.
 */
function processHomeData(database) {
    if (!database.cities || !database.lines) return [];

    let cityMap = new Map();

    // 1. Mappa linee -> città
    let lineToCity = {};
    database.lines.forEach(l => lineToCity[l.id] = l.city_id);

    // 2. Calcolo lunghezze e anni per ogni città
    database.sections.forEach(sec => {
        let rel = database.section_lines.find(sl => sl.section_id === sec.id);
        if (!rel) return;

        let cityId = lineToCity[rel.line_id];
        if (!cityId) return;

        if (!cityMap.has(cityId)) {
            cityMap.set(cityId, { 
                length: 0, 
                start_year: 9999, 
                raw_city: database.cities.find(c => c.id === cityId) 
            });
        }

        let cityData = cityMap.get(cityId);
        cityData.length += (parseFloat(sec.length) || 0);

        let b = parseYear(sec.buildstart);
        let o = parseYear(sec.opening);
        let y = 9999;
        if (o && o > 1800) y = o;
        else if (b && b > 1800) y = b;

        if (y < cityData.start_year) cityData.start_year = y;
    });

    // 3. Costruzione array finale
    let processed = [];
    cityMap.forEach((data, id) => {
        if (!data.raw_city) return;
        if (data.length <= 0) return;

        let countryName = data.raw_city.country.trim();
        
        // Robust search
        let continentObj = database.countries.find(c => {
            let cName = c.country || c.Country || c.name || c.Name;
            return cName && cName.trim().toLowerCase() === countryName.toLowerCase();
        });

        let continent = continentObj ? continentObj.continent : 'default';
        if (countryName === 'Russia') continent = 'Europe';

        processed.push({
            id: parseInt(id),
            name: data.raw_city.name,
            country: countryName,
            continent: continent,
            length: data.length / 1000, 
            start_year: data.start_year === 9999 ? 2025 : data.start_year,
            color: CONTINENT_COLORS_MAP[continent] || CONTINENT_COLORS_MAP['default'],
            size: 0
        });
    });

    return processed;
}

/**
 * Filtra i dati processati in base a Anno e Continente.
 * NOTA: La ricerca (search) NON filtra più i dati, ma viene usata solo per l'evidenziazione visuale.
 */
function filterHomeData(data, filters) {
    let { year, continent } = filters; // Rimosso 'search' dal destructuring qui

    let filtered = data.filter(city => {
        // 1. Filtro Anno
        if (city.start_year > year) return false;

        // 2. Filtro Continente
        if (continent && city.continent !== continent) return false;

        // 3. Filtro Ricerca -> RIMOSSO
        // Vogliamo vedere tutte le città anche mentre cerchiamo, per evidenziarle.
        
        return true;
    });

    // Imposta la dimensione per la TreeMap
    filtered.forEach(item => {
        item.size = Math.max(item.length, 2); 
    });

    // Ordina per dimensione (necessario per Squarify)
    filtered.sort((a, b) => b.size - a.size);

    return filtered;
}

/**
 * Calcola il layout TreeMap (Coordinate x, y, w, h)
 */
function calculateTreemapLayout(data, containerW, containerH) {
    if (!data || data.length === 0) return [];
    
    let nodes = JSON.parse(JSON.stringify(data)); 
    let resultNodes = [];
    squarify(nodes, { x: 0, y: 0, w: containerW, h: containerH }, resultNodes);
    
    return resultNodes;
}

// --- ALGORITMO SQUARIFY ---

function squarify(children, area, resultList) {
    const areaSum = children.reduce((sum, item) => sum + item.size, 0);
    if (areaSum <= 0) return;
    
    const ratio = (area.w * area.h) / areaSum;
    children.forEach(c => c.area = c.size * ratio);

    computeSquarifyRecursion(children, [], area, resultList);
}

function computeSquarifyRecursion(children, row, area, resultList) {
    if (children.length === 0) {
        calculateRowCoordinates(row, area, resultList);
        return;
    }

    const next = children[0];
    const nextRow = [...row, next];
    const length = Math.min(area.w, area.h);

    if (row.length === 0) {
        computeSquarifyRecursion(children.slice(1), nextRow, area, resultList);
    } else {
        if (worst(row, length) >= worst(nextRow, length)) {
            computeSquarifyRecursion(children.slice(1), nextRow, area, resultList);
        } else {
            const used = calculateRowCoordinates(row, area, resultList);
            const remaining = {
                x: area.x + (area.w >= area.h ? used : 0),
                y: area.y + (area.w < area.h ? used : 0),
                w: area.w - (area.w >= area.h ? used : 0),
                h: area.h - (area.w < area.h ? used : 0)
            };
            if(remaining.w < 0.1) remaining.w = 0;
            if(remaining.h < 0.1) remaining.h = 0;

            computeSquarifyRecursion(children, [], remaining, resultList);
        }
    }
}

function calculateRowCoordinates(row, area, resultList) {
    const s = row.reduce((sum, i) => sum + i.area, 0);
    const length = Math.min(area.w, area.h);
    const width = s / length;
    
    let cx = area.x;
    let cy = area.y;
    
    row.forEach(item => {
        if (area.w >= area.h) {
            item.x = cx; item.y = cy; item.w = width; item.h = item.area / width;
            cy += item.h;
        } else {
            item.x = cx; item.y = cy; item.w = item.area / width; item.h = width;
            cx += item.w;
        }
        resultList.push(item);
    });
    return width;
}

function worst(row, length) {
    if (row.length === 0) return Infinity;
    const s = row.reduce((sum, i) => sum + i.area, 0);
    const maxA = Math.max(...row.map(i => i.area));
    const minA = Math.min(...row.map(i => i.area));
    return Math.max((length * length * maxA) / (s * s), (s * s) / (length * length * minA));
}