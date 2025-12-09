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
    layout.main.class("flex-grow w-full relative max-w-7xl mx-auto p-4 md:p-8");

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