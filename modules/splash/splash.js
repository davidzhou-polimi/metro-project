// modules/splash/splash.js

// --- VARIABILI GLOBALI SPLASH ---
let splashUIContainer;
let titleElem, descElem, exploreBtn;
let btnVisible = false;
let linesStopped = false;

// Timer
let animStartTime = 0;

// Linee
let centerPoint; // Punto centrale per il cerchio visivo
let x1green, y1green, x2green, y2green;
let x1yellow, y1yellow, x2yellow, y2yellow;
let x1orange, y1orange, x2orange, y2orange;
let x1lightblue, y1lightblue, x2lightblue, y2lightblue;

let x1blue, y1blue, x2blue, y2blue;
let segmentBlue, stopXBlue, stopXFractionBlue;
let x1blueDeviation, y1blueDeviation, x2blueDeviation, y2blueDeviation;

let x1red, y1red, x2red, y2red;
let segmentRed, stopXRed, stopXFractionRed;
let x1redDeviation, y1redDeviation, x2redDeviation, y2redDeviation;

let x1purple, y1purple, x2purple, y2purple;
let segmentPurple, stopXPurple, stopXFractionPurple;
let x1purpleDeviation, y1purpleDeviation, x2purpleDeviation, y2purpleDeviation;

// Velocità responsive
let currentSpeed = 0;

// Intersezioni
let intersectionBlueYellow,
  intersectionBlueOrange,
  intersectionBluePurpleDeviation;
let intersectionLightbluePurple,
  intersectionLightblueRed,
  intersectionLightblueGreen;
let intersectionGreenYellow,
  intersectionGreenOrange,
  intersectionRedDeviationGreen;

let intersectionX_BlueYellow, intersectionY_BlueYellow;
let intersectionX_BlueOrange, intersectionY_BlueOrange;
let intersectionX_BluePurpleDev, intersectionY_BluePurpleDev;
let intersectionX_LightbluePurple, intersectionY_LightbluePurple;
let intersectionX_LightblueRed, intersectionY_LightblueRed;
let intersectionX_LightblueGreen, intersectionY_LightblueGreen;
let intersectionX_GreenYellow, intersectionY_GreenYellow;
let intersectionX_GreenOrange, intersectionY_GreenOrange;
let intersectionX_RedDevGreen, intersectionY_RedDevGreen;

// --- SETUP ---
function setupSplash() {
  let container = getContentContainer();
  if (!container) return;

  let w = container.elt.clientWidth || windowWidth;
  let h = container.elt.clientheight || windowHeight;

  let cnv = createCanvas(w, h);
  cnv.parent(container);
  cnv.style("position", "absolute");
  cnv.style("inset", "0");
  cnv.style("z-index", "0");

  resetSplashVariables(w, h);
  animStartTime = millis();

  createSplashUI(container);

  background(255);
  textFont("Underground");
}

// --- INIT VARIABLES ---
function resetSplashVariables(w, h) {
  btnVisible = false;
  linesStopped = false;
  centerPoint = w / 2; // Salvataggio centro, solo per il cerchio visivo

  currentSpeed = w * 0.004; // Velocità ottimizzata
  if (currentSpeed < 3) currentSpeed = 3;

  // Reset Green
  x1green = 0;
  y1green = 0;
  x2green = 0;
  y2green = 0;

  // Reset Yellow
  x1yellow = 0;
  y1yellow = 0;
  x2yellow = 0;
  y2yellow = 0;

  // Reset Orange
  x1orange = 0;
  y1orange = 0;
  x2orange = 0;
  y2orange = 0;

  // Reset Lightblue
  x1lightblue = 0;
  y1lightblue = 0;
  x2lightblue = 0;
  y2lightblue = 0;

  // --- RESET BLU (Alto - simile alla posizione Rossa ma specchiata in alto) ---
  segmentBlue = 1;
  stopXFractionBlue = 0.25;
  stopXBlue = w * stopXFractionBlue;
  let fixedYBlue = h / 4.5; // 25% dall'alto (Speculare alla Rossa che è 25% dal basso)
  x1blue = 0;
  y1blue = 0;
  x2blue = 0;
  y2blue = 0;
  x1blueDeviation = stopXBlue;
  y1blueDeviation = fixedYBlue;
  x2blueDeviation = stopXBlue;
  y2blueDeviation = fixedYBlue;

  // Reset Red
  segmentRed = 1;
  stopXFractionRed = 4 / 5;
  stopXRed = w * stopXFractionRed;
  let fixedYRed = (h * 3) / 4;
  x1red = 0;
  x1redDeviation = stopXRed;
  y1redDeviation = fixedYRed;
  x2redDeviation = stopXRed;
  y2redDeviation = fixedYRed;

  // --- RESET VIOLA (Altissimo - simile alla posizione Verde ma specchiata in alto) ---
  segmentPurple = 1;
  stopXFractionPurple = 0.35;
  stopXPurple = w * stopXFractionPurple;
  let fixedYPurple = h / 6.5; // ~16% dall'alto (Speculare alla Verde che è ~14% dal basso)
  x1purple = 0;
  x1purpleDeviation = stopXPurple;
  y1purpleDeviation = fixedYPurple;
  x2purpleDeviation = stopXPurple;
  y2purpleDeviation = fixedYPurple;

  intersectionBlueYellow = false;
  intersectionBlueOrange = false;
  intersectionBluePurpleDeviation = false;
  intersectionLightbluePurple = false;
  intersectionLightblueRed = false;
  intersectionLightblueGreen = false;
  intersectionGreenYellow = false;
  intersectionGreenOrange = false;
  intersectionRedDeviationGreen = false;

  calculateIntersections(w, h);
}

function calculateIntersections(w, h) {
  let fixedYPurple = h / 6.5; // Viola (Alto)
  let fixedYBlue = h / 4.5; // Blu (Medio-Alto)

  let fixedYRed = (h * 3) / 4;
  let fixedYGreen = (h * 6) / 7;

  let fixedXYellow = w / 5;
  let fixedXOrange = w / 8;
  let fixedXLightblue = (w * 5) / 6;

  intersectionX_BlueYellow = fixedXYellow;
  intersectionY_BlueYellow = fixedYBlue;

  intersectionX_BlueOrange = fixedXOrange;
  intersectionY_BlueOrange = fixedYBlue;

  intersectionX_LightbluePurple = fixedXLightblue;
  intersectionY_LightbluePurple = fixedYPurple;

  intersectionX_LightblueRed = fixedXLightblue;
  intersectionY_LightblueRed = fixedYRed;

  intersectionX_LightblueGreen = fixedXLightblue;
  intersectionY_LightblueGreen = fixedYGreen;

  intersectionX_GreenYellow = fixedXYellow;
  intersectionY_GreenYellow = fixedYGreen;

  intersectionX_GreenOrange = fixedXOrange;
  intersectionY_GreenOrange = fixedYGreen;

  // --- CALCOLO INTERSEZIONE GEOMETRICA BLU/VIOLA ---
  // Blu: sale verso destra (y = -x + c1)
  // Viola: sale verso sinistra (y = x + c2)
  // Risolvendo il sistema lineare per le due diagonali:
  intersectionX_BluePurpleDev =
    (stopXBlue + stopXPurple + fixedYBlue - fixedYPurple) / 2;
  // Calcoliamo la Y sostituendo la X nell'equazione della viola (y = x - xStart + yStart)
  intersectionY_BluePurpleDev =
    intersectionX_BluePurpleDev - stopXPurple + fixedYPurple;

  intersectionY_RedDevGreen = fixedYGreen;
  intersectionX_RedDevGreen = fixedYRed + stopXRed - fixedYGreen;
}

// Interfaccia utente
function createSplashUI(container) {
  splashUIContainer = createDiv();
  splashUIContainer.parent(container);

  splashUIContainer.class(
    "absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center h-full w-full"
  );

  // TITOLO
  titleElem = createElement("h1", "WORLD<br />METRO");
  titleElem.parent(splashUIContainer);
  titleElem.style("opacity", "0");
  titleElem.class(
    "font-underground font-semibold leading-tight text-4xl md:text-6xl lg:text-8xl select-none text-center text-neutral-900 mb-4 transition-opacity duration-1000 ease-out"
  );

  // DESCRIZIONE
  descElem = createP(
    "<br>Explore the complexity and history of the underground.<br>Watch metro lines transform, connect<br>and cities transform over time and space."
  );
  descElem.parent(splashUIContainer);
  descElem.style("opacity", "0");
  descElem.class(
    "text-center max-w-lg px-4 text-neutral-600 mb-8 font-medium leading-relaxed transition-opacity duration-1000 ease-out"
  );

  // BOTTONE
  exploreBtn = createDiv();
  exploreBtn.parent(splashUIContainer);
  exploreBtn.id("explore-btn");
  exploreBtn.style("opacity", "0");
  exploreBtn.style("visibility", "hidden");
  exploreBtn.style("position", "absolute");
  exploreBtn.style("bottom", "18%"); 
  
  exploreBtn.class(
    "group pointer-events-auto ease-out flex flex-col items-center cursor-pointer hover:-translate-y-2"
  );

  let btnContent = `
        <div class="bg-[#0f1014] text-white font-underground font-bold tracking-widest uppercase px-6 py-3 rounded-xl shadow-xl border-neutral-900 group-hover:bg-white border-4 group-hover:text-neutral-900 group-hover:border-neutral-900 group-hover:border-4 transition-colors duration-300 flex items-center justify-center text-sm md:text-base whitespace-nowrap leading-none">
            <span class="pt-[2px]">EXPLORE</span>
            <svg class="h-4 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:ml-2 transition-[width,opacity,margin] duration-300 self-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </div>
        <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[14px] border-t-[#0f1014] mt-[-1px] z-30 transition-colors duration-300"></div>
    `;
  exploreBtn.html(btnContent);

  exploreBtn.mouseClicked(() => {
    if (mouseButton === LEFT && btnVisible) changeState("HOME");
  });
}

// --- DRAW LOOP ---
function drawSplash() {
  background(255);

  let w = width;
  let h = height;
  let elapsed = millis() - animStartTime;

  // --- LOGICA STOP OTTIMIZZATA ---
  // Verifica che TUTTE le linee abbiano completato il loro percorso
  // La verde deve finire la larghezza, le verticali devono finire l'altezza
  let greenFinished = x1green >= w;
  let yellowFinished = y2yellow >= h;
  let orangeFinished = y1orange >= h;
  let lightblueFinished = y1lightblue >= h;

  if (
    !linesStopped &&
    greenFinished &&
    yellowFinished &&
    orangeFinished &&
    lightblueFinished
  ) {
    linesStopped = true;
  }

  let spd = linesStopped ? 0 : currentSpeed;

  // --- SEQUENZA TESTI ---

  // TITOLO (Dopo 1 secondo)
  if (elapsed > 400) {
    if (titleElem) titleElem.style("opacity", "1");
  }

  // DESCRIZIONE (Dopo 2 secondi)
  if (elapsed > 1200) {
    if (descElem) descElem.style("opacity", "1");
  }

  // BOTTONE (SOLO QUANDO FERMO)
  if (linesStopped && !btnVisible) {
    if (exploreBtn) {
      exploreBtn.addClass("transition duration-500");
      exploreBtn.style("visibility", "visible");
      exploreBtn.style("opacity", "1");
    }
    btnVisible = true;
  }

  // --- DISEGNO LINEE ---

  let fixedYGreen = (h * 6) / 7;
  let fixedXYellow = w / 5;
  let fixedXOrange = w / 8;
  let fixedXLightblue = (w * 5) / 6;
  let fixedYRed = (h * 3) / 4;

  // Altezze aggiornate
  let fixedYPurple = h / 6.5;
  let fixedYBlue = h / 4.5;

  push();
  stroke("#1aa713ff");
  strokeWeight(14);
  line(x1green, y1green + fixedYGreen, x2green, y2green + fixedYGreen);
  x1green += spd;
  pop();

  push();
  stroke("#ffea00ff");
  strokeWeight(14);
  line(x1yellow + fixedXYellow, y1yellow, x2yellow + fixedXYellow, y2yellow);
  y2yellow += spd;
  pop();

  push();
  stroke("#ff6a00ff");
  strokeWeight(14);
  line(x1orange + fixedXOrange, h, x2orange + fixedXOrange, h - y1orange);
  y1orange += spd;
  pop();

  push();
  stroke("#00ccffff");
  strokeWeight(14);
  line(
    x1lightblue + fixedXLightblue,
    y1lightblue,
    x2lightblue + fixedXLightblue,
    y2lightblue
  );
  y1lightblue += spd;
  pop();

  push();
  stroke("#000dffff");
  strokeWeight(15);
  line(0, fixedYBlue, x1blue, fixedYBlue);
  if (segmentBlue === 1) {
    if (x1blue < stopXBlue) x1blue += spd;
    else {
      x1blue = stopXBlue;
      segmentBlue = 2;
    }
  }
  if (segmentBlue === 2) {
    line(x1blueDeviation, y1blueDeviation, x2blueDeviation, y2blueDeviation);
    x2blueDeviation += spd * 0.9;
    y2blueDeviation -= spd * 0.9; // Sale (y diminuisce)
  }
  pop();

  push();
  stroke("#df0e0eff");
  strokeWeight(14);
  line(w, fixedYRed, w - x1red, fixedYRed);
  if (segmentRed === 1) {
    if (x1red < w - stopXRed) x1red += spd;
    else {
      x1red = w - stopXRed;
      segmentRed = 2;
    }
  }
  if (segmentRed === 2) {
    line(x1redDeviation, y1redDeviation, x2redDeviation, y2redDeviation);
    x2redDeviation -= spd * 0.9;
    y2redDeviation += spd * 0.9;
  }
  pop();

  push();
  stroke("#880addff");
  strokeWeight(14);
  line(w, fixedYPurple, w - x1purple, fixedYPurple);
  if (segmentPurple === 1) {
    if (x1purple < w - stopXPurple) x1purple += spd;
    else {
      x1purple = w - stopXPurple;
      segmentPurple = 2;
    }
  }
  if (segmentPurple === 2) {
    line(
      x1purpleDeviation,
      y1purpleDeviation,
      x2purpleDeviation,
      y2purpleDeviation
    );
    x2purpleDeviation -= spd * 0.9;
    y2purpleDeviation -= spd * 0.9; // Sale (y diminuisce)
  }
  pop();

  // --- CERCHIO VISIVO AL CENTRO (Sempre attivo se la linea ci è passata) ---
  if (x1green >= centerPoint) {
    push();
    stroke("#000000ff");
    strokeWeight(4);
    fill(255);
    circle(centerPoint, fixedYGreen, 24);
    pop();
  }

  drawIntersections(h, w);
}

function drawIntersections(h, w) {
  function drawCircle(x, y) {
    push();
    stroke("#000000ff");
    strokeWeight(4);
    fill(255);
    circle(x, y, 24);
    pop();
  }

  if (
    !intersectionBlueYellow &&
    x1blue >= intersectionX_BlueYellow &&
    y2yellow >= intersectionY_BlueYellow
  )
    intersectionBlueYellow = true;
  if (intersectionBlueYellow)
    drawCircle(intersectionX_BlueYellow, intersectionY_BlueYellow);

  if (
    !intersectionBlueOrange &&
    x1blue >= intersectionX_BlueOrange &&
    h - y1orange <= intersectionY_BlueOrange
  )
    intersectionBlueOrange = true;
  if (intersectionBlueOrange)
    drawCircle(intersectionX_BlueOrange, intersectionY_BlueOrange);

  if (
    !intersectionLightbluePurple &&
    y1lightblue >= intersectionY_LightbluePurple &&
    w - x1purple <= intersectionX_LightbluePurple
  )
    intersectionLightbluePurple = true;
  if (intersectionLightbluePurple)
    drawCircle(intersectionX_LightbluePurple, intersectionY_LightbluePurple);

  if (
    !intersectionLightblueRed &&
    y1lightblue >= intersectionY_LightblueRed &&
    w - x1red <= intersectionX_LightblueRed
  )
    intersectionLightblueRed = true;
  if (intersectionLightblueRed)
    drawCircle(intersectionX_LightblueRed, intersectionY_LightblueRed);

  if (
    !intersectionLightblueGreen &&
    y1lightblue >= intersectionY_LightblueGreen &&
    x1green >= intersectionX_LightblueGreen
  )
    intersectionLightblueGreen = true;
  if (intersectionLightblueGreen)
    drawCircle(intersectionX_LightblueGreen, intersectionY_LightblueGreen);

  if (
    !intersectionGreenYellow &&
    x1green >= intersectionX_GreenYellow &&
    y2yellow >= intersectionY_GreenYellow
  )
    intersectionGreenYellow = true;
  if (intersectionGreenYellow)
    drawCircle(intersectionX_GreenYellow, intersectionY_GreenYellow);

  if (
    !intersectionGreenOrange &&
    x1green >= intersectionX_GreenOrange &&
    h - y1orange <= intersectionY_GreenOrange
  )
    intersectionGreenOrange = true;
  if (intersectionGreenOrange)
    drawCircle(intersectionX_GreenOrange, intersectionY_GreenOrange);

  let isBlueDevActive =
    segmentBlue === 2 &&
    x2blueDeviation >= intersectionX_BluePurpleDev &&
    y2blueDeviation <= intersectionY_BluePurpleDev;
  let isPurpleDevActive =
    segmentPurple === 2 &&
    x2purpleDeviation <= intersectionX_BluePurpleDev &&
    y2purpleDeviation <= intersectionY_BluePurpleDev;

  if (!intersectionBluePurpleDeviation && isBlueDevActive && isPurpleDevActive)
    intersectionBluePurpleDeviation = true;
  if (intersectionBluePurpleDeviation)
    drawCircle(intersectionX_BluePurpleDev, intersectionY_BluePurpleDev);

  let isRedDevActive =
    segmentRed === 2 &&
    x2redDeviation <= intersectionX_RedDevGreen &&
    y2redDeviation >= intersectionY_RedDevGreen;

  if (
    !intersectionRedDeviationGreen &&
    isRedDevActive &&
    x1green >= intersectionX_RedDevGreen
  )
    intersectionRedDeviationGreen = true;
  if (intersectionRedDeviationGreen)
    drawCircle(intersectionX_RedDevGreen, intersectionY_RedDevGreen);
}

function resizeSplash() {
  let container = getContentContainer();
  if (container) {
    let w = container.elt.clientWidth || windowWidth;
    let h = container.elt.clientHeight || windowHeight;
    resizeCanvas(w, h);
    resetSplashVariables(w, h);
  }
}

function removeSplash() {
  noCanvas();
  if (splashUIContainer) {
    splashUIContainer.remove();
    splashUIContainer = null;
  }
  titleElem = null;
  descElem = null;
  exploreBtn = null;
}
