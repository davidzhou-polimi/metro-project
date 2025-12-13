// modules/navbar/navbar.js

function setupNavbar() {
    // Invece di creare un div nel nulla, prendiamo quello creato dal layout
    let headerContainer = select("#app-header");
    headerContainer.html(""); // Pulizia preventiva
    
    let content = createDiv().parent(headerContainer);
    content.class("mx-auto px-4 md:px-8 h-16 flex items-center justify-between");
    
    let btnBack = createButton("Torna indietro");
    btnBack.parent(content).class("bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 font-medium transition-colors text-sm");
    btnBack.mousePressed(() => changeState('HOME'));

    // Logo / Home Link
    let logo = createButton("World Metro").parent(content);
    logo.class("text-xl font-black tracking-tighter text-neutral-700 hover:text-neutral-500 no-underline");
    logo.mousePressed((e) => {
        e.preventDefault(); // Evita il ricaricamento pagina
        changeState('HOME');
    });

    // Menu destra
    let menu = createDiv().parent(content).class("flex-1 flex justify-end gap-4 text-sm font-bold text-slate-500");
    
    let btnHome = createButton("Home").parent(menu);
    btnHome.class("hover:text-neutral-600 transition-colors");
    btnHome.mousePressed((e) => {
        e.preventDefault();
        changeState('HOME');
    });

    let btnAbout = createButton("About").parent(menu);
    btnAbout.class("hover:text-neutral-600 transition-colors");
    btnAbout.mousePressed((e) => {
        e.preventDefault();
        changeState('ABOUT');
    });
}

function drawNavbar() {}