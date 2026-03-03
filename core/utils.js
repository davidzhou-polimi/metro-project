// core/utils.js

function unpackData(dataObj) {
    // 1. Sicurezza base
    if (!dataObj) return [];

    // 2. CASO PERFETTO: È già un array
    if (Array.isArray(dataObj)) {
        return dataObj;
    }

    // 3. CASO CITIES/LINES (Formato compresso fields/values)
    if (dataObj.fields && dataObj.values) {
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

    // 4. CASO COUNTRIES "STRANO" (Oggetto con chiavi numeriche {0:.., 1:..})
    // Se non è un array, ma ha la chiave '0', è un "finto array".
    if (dataObj[0] !== undefined) {
        //console.log("--- Converto Oggetto {0:..} in Array [...] ---");
        return Object.values(dataObj);
    }

    // 5. Fallback
    return [];
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
        countries: unpackData(rawData.countries)
    };
    
    // Se hai un filtro dati
    if (typeof filterData === "function") {
        db = filterData(db);
    }
    console.log("Dati elaborati e pronti in 'db'");
    buildDbIndexes();
}

/**
 * Costruisce indici (Map) sulle tabelle del DB per lookup O(1).
 * Va chiamata una sola volta dopo processaDati().
 */
function buildDbIndexes() {
    db._idx = {
        sectionsById:        new Map(db.sections.map(s => [String(s.id), s])),
        stationsById:        new Map(db.stations.map(s => [String(s.id), s])),
        linesByCity:         new Map(),
        sectionLinesBySec:   new Map(),
        sectionLinesByLine:  new Map(),
        stationLinesBySt:    new Map(),
        stationLinesByLine:  new Map(),
    };
    db.lines.forEach(l => {
        let key = String(l.city_id);
        let arr = db._idx.linesByCity.get(key);
        if (!arr) { arr = []; db._idx.linesByCity.set(key, arr); }
        arr.push(l);
    });
    db.section_lines.forEach(sl => {
        let keySec = String(sl.section_id);
        let bySec = db._idx.sectionLinesBySec.get(keySec);
        if (!bySec) { bySec = []; db._idx.sectionLinesBySec.set(keySec, bySec); }
        bySec.push(sl);

        let keyLine = String(sl.line_id);
        let byLine = db._idx.sectionLinesByLine.get(keyLine);
        if (!byLine) { byLine = []; db._idx.sectionLinesByLine.set(keyLine, byLine); }
        byLine.push(sl);
    });
    // Indici per station_lines (usati dalla mappa e dalla sidebar)
    db.station_lines.forEach(sl => {
        let keySt = String(sl.station_id);
        let bySt = db._idx.stationLinesBySt.get(keySt);
        if (!bySt) { bySt = []; db._idx.stationLinesBySt.set(keySt, bySt); }
        bySt.push(sl);

        let keyLine = String(sl.line_id);
        let byLine = db._idx.stationLinesByLine.get(keyLine);
        if (!byLine) { byLine = []; db._idx.stationLinesByLine.set(keyLine, byLine); }
        byLine.push(sl);
    });
    console.log("DB indexes built.");
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
    // Opt-E: usa linesByCity index invece di .filter() su tutto db.lines
    const idx = db._idx;
    let citySystems = db.systems.filter((s) => s.city_id === cityId);
    let cityLines = idx
        ? (idx.linesByCity.get(String(cityId)) || [])
        : db.lines.filter((l) => l.city_id === cityId);

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

function isColorLight(hex) {
    hex = hex.replace("#", "");

    // converte da hex a valori RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // luminanza percepita
    let brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 180;  // >160 = colore chiaro
}

let _inheritedLineOpenings = null;
function getInheritedLineOpening(lineId) {
    if (!_inheritedLineOpenings) {
        _inheritedLineOpenings = new Map();
        let stationLineCount = new Map();
        for (let rel of db.station_lines) {
            let count = stationLineCount.get(rel.station_id) || 0;
            stationLineCount.set(rel.station_id, count + 1);
        }
        for (let line of db.lines) {
            let stRelsForLine = db.station_lines.filter(sl => sl.line_id === line.id);
            let validStationOpenings = [];
            for (let rel of stRelsForLine) {
                if (stationLineCount.get(rel.station_id) === 1) {
                    let st = db.stations.find(s => s.id === rel.station_id);
                    if (st) {
                        let stOp = parseYear(st.opening);
                        // Se la linea inizia a servire questa stazione da un anno specifico (fromyear),
                        // usiamo il massimo tra station.opening e fromyear per non retrodatare
                        // erroneamente la linea a un'apertura storica (es. tram) precedente.
                        let relFromYear = parseYear(rel.fromyear);
                        if (relFromYear && (!stOp || stOp < relFromYear)) stOp = relFromYear;
                        if (stOp && stOp >= 1860) validStationOpenings.push(stOp);
                    }
                }
            }
            if (validStationOpenings.length > 0) {
                _inheritedLineOpenings.set(line.id, Math.min(...validStationOpenings));
            }
        }
    }
    return _inheritedLineOpenings.get(lineId) || null;
}

/**
 * Calcola la lunghezza della rete per una città o un set di linee, opzionalmente ad un anno specifico.
 * @param {number} cityId ID della città
 * @param {object} options { lineIds, year, formatted }
 */
function calculateNetworkLength(cityId, options = {}) {
    let { lineIds = null, year = null, formatted = false } = options;

    // Usa gli indici se disponibili (molto più veloce di .filter()/.find())
    const idx = db._idx;
    let targetSectionIds = new Set();
    let relevantRels = [];
    let endOfTime = CURRENT_YEAR;

    if (lineIds) {
        let activeLineIds = lineIds;
        if (typeof appState !== 'undefined' && appState.hiddenLineIds && appState.hiddenLineIds.length > 0) {
            activeLineIds = lineIds.filter(id => !appState.hiddenLineIds.includes(id));
        }
        if (idx) {
            for (let lid of activeLineIds) {
                let rels = idx.sectionLinesByLine.get(String(lid));
                if (rels) for (let r of rels) { relevantRels.push(r); targetSectionIds.add(r.section_id); }
            }
        } else {
            relevantRels = db.section_lines.filter((sl) => activeLineIds.includes(sl.line_id));
            relevantRels.forEach((r) => targetSectionIds.add(r.section_id));
        }
    } else {
        // Usa String() per garantire coerenza con le chiavi della Map (indifferente al tipo Number/String)
        let cityLines = idx ? (idx.linesByCity.get(String(cityId)) || []) : db.lines.filter((l) => l.city_id === cityId);
        let ids = cityLines.map((l) => l.id);
        if (typeof appState !== 'undefined' && appState.hiddenLineIds && appState.hiddenLineIds.length > 0) {
            ids = ids.filter(id => !appState.hiddenLineIds.includes(id));
        }
        if (idx) {
            for (let lid of ids) {
                let rels = idx.sectionLinesByLine.get(String(lid));
                if (rels) for (let r of rels) { relevantRels.push(r); targetSectionIds.add(r.section_id); }
            }
        } else {
            relevantRels = db.section_lines.filter((sl) => ids.includes(sl.line_id));
            relevantRels.forEach((r) => targetSectionIds.add(r.section_id));
        }
    }

    // Mappa sezione->rel per lookup O(1) all'interno del loop (evita .filter() ripetuto)
    let relsBySection = null;
    if (year !== null) {
        relsBySection = new Map();
        for (let r of relevantRels) {
            let arr = relsBySection.get(r.section_id);
            if (!arr) { arr = []; relsBySection.set(r.section_id, arr); }
            arr.push(r);
        }
    }

    let totalMeters = 0;
    targetSectionIds.forEach((id) => {
        // String() per coerenza con l'indice (le sezioni potrebbero avere ID String o Number)
        let section = idx ? idx.sectionsById.get(String(id)) : db.sections.find((s) => s.id === id);
        if (section && section.length) {
            let meters = parseFloat(section.length);

            if (year !== null) {
                let b = parseYear(section.buildstart);
                let o = parseYear(section.opening);
                let closure = parseYear(section.closure) || 9999;

                // Relazioni per questa sezione (lookup O(1) con la mappa)
                let relsForThisSection = relsBySection.get(id) || [];

                // --- EREDITARIETÀ LINEA DA STAZIONI ---
                if (!o) {
                    let validStationOpenings = [];
                    for (let rel of relsForThisSection) {
                        let inheritedOp = getInheritedLineOpening(rel.line_id);
                        if (inheritedOp) validStationOpenings.push(inheritedOp);
                    }
                    if (validStationOpenings.length > 0) {
                        o = Math.min(...validStationOpenings);
                    }
                }

                let minEffectiveOp = Infinity;
                let maxEffectiveClosure = 0;

                if (relsForThisSection.length > 0) {
                    for (let rel of relsForThisSection) {
                        let relFrom = parseYear(rel.fromyear);
                        let relTo = parseYear(rel.toyear);

                        let effectiveOp = o;
                        let effectiveClosure = closure;

                        if (relFrom && (!effectiveOp || effectiveOp < relFrom)) effectiveOp = relFrom;
                        if (relTo && effectiveClosure > relTo) effectiveClosure = relTo;

                        if (effectiveOp && effectiveOp < minEffectiveOp) minEffectiveOp = effectiveOp;
                        if (effectiveClosure > maxEffectiveClosure) maxEffectiveClosure = effectiveClosure;
                    }
                    if (minEffectiveOp !== Infinity) {
                        o = minEffectiveOp;
                        b = minEffectiveOp;
                    }
                    if (maxEffectiveClosure > 0) closure = maxEffectiveClosure;
                }

                if (b && b < 1863) b = null;
                if (o && o < 1863) o = null;

                if (!o) {
                    if (b) o = 9999;
                    else o = endOfTime;
                }
                if (!b) {
                    if (o !== endOfTime) b = o;
                    else b = endOfTime;
                }

                let isActive = o <= year && closure > year;
                if (!isActive) meters = 0;
            }
            totalMeters += meters;
        }
    });

    let km = totalMeters / 1000;
    if (formatted) {
        return km.toFixed(1).replace(".", ",");
    }
    return km;
}

// --- GLOBAL TOOLTIP MANAGER ---

const Tooltip = {
    element: null,
    arrow: null,
    targetMode: 'mouse', // 'mouse' | 'element'
    targetElement: null,
    showArrow: true,
    placement: 'top', 
    align: 'center',      
    arrowAlign: 'center', // 'start' | 'center' | 'end'
    gap: 12, 
    timer: null,
    isVisible: false,
    lastMouseX: 0,
    lastMouseY: 0,
    
    init() {
        if (document.getElementById('global-tooltip')) return;
        
        // 1. Container Tooltip
        let el = document.createElement('div');
        el.id = 'global-tooltip';
        el.className = 'fixed pointer-events-none z-[9999] opacity-0 invisible transition-opacity duration-150 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-tight rounded-md shadow-xl text-center whitespace-nowrap backdrop-blur-sm';
        
        // 2. Elemento Freccia
        let arrow = document.createElement('div');
        arrow.className = 'absolute w-0 h-0 border-[6px] border-transparent';
        el.appendChild(arrow);
        this.arrow = arrow;

        document.body.appendChild(el);
        this.element = el;
        
        // CSS Shake
        if (!document.getElementById('shake-style')) {
            let style = document.createElement('style');
            style.id = 'shake-style';
            style.innerHTML = `
                @keyframes horizontal-shaking {
                    0% { transform: translateX(0) }
                    25% { transform: translateX(4px) }
                    50% { transform: translateX(-4px) }
                    75% { transform: translateX(4px) }
                    100% { transform: translateX(0) }
                }
                .animate-shake { animation: horizontal-shaking 0.3s ease-in-out; }
            `;
            document.head.appendChild(style);
        }
        
        document.addEventListener('mousemove', (e) => {
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            if (this.targetMode === 'mouse' && !this.element.classList.contains('opacity-0')) {
                this.updatePositionForMouse(e.clientX, e.clientY);
            }
        });
    },

    // options: { placement, align, arrowAlign, duration }
    show(htmlContent, target = null, options = {}) {
        if (!this.element) this.init();
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.element.innerHTML = htmlContent;
        this.element.appendChild(this.arrow); 
        
        if (target instanceof HTMLElement) {
            this.targetMode = 'element';
            this.targetElement = target;
            this.showArrow = options.showArrow !== undefined ? options.showArrow : true;
            this.placement = options.placement || 'top';
            this.align = options.align || 'center';
            this.arrowAlign = options.arrowAlign || 'center'; 
            this.updatePositionForElement();
        } else {
            this.targetMode = 'mouse';
            this.placement = options.placement || 'top';
            this.gap = options.gap !== undefined ? options.gap : 12;
            this.arrow.style.display = 'none'; 
        }

        requestAnimationFrame(() => {
            this.element.classList.remove('opacity-0', 'invisible');
            this.element.classList.add('opacity-100', 'visible');
        });

        if (options.duration) {
            this.timer = setTimeout(() => {
                this.hide();
            }, options.duration);
        }
        this.isVisible = true;
    },

    hide() {
        if (!this.element) return;
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Iniziamo la transizione di opacità
        this.element.classList.remove('opacity-100');
        this.element.classList.add('opacity-0');

        // Aspettiamo che la transizione finisca (150ms come definito in init) 
        // prima di rendere l'elemento 'invisible' per evitare che sparisca di colpo
        setTimeout(() => {
            if (this.element.classList.contains('opacity-0')) {
                this.element.classList.remove('visible');
                this.element.classList.add('invisible');
            }
        }, 150);
        this.isVisible = false;
    },

    // Aggiorna il contenuto senza ri-attivare animazioni se è già visibile
    updateContent(html, duration = null) {
        if (!this.element || !this.isVisible) return;
        this.element.innerHTML = html;
        if (this.targetMode === 'element') {
            this.updatePositionForElement();
        } else if (this.targetMode === 'mouse') {
            this.updatePositionForMouse(this.lastMouseX, this.lastMouseY);
        }

        // Se viene fornita una durata, resettiamo il timer di sparizione
        if (duration) {
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.hide();
            }, duration);
        }
    },

    // Aggiornato per ricevere i dati di posizione e calcolare il centro reale
    updateArrow(placement, targetRect, tooltipPos, tooltipRect) {
        if (!this.showArrow) {
            this.arrow.style.display = 'none';
            return;
        }
        this.arrow.style.display = 'block';
        this.arrow.className = 'absolute w-0 h-0 border-[6px] border-transparent';
        
        // Reset completo stili inline per evitare conflitti e leak di stili precedenti
        this.arrow.style.top = ''; 
        this.arrow.style.bottom = ''; 
        this.arrow.style.left = ''; 
        this.arrow.style.right = ''; 
        this.arrow.style.transform = '';
        this.arrow.style.borderTopColor = '';
        this.arrow.style.borderBottomColor = '';
        this.arrow.style.borderLeftColor = '';
        this.arrow.style.borderRightColor = '';

        const color = '#171717'; 
        const arrowSize = 6; // dimensione bordo in px
        const borderRadius = 6; // stima del border radius del tooltip per clamping

        // Funzione per calcolare la posizione esatta (pixel) rispetto al target
        const calculateCenterPos = (axis) => {
            // Se non abbiamo i dati del target (es. mouse mode), fallback al 50%
            if (!targetRect || !tooltipPos) return { style: '50%', transform: 'translate(-50%)' };

            let posValue;
            
            if (axis === 'horizontal') {
                // Calcola il centro del target (es. occhio)
                const targetCenter = targetRect.left + (targetRect.width / 2);
                // Calcola dove dovrebbe stare la freccia RELATIVAMENTE al tooltip
                let arrowLeft = targetCenter - tooltipPos.left - arrowSize;
                
                // CLAMP: Impedisce alla freccia di uscire dai bordi arrotondati del tooltip
                const maxLeft = tooltipRect.width - (arrowSize * 2) - borderRadius;
                const minLeft = borderRadius;
                arrowLeft = Math.max(minLeft, Math.min(arrowLeft, maxLeft));
                
                return { style: `${arrowLeft}px`, transform: 'none' };
            } 
            else { // vertical
                const targetCenter = targetRect.top + (targetRect.height / 2);
                let arrowTop = targetCenter - tooltipPos.top - arrowSize;
                
                const maxTop = tooltipRect.height - (arrowSize * 2) - borderRadius;
                const minTop = borderRadius;
                arrowTop = Math.max(minTop, Math.min(arrowTop, maxTop));
                
                return { style: `${arrowTop}px`, transform: 'none' };
            }
        };

        // Helper per posizionamento statico (start/end)
        const setStaticPos = (side) => {
            const edgeOffset = '10px';
            if (this.arrowAlign === 'start') {
                this.arrow.style[side] = edgeOffset;
            } else if (this.arrowAlign === 'end') {
                this.arrow.style[side === 'left' ? 'right' : 'bottom'] = edgeOffset;
                this.arrow.style[side] = 'auto';
            }
        };

        // Logica principale
        if (this.arrowAlign === 'center') {
            switch (placement) {
                case 'top':
                case 'bottom':
                    const hPos = calculateCenterPos('horizontal');
                    this.arrow.style.left = hPos.style;
                    if (hPos.transform !== 'none') this.arrow.style.transform = `translateX(${hPos.transform})`;
                    break;
                case 'left':
                case 'right':
                    const vPos = calculateCenterPos('vertical');
                    this.arrow.style.top = vPos.style;
                    if (vPos.transform !== 'none') this.arrow.style.transform = `translateY(${vPos.transform})`;
                    break;
            }
        } else {
            // Se l'utente specifica start/end esplicitamente
            if (placement === 'top' || placement === 'bottom') setStaticPos('left');
            else setStaticPos('top');
        }

        // Posizionamento della freccia sul bordo corretto
        switch (placement) {
            case 'top':
                this.arrow.style.borderTopColor = color;
                this.arrow.style.bottom = '-12px';
                break;
            case 'bottom':
                this.arrow.style.borderBottomColor = color;
                this.arrow.style.top = '-12px';
                break;
            case 'left':
                this.arrow.style.borderLeftColor = color;
                this.arrow.style.right = '-12px';
                break;
            case 'right':
                this.arrow.style.borderRightColor = color;
                this.arrow.style.left = '-12px';
                break;
            case 'center':
                this.arrow.style.display = 'none';
                break;
        }
    },

    updatePositionForMouse(mouseX, mouseY) {
        this.arrow.style.display = 'none';

        const rect = this.element.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 10;
        
        let left = 0;
        let top = 0;

        switch (this.placement) {
            case 'top':
                left = mouseX - (rect.width / 2);
                top = mouseY - rect.height - (this.gap + 5); 
                break;
            case 'bottom':
                left = mouseX - (rect.width / 2);
                top = mouseY + (this.gap + 5);
                break;
            case 'left':
                left = mouseX - rect.width - (this.gap + 5);
                top = mouseY - (rect.height / 2);
                break;
            case 'right':
                left = mouseX + (this.gap + 5);
                top = mouseY - (rect.height / 2);
                break;
            case 'top-left':
                left = mouseX - rect.width - (this.gap + 5);
                top = mouseY - rect.height - (this.gap + 5);
                break;
            case 'top-right':
                left = mouseX + (this.gap + 5);
                top = mouseY - rect.height - (this.gap + 5);
                break;
            case 'bottom-left':
                left = mouseX - rect.width - (this.gap + 5);
                top = mouseY + (this.gap + 5);
                break;
            case 'bottom-right':
                left = mouseX + (this.gap + 5);
                top = mouseY + (this.gap + 5);
                break;
            default:
                left = mouseX - (rect.width / 2);
                top = mouseY - rect.height - (this.gap + 5);
        }
        
        // Clamping per evitare che esca dallo schermo
        if (left < padding) left = padding;
        else if (left + rect.width > winW - padding) left = winW - rect.width - padding;
        
        if (top < padding) top = padding;
        else if (top + rect.height > winH - padding) top = winH - rect.height - padding;

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    },

    updatePositionForElement() {
        if (!this.targetElement) return;
        
        const tr = this.targetElement.getBoundingClientRect(); 
        const er = this.element.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 10; 
        
        const calcPos = (place) => {
            let t = 0, l = 0;
            
            if (place === 'center') {
                l = tr.left + (tr.width / 2) - (er.width / 2);
                if (this.align === 'start') t = tr.top; 
                else if (this.align === 'end') t = tr.bottom - er.height;
                else t = tr.top + (tr.height / 2) - (er.height / 2);
                return { top: t, left: l };
            }

            switch (place) {
                case 'top':    t = tr.top - er.height - this.gap; break;
                case 'bottom': t = tr.bottom + this.gap; break;
                case 'left':   l = tr.left - er.width - this.gap; break;
                case 'right':  l = tr.right + this.gap; break;
            }

            if (place === 'top' || place === 'bottom') {
                if (this.align === 'start') l = tr.left;
                else if (this.align === 'end') l = tr.right - er.width;
                else l = tr.left + (tr.width / 2) - (er.width / 2); 
            }
            else { 
                if (this.align === 'start') t = tr.top;
                else if (this.align === 'end') t = tr.bottom - er.height;
                else t = tr.top + (tr.height / 2) - (er.height / 2); 
            }

            return { top: t, left: l };
        };

        let pos = calcPos(this.placement);
        let activePlacement = this.placement;

        if (this.placement !== 'center') {
             const outTop = pos.top < padding;
             const outBottom = pos.top + er.height > winH - padding;
             const outLeft = pos.left < padding;
             const outRight = pos.left + er.width > winW - padding;

             if (this.placement === 'top' && outTop) activePlacement = 'bottom';
             else if (this.placement === 'bottom' && outBottom) activePlacement = 'top';
             else if (this.placement === 'left' && outLeft) activePlacement = 'right';
             else if (this.placement === 'right' && outRight) activePlacement = 'left';

             if (activePlacement !== this.placement) {
                 pos = calcPos(activePlacement);
             }
        }

        pos.left = Math.max(padding, Math.min(pos.left, winW - er.width - padding));
        pos.top = Math.max(padding, Math.min(pos.top, winH - er.height - padding));

        this.element.style.left = `${pos.left}px`;
        this.element.style.top = `${pos.top}px`;

        // Passiamo TUTTI i dati necessari per calcolare la posizione precisa della freccia
        this.updateArrow(activePlacement, tr, pos, er);
    }
};