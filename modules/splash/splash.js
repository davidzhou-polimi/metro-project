// modules/splash/splash.js

let splashButton;

function setupSplash() {
    // 1. CREIAMO IL CANVAS DINAMICAMENTE
    let container = getContentContainer();

    if (!container) return;

    let w = container.elt.offsetWidth || windowWidth;
    let h = container.elt.offsetHeight || windowHeight;

    // 2. Creazione Canvas
    let cnv = createCanvas(w, h);
    cnv.parent(container);
    cnv.style('position', 'absolute');
    cnv.style('top', '0');
    cnv.style('left', '0');
    cnv.style('z-index', '0'); // Sfondo
    
    // 3. Creazione Pulsante HTML (al posto dello spinner)
    splashButton = createButton("ENTER METRO WORLD");
    splashButton.parent(container);
    
    // Stile del pulsante (Tailwind + posizionamento assoluto al centro)
    splashButton.class("absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all z-10 tracking-widest text-sm");
    
    // Azione del pulsante
    splashButton.mousePressed(() => {
        changeState('HOME');
    });

    // Reset animazione p5
    background(20);
}

function drawSplash() {
    // Esempio animazione sfondo (lenta e sottile)
    background(20, 20, 30, 20); // Scia
    
    noStroke();
    fill(100, 100, 255, 150);
    
    // Disegna qualcosa che si muove
    let t = frameCount * 0.01;
    let x = width / 2 + cos(t) * (width * 0.3);
    let y = height / 2 + sin(t * 1.3) * (height * 0.3);
    ellipse(x, y, 5, 5);
}

function removeSplash() {
    // Rimuovi canvas
    noCanvas();
    
    // IMPORTANTE: Rimuovi anche il pulsante se esiste
    if (splashButton) {
        splashButton.remove();
        splashButton = null;
    }
}