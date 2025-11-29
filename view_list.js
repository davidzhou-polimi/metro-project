function creaListaCitta() {
    vistaAttuale = "lista";
    appState.activeCityId = null;
    stopAnimation();

    if (window.history.pushState) {
        let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newurl }, "", newurl);
    }

    if (mappa) {
        mappa.remove();
        mappa = null;
    }
    if (mappaContainer) mappaContainer.remove();

    let container = select("#app-container");
    container.html("");

    let headerDiv = createDiv().parent(container).class("mb-8 border-b border-slate-200 pb-4");
    createElement("h1", "METROPOLITANE DEL MONDO").parent(headerDiv).class("text-4xl font-extrabold text-slate-900 tracking-tight");

    let controlsDiv = createDiv().parent(headerDiv).class("mt-4 flex flex-col sm:flex-row gap-4 justify-between items-end");

    let searchWrapper = createDiv().parent(controlsDiv).class("w-full sm:w-1/2");
    createSpan("Cerca Città").parent(searchWrapper).class("block text-xs font-bold text-slate-400 uppercase mb-1");
    let searchInput = createInput("").parent(searchWrapper);
    searchInput.attribute("placeholder", "Es. Milan, London, Tokyo...");
    searchInput.class("w-full p-3 rounded border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all");

    let countLabel = createSpan(`(${db.cities.length} reti disponibili)`).parent(controlsDiv).class("text-slate-500 text-sm mb-3");

    let listContainer = createDiv().parent(container).class("grid grid-cols-2 md:grid-cols-4 gap-4");

    const renderList = (filterText) => {
        listContainer.html("");
        let filteredCities = db.cities;
        if (filterText) {
            let t = filterText.toLowerCase();
            filteredCities = db.cities.filter(
                (c) => c.name.toLowerCase().includes(t) || c.country.toLowerCase().includes(t)
            );
        }
        filteredCities.sort((a, b) => a.name.localeCompare(b.name));
        countLabel.html(`(${filteredCities.length} reti trovate)`);

        if (filteredCities.length === 0) {
            createDiv("Nessuna città trovata.").parent(listContainer).class("text-slate-400 italic p-4 col-span-2 text-center");
            return;
        }

        for (let city of filteredCities) {
            let card = createDiv().parent(listContainer);
            card.class("bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-200 group");
            createElement("h3", city.name).parent(card).class("text-lg font-bold text-slate-800 group-hover:text-indigo-600");
            createElement("p", city.country).parent(card).class("text-sm text-slate-500 uppercase tracking-wider font-semibold mt-1");
            card.mousePressed(() => inizializzaMappa(city));
        }
    };

    renderList("");
    searchInput.input(() => renderList(searchInput.value()));
}