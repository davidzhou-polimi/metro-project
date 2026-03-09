// modules/splash/splash.js
// ============================================================================
// ARCHITETTURA DICHIARATIVA
//
// Una linea è definita con:
//   { color, from, pos, weight?, bend? }
//
// - from:  'left' | 'right' | 'top' | 'bottom'  — bordo di entrata
// - pos:   [0-1] posizione sull'asse perpendicolare al bordo di entrata
//           (es. per 'left'/'right' → y/h,  per 'top'/'bottom' → x/w)
// - bend:  { at, dx, dy }  — piega opzionale
//   · at:  [0-1] posizione assoluta sull'asse principale dove avviene la piega
//           (per linee orizzontali → x/w,  per verticali → y/h)
//   · dx, dy: direzione dopo la piega (±1, ±1 in combinazione per 45°)
//
// Le intersezioni tra linee vengono calcolate geometricamente in automatico.
// ============================================================================

// --- STATO GLOBALE ---
let splashUIContainer, titleElem, descElem, exploreBtn, backdropElem;
let btnVisible   = false;
let linesStopped = false;
let animStartTime = 0;
let splashLinesStoppedAt = NaN; // Timestamp stop animazione
let isPortrait   = false;  // true su mobile/portrait
let splashMobileThreshold = 0.5; // Soglia per desktop vs mobile
let splashBackdropThreshold = 0.5; // Soglia per il backdrop dei testi
let splashTabletThreshold = 1.0;

let currentSpeed        = 0;
let currentStrokeWeight = 10;

// Array di linee risolte in pixel (reset a ogni resize/setup)
let splashLines  = [];
let foundDots    = new Map();   // chiave: "rx,ry" → {x,y} — intersezioni trovate
let trainsByColor = {};

const SPLASH_COLORS = {
    green:     "#16a34a",
    yellow:    "#eab308",
    orange:    "#f97316",
    lightblue: "#0ea5e9",
    blue:      "#2563eb",
    red:       "#b91c1c",
    purple:    "#9333ea",
};

// ============================================================================
// CONFIGURAZIONE TEMPI E DISTANZE UI
// ============================================================================
const SPLASH_UI_CONFIG = {
    // Gap e padding UI
    titleDescGap: "1.5rem",         // Distanza tra titolo "WORLD METRO" e la descrizione
    buttonDotSpacing: 20,           // Spazio in pixel tra l'angolo basso del bottone Explore e il pallino

    // Ritardi animazione (in millisecondi dal caricamento)
    backdropDelay: 750,
    titleDelay: 750,
    descDelay: 1500,
    
    // Ritardo animazione bottone (in ms da quando si fermano le linee e partono i treni)
    // 1000ms da` il tempo ai treni di iniziare il loro fade-in prima che compaia il bottone.
    buttonDelayAfterTrains: 500, 

    // Dimensioni backdrop (mobile chaos-mode)
    backdropWidth: "80%",           // Larghezza ellissi
    backdropHeight: "30%",          // Altezza ellissi (ridotta)
    backdropCenterY: "50%",         // Posizione verticale centro
};

// ============================================================================
// API DICHIARATIVA — definisce le linee come frazioni di w/h
// ============================================================================

/**
 * Ritorna un array di definizioni-linea in base all'aspect ratio.
 * Desktop (w/h >= threshold): box rettangolare come l'originale.
 * Portrait (w/h < threshold): stesse 7 linee riposizionate per riempire lo schermo.
 */
function getLineDefs(w, h) {
    let ratio = w / h;
    if (ratio >= splashTabletThreshold) {
        // === DESKTOP / LANDSCAPE ===
        return [
            { color: SPLASH_COLORS.green,     from:'left',   pos: 0.866 },
            { color: SPLASH_COLORS.yellow,    from:'top',    pos: 0.20 },
            { color: SPLASH_COLORS.orange,    from:'bottom', pos: 0.125 },
            { color: SPLASH_COLORS.lightblue, from:'top',    pos: 0.825 },
            { color: SPLASH_COLORS.blue,      from:'left',   pos: 0.25,  bend:{ at:0.27, dx:1, dy:-1 } },
            { color: SPLASH_COLORS.red,       from:'right',  pos: 0.766,  bend:{ at:0.775, dx:-1, dy:1  } },
            { color: SPLASH_COLORS.purple,    from:'right',  pos: 0.175, bend:{ at:0.40, dx:-1, dy:-1 } },
        ];
    } else if (ratio >= splashMobileThreshold) {
        // === TABLET ===
        return [
            { color: SPLASH_COLORS.green,     from:'left',   pos: 0.866 },
            { color: SPLASH_COLORS.yellow,    from:'top',    pos: 0.125 },
            // { color: SPLASH_COLORS.orange,    from:'bottom', pos: 0.125 },
            { color: SPLASH_COLORS.lightblue, from:'top',    pos: 0.875 },
            { color: SPLASH_COLORS.blue,      from:'left',   pos: 0.25,  bend:{ at:0.27, dx:1, dy:-1 } },
            { color: SPLASH_COLORS.red,       from:'right',  pos: 0.766,  bend:{ at:0.875, dx:-1, dy:1  } },
            { color: SPLASH_COLORS.purple,    from:'right',  pos: 0.175, bend:{ at:0.40, dx:-1, dy:-1 } },
        ];
    } else {
        // === MOBILE / PORTRAIT ===
        return [
            // { color: SPLASH_COLORS.green,     from:'left',   pos: 0.775 },
            // { color: SPLASH_COLORS.yellow,    from:'left',  pos: 0.225, bend:{ at:0.175, dx:1, dy:-1 } },
            // { color: SPLASH_COLORS.orange,    from:'bottom', pos: 0.125, bend:{ at:0.725, dx:-1, dy:-1 }  },
            // { color: SPLASH_COLORS.lightblue, from:'left',    pos: 0.825, bend:{ at:0.25, dx:1, dy:1 } },
            // { color: SPLASH_COLORS.blue,      from:'left',   pos: 0.30, bend:{ at:0.25, dx:1, dy:-1 } },
            // { color: SPLASH_COLORS.red,       from:'right',  pos: 0.70, bend:{ at:0.90, dx:-1, dy:1  } },
            // { color: SPLASH_COLORS.purple,    from:'right',  pos: 0.20, bend:{ at:0.67, dx:-1, dy:-1 } },

            // { color: SPLASH_COLORS.green,     from:'left',   pos: 0.80, bend:{ at:0.50, dx:1, dy:1 } },
            // { color: SPLASH_COLORS.yellow,    from:'bottom', pos: 0.20, bend:{ at:0.725, dx:-1, dy:-1 } },
            // { color: SPLASH_COLORS.lightblue, from:'top',    pos: 0.90, bend:{ at:0.325, dx:1, dy:1 } },
            // { color: SPLASH_COLORS.blue,      from:'left',   pos: 0.275, bend:{ at:0.225, dx:1, dy:-1 } },
            // { color: SPLASH_COLORS.red,       from:'right',  pos: 0.725, bend:{ at:1.00, dx:-1, dy:1  } },
            // { color: SPLASH_COLORS.purple,    from:'right',  pos: 0.20, bend:{ at:0.375, dx:-1, dy:-1 } },

            { color: SPLASH_COLORS.purple,      from:'right',     pos: 0.25,   bend:{ at:0.375, dx:-1, dy:-1 } },
            { color: SPLASH_COLORS.green,       from:'left',      pos: 0.815,  bend:{ at:0.50, dx:1, dy:1 } },
            { color: SPLASH_COLORS.yellow,      from:'top',       pos: 0.90,   bend:{ at:0.30, dx:1, dy:1 } },
            { color: SPLASH_COLORS.lightblue,   from:'bottom',    pos: 0.133,   bend:{ at:0.775, dx:-1, dy:-1 } },
            { color: SPLASH_COLORS.blue,        from:'left',      pos: 0.30,   bend:{ at:0.10, dx:1, dy:-1 } },
            { color: SPLASH_COLORS.red,         from:'right',     pos: 0.725,  bend:{ at:1, dx:-1, dy:1 } },
        ];
    }
}

/**
 * Converte una definizione-linea (frazioni) in una linea risolta (pixel).
 * Calcola start, direzione, punto di piega, lunghezza totale.
 */
function resolveLine(def, w, h) {
    let { color, weight, from, pos, bend } = def;

    // Punto di partenza e direzione principale
    let sx, sy, ddx, ddy;
    switch (from) {
        case 'left':   sx=0;     sy=pos*h;  ddx=1;  ddy=0;  break;
        case 'right':  sx=w;     sy=pos*h;  ddx=-1; ddy=0;  break;
        case 'top':    sx=pos*w; sy=0;      ddx=0;  ddy=1;  break;
        case 'bottom': sx=pos*w; sy=h;      ddx=0;  ddy=-1; break;
    }

    let mainLen, bx, by, diagDx=0, diagDy=0, diagLen=0;

    if (bend) {
        // bend.at = frazione assoluta dell'asse principale (x/w per horiz, y/h per vert)
        let bendAbsPx = (from==='left'||from==='right') ? bend.at*w : bend.at*h;

        // Distanza dal punto di partenza al punto di piega
        switch (from) {
            case 'left':   mainLen = bendAbsPx;     break;  // da x=0 a x=bend.at*w
            case 'right':  mainLen = w - bendAbsPx; break;  // da x=w a x=bend.at*w
            case 'top':    mainLen = bendAbsPx;     break;
            case 'bottom': mainLen = h - bendAbsPx; break;
        }

        bx = sx + ddx * mainLen;
        by = sy + ddy * mainLen;
        diagDx = bend.dx;
        diagDy = bend.dy;

        // Lunghezza della diagonale fino al bordo schermo
        let tMax = Infinity;
        if (diagDx >  0) tMax = Math.min(tMax, (w - bx) / diagDx);
        if (diagDx <  0) tMax = Math.min(tMax, bx  / -diagDx);
        if (diagDy >  0) tMax = Math.min(tMax, (h - by) / diagDy);
        if (diagDy <  0) tMax = Math.min(tMax, by  / -diagDy);
        diagLen = Math.SQRT2 * Math.max(0, tMax); // lunghezza in pixel reali (45° → √2)
    } else {
        mainLen = (from==='left'||from==='right') ? w : h;
        bx = sx + ddx * mainLen;
        by = sy + ddy * mainLen;
    }

    return {
        color,
        sw: weight || null,      // null = usa currentStrokeWeight globale
        sx, sy,                  // punto di partenza (px)
        ddx, ddy,                // direzione principale
        mainLen,                 // lunghezza segmento principale (px)
        bx, by,                  // punto di piega (px)
        diagDx, diagDy,          // direzione diagonale
        diagLen,                 // lunghezza diagonale (px reali)
        totalLength: mainLen + diagLen,
        progress: 0,
        done: false,
    };
}

// ============================================================================
// SEGMENTI VISIBILI — derivati da progress
// ============================================================================

/**
 * Ritorna i segmenti visibili di una linea basandosi su progress (px percorsi).
 * Ogni segmento: { x1,y1,x2,y2 }
 * NOTA: il segmento diagonale usa t > epsilon per escludere il punto di piega,
 * che è già coperto dalla fine del segmento principale. Questo evita doppi dot.
 */
function getVisibleSegments(line) {
    let prog = line.progress;
    if (prog <= 0) return [];

    let segs = [];

    // Segmento principale
    let mp = Math.min(prog, line.mainLen);
    segs.push({
        x1: line.sx,
        y1: line.sy,
        x2: line.sx + line.ddx * mp,
        y2: line.sy + line.ddy * mp,
    });

    // Segmento diagonale (se la piega è già stata raggiunta)
    // Inizia con un margine epsilon per NON duplicare il punto di piega
    if (line.diagLen > 0 && prog > line.mainLen) {
        let dp = prog - line.mainLen;
        let t  = dp / Math.SQRT2;
        let eps = 0.5;   // offset in pixels per escludere il bend point
        let tex = Math.min(eps, t * 0.5); // sicuro anche per diagonali corte
        segs.push({
            x1: line.bx + line.diagDx * tex,
            y1: line.by + line.diagDy * tex,
            x2: line.bx + line.diagDx * t,
            y2: line.by + line.diagDy * t,
        });
    }

    return segs;
}

// ============================================================================
// INTERSEZIONI GEOMETRICHE — calcolo automatico
// ============================================================================

/**
 * Intersezione tra due segmenti (standard parametrico).
 * Ritorna {x,y} o null.
 */
function segIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    let d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    if (Math.abs(d) < 0.01) return null;
    let t = ((x1-x3)*(y3-y4) - (y1-y3)*(x3-x4)) / d;
    let u = -((x1-x2)*(y1-y3) - (y1-y2)*(x1-x3)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: x1 + t*(x2-x1), y: y1 + t*(y2-y1) };
    }
    return null;
}

/**
 * Per ogni coppia di linee distinte, calcola i segmenti visibili e cerca intersezioni.
 * I punti nuovi vengono aggiunti a foundDots (Map deduplicata).
 */
function updateIntersections(lines) {
    let now = millis();
    for (let i = 0; i < lines.length; i++) {
        let segsI = getVisibleSegments(lines[i]);
        for (let j = i+1; j < lines.length; j++) {
            let segsJ = getVisibleSegments(lines[j]);
            for (let si of segsI) {
                for (let sj of segsJ) {
                    let pt = segIntersect(si.x1,si.y1,si.x2,si.y2, sj.x1,sj.y1,sj.x2,sj.y2);
                    if (pt) {
                        // Dedup su griglia 8px (dot ~14px → nessuna intersezione legittima a <8px)
                        let key = `${Math.round(pt.x/8)},${Math.round(pt.y/8)}`;
                        if (!foundDots.has(key)) foundDots.set(key, {
                            x: pt.x, 
                            y: pt.y, 
                            addedAt: now,
                            hoverProgress: 0
                        });
                    }
                }
            }
        }
    }
}

// ============================================================================
// TRENI — derivati dai segmenti risolti
// ============================================================================

/**
 * Costruisce trainsByColor analizzando i segmenti di ogni linea risolta.
 * Chiamato una sola volta quando linesStopped = true.
 */
function initTrains(lines) {
    const spacing   = 70;
    const baseSpeed = 0.000025;
    let now = millis();

    trainsByColor = {};
    for (let line of lines) {
        let { color, sx, sy, ddx, ddy, mainLen, bx, by, diagDx, diagDy, totalLength } = line;
        let N = Math.max(2, Math.ceil(totalLength / spacing));

        function makeXY(ln) {
            return function(p) {
                let dist = p * ln.totalLength;
                if (dist <= ln.mainLen) {
                    return { x: ln.sx + ln.ddx * dist, y: ln.sy + ln.ddy * dist };
                } else {
                    let t = (dist - ln.mainLen) / Math.SQRT2;
                    return { x: ln.bx + ln.diagDx * t, y: ln.by + ln.diagDy * t };
                }
            };
        }

        let xyFn = makeXY(line);
        if (!trainsByColor[color]) trainsByColor[color] = { startedAt: now, list: [] };
        let spd = baseSpeed * (0.8 + Math.random() * 0.4);
        for (let i = 0; i < N; i++) {
            trainsByColor[color].list.push({ color, speed: spd, offset: i/N, xy: xyFn });
        }
    }
}

/**
 * Disegna i treni di un colore. Chiamato subito dopo la linea corrispondente
 * per rispettare lo z-order (i treni restano sotto la linea disegnata dopo).
 */
function drawTrainsFor(color, sw) {
    if (!linesStopped) return;
    let groupData = trainsByColor[color];
    if (!groupData || groupData.list.length === 0) return;

    let group = groupData.list;
    let targetTd = Math.max(5, sw * 0.60);
    let now = millis();

    // Animazione di ingresso: fade-in e scale-up su 1 secondo
    let dur = 1000;
    let t = Math.min(1, (now - groupData.startedAt) / dur);
    // Ease-out cubic per un'entrata morbida
    let easeOut = 1 - Math.pow(1 - t, 3);
    
    let td = targetTd * easeOut;
    let alpha = 255 * easeOut;

    if (td < 1) return; // Non li stampo neanche se sono invisibili

    push(); 
    // converto hex color + alpha in p5 color
    let c = color;
    if (typeof c === 'string' && c.startsWith('#')) {
        let r = parseInt(c.slice(1,3), 16);
        let g = parseInt(c.slice(3,5), 16);
        let b = parseInt(c.slice(5,7), 16);
        fill(r, g, b, alpha);
    } else {
        // Fallback robusto se l'oggetto SPLASH_COLORS viene modificato
        let p5color = color(c);
        p5color.setAlpha(alpha);
        fill(p5color);
    }
    fill(255, 255, 255, alpha); // i dot sono sempre stati bianchi in questi helper
    noStroke();

    for (let tr of group) {
        let pos      = ((now * tr.speed) + tr.offset) % 1;
        let { x, y } = tr.xy(pos);
        circle(x, y, td);
    }
    pop();
}

// ============================================================================
// SETUP
// ============================================================================

function setupSplash() {
    let container = getContentContainer();
    if (!container) return;

    // La splash occupa l'intero viewport (nessuna navbar).
    // NON usiamo clientWidth/clientHeight: changeState() fa innerHTML='' prima di
    // chiamare setupSplash(), quindi il DOM non ha ancora rifatto il reflow e i valori
    // sarebbero 0. windowWidth/windowHeight di p5.js sono sempre aggiornati al viewport.
    let w = windowWidth;
    let h = windowHeight;

    let cnv = createCanvas(w, h);
    cnv.parent(container);
    cnv.style("position", "absolute");
    cnv.style("inset", "0");
    cnv.style("z-index", "0");

    resetSplashState(w, h);
    animStartTime = millis();

    createSplashUI(container, w, h);

    background(255);
    textFont("Underground");
}

function resetSplashState(w, h) {
    btnVisible   = false;
    linesStopped = false;
    isPortrait   = (w / h) < splashMobileThreshold;
    trainsByColor = {};
    foundDots    = new Map();

    let diagonal = Math.sqrt(w*w + h*h);
    currentSpeed        = Math.max(3, Math.min(14, diagonal * 0.004));
    currentStrokeWeight = Math.max(6, Math.min(14, w * 0.025));

    // Costruisci e risolvi le linee
    let defs  = getLineDefs(w, h);
    splashLines = defs.map(def => resolveLine(def, w, h));
}

// ============================================================================
// CREA UI
// ============================================================================

function createSplashUI(container, w, h) {
    let existing = document.getElementById("splash-ui-root");
    if (existing) existing.remove();

    let root = document.createElement("div");
    root.id = "splash-ui-root";
    root.style.cssText = "position:absolute;inset:0;z-index:10;pointer-events:none;";
    container.elt.appendChild(root);

    splashUIContainer = createDiv();
    splashUIContainer.parent(root);
    splashUIContainer.class("absolute inset-0 flex flex-col items-center justify-center px-4");
    
    // Su mobile: backdrop per leggibilità sul rumore visivo del chaos-mode
    let needsBackdrop = (w / h) < splashBackdropThreshold;
    if (needsBackdrop) {
        splashUIContainer.elt.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;";
        backdropElem = document.createElement("div");
        backdropElem.style.cssText =
            "position:absolute;inset:0;opacity:0;transition:opacity 1s ease-out;" +
            `background:radial-gradient(ellipse ${SPLASH_UI_CONFIG.backdropWidth} ${SPLASH_UI_CONFIG.backdropHeight} at 50% ${SPLASH_UI_CONFIG.backdropCenterY}, rgba(255,255,255,0.95) 45%, rgba(255,255,255,0) 100%);`;
        splashUIContainer.elt.appendChild(backdropElem);
    } else {
        backdropElem = null;
    }

    // TITOLO
    titleElem = createElement("h1", "WORLD<br/>METRO");
    titleElem.parent(splashUIContainer);
    titleElem.style("opacity", "0");
    titleElem.style("margin-bottom", SPLASH_UI_CONFIG.titleDescGap);
    titleElem.class(
        "font-underground font-semibold leading-1 sm:leading-[1.15] tracking-tight text-6xl md:text-8xl " +
        "select-none text-center text-neutral-900 transition-opacity duration-1000 ease-out " +
        "relative z-10"
    );

    // DESCRIZIONE
    descElem = createP(
        "Trace the growth of underground transportation across history and cities, one line at a time."
    );
    descElem.parent(splashUIContainer);
    descElem.style("opacity", "0");
    descElem.class(
        "text-center max-w-sm sm:max-w-md px-8 text-base text-neutral-500 " +
        "font-medium leading-relaxed transition-opacity duration-1000 ease-out mb-4 relative z-10"
    );

    // BOTTONE
    exploreBtn = createDiv();
    exploreBtn.parent(root);
    exploreBtn.id("explore-btn");
    exploreBtn.style("opacity", "0");
    exploreBtn.style("visibility", "hidden");
    exploreBtn.elt.style.cssText +=
        "position:absolute;left:50%;transform:translate(-50%,-100%);" +
        "pointer-events:auto;display:flex;flex-direction:column;align-items:center;cursor:pointer;" +
        "transition:opacity 0.6s ease-out, transform 0.3s ease-out;";

    exploreBtn.elt.addEventListener("mouseenter", () => {
        if (btnVisible) exploreBtn.elt.style.transform = "translate(-50%, calc(-100% - 8px))";
    });
    exploreBtn.elt.addEventListener("mouseleave", () => {
        if (btnVisible) exploreBtn.elt.style.transform = "translate(-50%, -100%)";
    });

    exploreBtn.html(`
        <div class="group bg-[#0f1014] text-white font-underground font-bold tracking-widest uppercase
                    px-6 py-3 rounded-xl shadow-none hover:shadow-md border-4 border-neutral-900
                    hover:bg-white hover:text-neutral-900
                    transition duration-300
                    flex items-center justify-center text-sm md:text-base whitespace-nowrap leading-none select-none">
            <span class="pt-[2px]">EXPLORE</span>
            <svg class="h-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:ml-2
                        transition-[width,opacity,margin] duration-300 self-center"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clip-rule="evenodd"/>
            </svg>
        </div>
        <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent
                    border-t-[14px] border-t-[#0f1014] mt-[-1px]"></div>
    `);

    const goHome = () => { if (btnVisible) changeState("HOME"); };
    exploreBtn.mouseClicked(() => { if (mouseButton === LEFT) goHome(); });
    exploreBtn.elt.addEventListener("touchend", (e) => { e.preventDefault(); goHome(); });
}

// ============================================================================
// DRAW LOOP
// ============================================================================

function drawSplash() {
    background(255);

    let w       = width;
    let h       = height;
    let sw      = currentStrokeWeight;
    let elapsed = millis() - animStartTime;

    // --- Avanza le linee ---
    let allDone = true;
    for (let line of splashLines) {
        if (!line.done) {
            line.progress += currentSpeed;
            if (line.progress >= line.totalLength) {
                line.progress = line.totalLength;
                line.done = true;
            }
            allDone = false;
        }
    }

    // --- Tutte le linee ferme: avvia treni ---
    if (!linesStopped && allDone) {
        linesStopped = true;
        splashLinesStoppedAt = millis();
        initTrains(splashLines);
    }

    // --- Fade-in testi e backdrop ---
    if (elapsed > SPLASH_UI_CONFIG.backdropDelay && backdropElem) backdropElem.style.opacity = "1";
    if (elapsed > SPLASH_UI_CONFIG.titleDelay && titleElem) titleElem.style("opacity", "1");
    if (elapsed > SPLASH_UI_CONFIG.descDelay && descElem)  descElem.style("opacity", "1");

    // --- Bottone: ancorato sopra il dot del centro della linea verde, con delay rispetto ai treni ---
    let msSinceStopped = millis() - splashLinesStoppedAt;
    if (linesStopped && msSinceStopped > SPLASH_UI_CONFIG.buttonDelayAfterTrains && !btnVisible && exploreBtn) {
        let greenLine = splashLines.find(l => l.color === SPLASH_COLORS.green);
        if (greenLine) {
            // Dot centrale sulla linea verde = posizione y della linea, x = w/2
            let gY      = greenLine.sy;  // la verde è sempre orizzontale
            let circleR = Math.max(8, sw * 0.85);
            let anchorY = gY - circleR - SPLASH_UI_CONFIG.buttonDotSpacing;
            exploreBtn.elt.style.top = anchorY + "px";
        }
        exploreBtn.style("visibility", "visible");
        exploreBtn.style("opacity", "1");
        btnVisible = true;
    }

    // --- Parallax testo (mouse) ---
    if (splashUIContainer) {
        let px = ((mouseX / w) - 0.5) * 6;
        let py = ((mouseY / h) - 0.5) * 6;
        splashUIContainer.elt.style.transform = `translate(${px}px, ${py}px)`;
    }

    // --- Disegno linee + treni (interleaved per z-order) ---
    for (let ln of splashLines) {
        let lsw  = ln.sw || sw;
        let segs = getVisibleSegments(ln);

        push(); stroke(ln.color); strokeWeight(lsw); noFill();
        for (let seg of segs) {
            line(seg.x1, seg.y1, seg.x2, seg.y2);
        }
        pop();

        // Treni subito dopo la loro linea → passano sotto le linee disegnate dopo
        drawTrainsFor(ln.color, lsw);
    }

    // --- Aggiorna e disegna intersezioni ---
    updateIntersections(splashLines);

    let cd  = Math.max(14, sw * 1.6);   // diametro target a regime
    let csw = Math.max(2, sw * 0.28);
    let now = millis();

    // Ease-out elastica (0 → 1.0)
    function getPopInScale(addedAt) {
        let dur = 350;
        let t   = Math.min(1, (now - addedAt) / dur);
        if (t < 0.7) return (t / 0.7) * 1.30;
        return 1.30 - (t - 0.7) / 0.3 * 0.30;
    }

    push(); stroke(0); strokeWeight(csw); fill(255);

    // Dot centrale sulla linea verde
    let greenLine = splashLines.find(l => l.color === SPLASH_COLORS.green);
    if (greenLine && greenLine.progress >= width/2) {
        let cKey = 'center';
        if (!foundDots.has(cKey)) foundDots.set(cKey, {
            x: width/2, 
            y: greenLine.sy, 
            addedAt: now,
            hoverProgress: 0
        });
    }

    // Disegna tutti i dot (incluso il centrale) applicando pop-in + hover
    for (let dot of foundDots.values()) {
        // Controllo Hover: area interattiva limitata al pallino stesso (raggio = cd/2) e adiacenze (diciamo cd * 0.70)
        let d = dist(mouseX, mouseY, dot.x, dot.y);
        let isHovered = (d < cd * 0.70);
        
        // Lerp progress (0..1)
        if (isHovered) {
            dot.hoverProgress = lerp(dot.hoverProgress, 1, 0.2);
        } else {
            dot.hoverProgress = lerp(dot.hoverProgress, 0, 0.15);
        }

        let baseScale  = getPopInScale(dot.addedAt);
        let hoverScale = 1 + (dot.hoverProgress * 0.15); // cresce max fino al 115%
        let finalDiam  = cd * baseScale * hoverScale;
        
        // Se isHovered, aumento un po' anche lo strokeWeight per dare "peso"
        if (dot.hoverProgress > 0) strokeWeight(csw * (1 + dot.hoverProgress * 0.15));
        else strokeWeight(csw);

        circle(dot.x, dot.y, finalDiam);
    }

    pop();
}

// ============================================================================
// RESIZE & CLEANUP
// ============================================================================

function resizeSplash() {
    let container = getContentContainer();
    if (!container) return;
    let w = windowWidth;
    let h = windowHeight;
    resizeCanvas(w, h);
    let wasPortrait = isPortrait;
    let hadBackdrop = !!backdropElem;

    resetSplashState(w, h);

    // Ricrea l'UI se la modalità (portrait/landscape) o il backdrop sono cambiati
    let needsBackdrop = (w / h) < splashBackdropThreshold;
    
    if (wasPortrait !== isPortrait || needsBackdrop !== hadBackdrop) {
        let root = document.getElementById("splash-ui-root");
        if (root) root.remove();
        createSplashUI(container, w, h);
    }
}

function removeSplash() {
    noCanvas();
    if (typeof cursor === "function") cursor(ARROW);
    let root = document.getElementById("splash-ui-root");
    if (root) root.remove();
    splashUIContainer = null;
    titleElem         = null;
    descElem          = null;
    exploreBtn        = null;
    backdropElem      = null;
    splashLines       = [];
    foundDots         = new Map();
    trainsByColor     = {};
    btnVisible        = false;
    linesStopped      = false;
    animStartTime     = 0;
    splashLinesStoppedAt = NaN;
    isPortrait        = false;
    currentSpeed        = 0;
    currentStrokeWeight = 10;
}
