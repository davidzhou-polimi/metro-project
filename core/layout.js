// core/layout.js

function initializeLayout() {
    console.log("LAYOUT: Creazione struttura fissa...");
    
    let app = select("#app-container");
    if (!app) {
        console.error("ERRORE CRITICO: #app-container non trovato nell'HTML!");
        return;
    }

    // 1. Reset Pulito: Svuota tutto UNA VOLTA SOLA all'avvio
    app.html(""); 
    app.class("min-h-screen flex flex-col font-sans bg-gray-50");

    // 2. CREAZIONE HEADER (Navbar) - Salviamo il riferimento globale
    layout.header = createDiv().parent(app).id("app-header");
    layout.header.class("sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300");

    // 3. CREAZIONE MAIN CONTENT (Il "Buco")
    layout.main = createDiv().parent(app).id("main-content");
    layout.main.class("flex-grow w-full relative"); 

    // 4. CREAZIONE FOOTER
    layout.footer = createDiv().parent(app).id("app-footer");
    layout.footer.class("py-6 text-center text-slate-400 text-xs border-t border-slate-200 mt-auto");
    layout.footer.html("&copy; 2025 Metro World Group 4 - Design by Polimi");
    
    console.log("LAYOUT: Struttura creata e salvata in globale.");
}

function getContentContainer() {
    // Restituisce il contenitore globale. 
    // SE È NULLO (qualcuno l'ha cancellato), LO RICREA AL VOLO.
    if (!layout.main) {
        console.warn("ATTENZIONE: Il layout è stato cancellato per errore. Ripristino in corso...");
        initializeLayout();
    }
    return layout.main;
}

function setLayoutMode(mode) {
    // Usa la funzione sicura che rigenera il layout se manca
    let main = getContentContainer(); 
    let header = layout.header;

    if (!main || !header) return; // Protezione finale

    if (mode === 'FULLSCREEN') {
        // Modalità Mappa: Tutto schermo
        main.class("flex-grow w-full h-[calc(100vh-60px)] relative");
        if(header) header.removeClass("shadow-sm");
    } else {
        // Modalità Standard: Margini e contenuto centrato
        main.class("flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 relative");
        if(header) header.addClass("shadow-sm");
    }
}