// modules/navbar/navbar.js

function setupNavbar() {
    // Div creato dal layout
    let headerContainer = select("#app-header");
    headerContainer.html(""); // Pulizia preventiva
    
    let content = createDiv().parent(headerContainer);
    content.class("mx-auto px-8 md:px-12 h-[4.5rem] flex items-center justify-between relative");
    
    btnBack = createButton(backIcon);
    btnBack.parent(content).class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnBack.mousePressed(() => changeState('HOME'));

    // Logo / Home Link
    let logo = createButton("WORLD METRO").parent(content);
    logo.class("mt-1 absolute left-1/2 -translate-x-1/2 text-4xl font-black tracking-tight text-neutral-900 no-underline cursor-default outline-none leading-[0.8]");
    logo.mousePressed((e) => {
        e.preventDefault(); // Evita ricaricamento pagina
        //changeState('HOME');
    });

    // Menu destra
    let menu = createDiv().parent(content).class("flex justify-end gap-4 text-sm font-bold text-neutral-500");
    
    let btnHome = createButton(homeIcon).parent(menu);
    btnHome.class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnHome.mousePressed((e) => {
        e.preventDefault();
        changeState('HOME');
    });

    let btnAbout = createButton(aboutIcon).parent(menu);
    btnAbout.class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer p-2");
    btnAbout.mousePressed((e) => {
        e.preventDefault();
        changeState('ABOUT');
    });
}

function drawNavbar() {}