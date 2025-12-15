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
    app.class("min-h-svh flex flex-col font-sans");

    // 2. CREAZIONE HEADER (Navbar) - Salviamo il riferimento globale
    layout.header = createDiv().parent(app).id("app-header");
    layout.header.class(
        "sticky top-0 z-50 w-full bg-white border-b-4 border-neutral-900"
    );

    // 3. CREAZIONE MAIN CONTENT (Il "Buco")
    layout.main = createDiv().parent(app).id("main-content");
    layout.main.class(
        "flex-grow w-full relative min-h-[calc(100svh-5rem)] mx-auto p-4 md:p-8"
    );

    // 4. CREAZIONE FOOTER
    // Creazione del contenitore principale footer
    layout.footer = createDiv().parent(app).id("app-footer");

    // Applicazione delle classi per il contenitore esterno
    // Nota: Ho messo border-t-4 e border-neutral-900 per riprendere lo stile dell'header
    layout.footer.class(
        "w-full bg-white border-t-4 border-neutral-900 mt-auto text-sm text-neutral-600"
    );

    // Definizione del contenuto HTML interno
    let footerContent = `
<div class="mx-auto px-4 md:px-8 py-10 max-w-screen-2xl">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        
        <div class="flex flex-col gap-3">
            <h4 class="font-semibold text-neutral-800 uppercase tracking-widest text-xs">Course</h4>
            <div class="space-y-1">
                <p class="font-semibold text-neutral-900">Computer Graphics Studio<br>for Information Design</p>
                <p>A.Y. 2025/2026</p>
                <p>
                    <a href="https://www.designdellacomunicazione.polimi.it/en/ddc-eng/"
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="underline decoration-neutral-400 text-neutral-500 hover:text-neutral-800 transition-colors">
                        Bachelor's Degree<br>in Communication Design
                    </a>
                </p>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <h4 class="font-semibold text-neutral-800 uppercase tracking-widest text-xs">Project by</h4>
            <ul class="space-y-1">
                <li></li>
                <li>Michele Lucio Basso</li>
                <li>Emma Della Valle</li>
                <li>Mathias Favre</li>
                <li>Chiara Fois</li>
                <li>Viola Naldi</li>
                <li>David Zhou</li>
            </ul>
        </div>

        <div class="flex flex-col gap-8">
            <div class="flex flex-col gap-3">
                <h4 class="font-semibold text-neutral-800 uppercase tracking-widest text-xs">Faculty</h4>
                <ul class="space-y-1">
                    <li>Michele Mauri</li>
                    <li>Davide Conficconi</li>
                </ul>
            </div>
            <div class="flex flex-col gap-3">
                <h4 class="font-semibold text-neutral-800 uppercase tracking-widest text-xs">Teaching Assistants</h4>
                <ul class="space-y-1">
                    <li>Alessandra Facchin</li>
                    <li>Alessandro Nazzari</li>
                </ul>
            </div>
        </div>

        <div class="flex flex-col justify-between gap-8">
            
            <div class="grid grid-cols-[1fr_2fr] gap-2 max-w-[300px] md:max-w-full items-center">
                <img src="assets/images/densitydesign_N.svg" alt="DensityDesign Lab" class="w-full h-auto object-contain">
                <img src="assets/images/NECST_N.svg" alt="NECTS" class="w-full h-auto object-contain">
            </div>

            <div class="text-sm text-neutral-500 mt-auto">
                <p>
                    &copy; 2025 World Metro. Licensed under
                    <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline hover:text-neutral-800 transition-colors"
                        title="Creative Commons Attribution 4.0 International"
                    >
                        CC BY 4.0
                    </a>
                </p>
            </div>
        </div>

    </div>
</div>
    `;

    // Iniezione del contenuto HTML nel footer
    layout.footer.html(footerContent);

    console.log("LAYOUT: Struttura creata e salvata in globale.");
}

function getContentContainer() {
    // Restituisce il contenitore globale.
    // SE È NULLO (qualcuno l'ha cancellato), LO RICREA AL VOLO.
    if (!layout.main) {
        console.warn(
            "ATTENZIONE: Il layout è stato cancellato per errore. Ripristino in corso..."
        );
        initializeLayout();
    }
    return layout.main;
}
