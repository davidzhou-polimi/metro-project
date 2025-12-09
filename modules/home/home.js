// modules/home/home.js

function setupHome() {
    // 2. Ottieni il contenitore "sicuro"
    let container = getContentContainer();
    container.html("");
    document.title = "Metro World";

    // Layout principale
    let wrapper = createDiv().parent(container);
    
    createElement("h1", "Seleziona una città").parent(wrapper)
        .class("text-4xl font-black text-slate-800 mb-8 text-center tracking-tight");

    let grid = createDiv().parent(wrapper)
        .class("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6");

    // Verifica che i dati siano caricati
    if (typeof db !== 'undefined' && db.cities) {
        let sortedCities = db.cities.sort((a, b) => a.name.localeCompare(b.name));

        for (let city of sortedCities) {
            let card = createDiv().parent(grid)
                .class("bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden");
            
            // LOGICA NUOVA: Chiama changeState
            card.mousePressed(() => {
                changeState('MAP', city.id);
            });

            createElement("h3", city.name).parent(card)
                .class("text-xl font-bold text-slate-700 group-hover:text-indigo-600 mb-1");
            createSpan(city.country).parent(card)
                .class("text-xs font-bold text-slate-400 uppercase tracking-wider");
            createDiv().parent(card).class("absolute bottom-0 left-0 h-1 bg-indigo-500 w-0 group-hover:w-full transition-all duration-300");
        }
    } else {
        createP("Attendi caricamento dati...").parent(wrapper).class("text-center text-slate-400");
    }
}

// Funzioni accessorie richieste dal Router
function drawHome() {} // Vuoto perché usiamo HTML

function removeHome() {
    let container = getContentContainer();
    container.html("");
}