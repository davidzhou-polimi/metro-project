// modules/navbar/navbar.js

function setupNavbar() {
    // Invece di creare un div nel nulla, prendiamo quello creato dal layout
    let headerContainer = select("#app-header");
    headerContainer.html(""); // Pulizia preventiva
    
    let content = createDiv().parent(headerContainer);
    content.class("mx-auto px-4 md:px-8 h-20 flex items-center justify-between relative");
    
    btnBack = createButton(backIcon);
    btnBack.parent(content).class("rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnBack.mousePressed(() => changeState('HOME'));

    // Logo / Home Link
    let logo = createButton("WORLD METRO").parent(content);
    logo.class("absolute left-1/2 -translate-x-1/2 text-4xl font-black tracking-tight text-neutral-900 no-underline cursor-default"); // hover:text-neutral-600
    logo.mousePressed((e) => {
        e.preventDefault(); // Evita il ricaricamento pagina
        //changeState('HOME');
    });

    // Menu destra
    let menu = createDiv().parent(content).class("flex justify-end gap-4 text-sm font-bold text-neutral-500");
    
    let btnHome = createButton(homeIcon).parent(menu);
    btnHome.class("rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnHome.mousePressed((e) => {
        e.preventDefault();
        changeState('HOME');
    });

    let btnAbout = createButton(aboutIcon).parent(menu);
    btnAbout.class("rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnAbout.mousePressed((e) => {
        e.preventDefault();
        changeState('ABOUT');
    });
}

function drawNavbar() {}