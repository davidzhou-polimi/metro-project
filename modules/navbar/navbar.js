// modules/navbar/navbar.js

function setupNavbar() {
    // Invece di creare un div nel nulla, prendiamo quello creato dal layout
    let headerContainer = select("#app-header");
    headerContainer.html(""); // Pulizia preventiva
    
    let content = createDiv().parent(headerContainer);
    content.class("max-w-7xl mx-auto px-4 h-16 flex items-center justify-between");
    
    // Logo / Home Link
    let logo = createA("#", "Metro World").parent(content);
    logo.class("text-xl font-black tracking-tighter text-indigo-600 hover:text-indigo-500 no-underline");
    logo.mousePressed((e) => {
        e.preventDefault(); // Evita il ricaricamento pagina
        changeState('HOME');
    });

    // Menu destra
    let menu = createDiv().parent(content).class("flex gap-4 text-sm font-bold text-slate-500");
    
    let btnAbout = createA("#", "About").parent(menu);
    btnAbout.class("hover:text-indigo-600 transition-colors");
    btnAbout.mousePressed((e) => {
        e.preventDefault();
        changeState('ABOUT');
    });
}

function drawNavbar() {}