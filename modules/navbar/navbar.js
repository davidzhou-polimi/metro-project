// modules/navbar/navbar.js

function setupNavbar() {
    // Div creato dal layout
    let headerContainer = select("#app-header");
    headerContainer.html(""); // Pulizia preventiva
    
    let content = createDiv().parent(headerContainer);
    content.class("mx-auto px-4 md:px-8 h-[4.5rem] flex items-center justify-between relative");
    
    btnBack = createButton(icons.back);
    btnBack.parent(content).class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-white transition-colors cursor-pointer p-2");
    btnBack.mouseClicked(() => {
        if (mouseButton === LEFT) changeState('HOME');
    });

    // Logo / Home Link
    let logo = createButton("WORLD METRO").parent(content);
    logo.class("mt-1 absolute left-1/2 -translate-x-1/2 z-20 text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 hover:text-neutral-600 transition-colors no-underline cursor-pointer outline-none leading-[0.9] md:leading-[0.8]");
    logo.mouseClicked((e) => {
        if (mouseButton !== LEFT) return;
        e.preventDefault(); 
        changeState('SPLASH'); 
    });

    // Menu destra
    let menu = createDiv().parent(content).class("flex justify-end gap-2 md:gap-3 text-sm font-bold text-neutral-500");
    
    let btnHome = createButton(icons.home).parent(menu);
    btnHome.class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-white transition-colors cursor-pointer p-2");
    btnHome.mouseClicked((e) => {
        if (mouseButton !== LEFT) return;
        e.preventDefault();
        changeState('HOME');
    });

    let btnAbout = createButton(icons.about).parent(menu);
    btnAbout.class("relative z-10 rounded-full bg-neutral-900 hover:bg-neutral-700 text-white transition-colors cursor-pointer p-2");
    btnAbout.mouseClicked((e) => {
        if (mouseButton !== LEFT) return;
        e.preventDefault();
        changeState('ABOUT');
    });
}

function drawNavbar() {}