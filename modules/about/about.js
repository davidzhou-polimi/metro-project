// modules/about/about.js

let aboutContainer = null;

// Dati del team (usando i percorsi immagini e dati dal tuo HTML)
const TEAM_MEMBERS = [
    {
        surname: "BASSO", name: "MICHELE LUCIO",
        img: "assets/images/cavallo.jpg", email: "michelelucio.basso@mail.polimi.it",
        side: "left"
    },
    {
        surname: "DELLA VALLE", name: "EMMA",
        img: "assets/images/cavallo.jpg", email: "emma.dellavalle@mail.polimi.it",
        side: "right"
    },
    {
        surname: "FAVRE", name: "MATHIAS",
        img: "assets/images/cavallo.jpg", email: "mathias.favre@mail.polimi.it",
        side: "left"
    },
    {
        surname: "FOIS", name: "CHIARA",
        img: "assets/images/cavallo.jpg", email: "chiara.fois@mail.polimi.it",
        side: "right"
    },
    {
        surname: "NALDI", name: "VIOLA",
        img: "assets/images/cavallo.jpg", email: "viola.naldi@mail.polimi.it",
        side: "left"
    },
    {
        surname: "ZHOU", name: "DAVID",
        img: "assets/images/cavallo.jpg", email: "david.zhou@mail.polimi.it",
        side: "right"
    }
];

function setupAbout() {
    let parent = getContentContainer();
    parent.html("");
    parent.style('height', 'auto');
    parent.style('display', 'block');
    parent.style('overflow', 'non-visible');
    document.title = "About - World Metro";

    // Container Principale
    aboutContainer = createDiv().parent(parent).class("w-full max-w-[900px] mx-auto py-10 px-5 relative");

    // --- 1. INTRO BOXES ---
    let introWrapper = createDiv().parent(aboutContainer).class("flex flex-col md:flex-row justify-center z-10 gap-10 relative max-w-[1200px] mx-auto pb-10");

    createTopInfoBox(introWrapper, "WHERE HAVE WE GOTTEN THE DATA?", 
        "The data used to display information comes from the Citylines project, collecting information on urban transportation networks in cities around the world.<br><br>The creator is Bruno Salerno, engineer graduated in Transport and Geoinformation Technology at KTH Stockholm, currently a Senior Software Engineer for Citymapper.");

    createTopInfoBox(introWrapper, "WHAT IS THE PROJECT ABOUT?", 
        "This page wants to show users the presence and extension of subway lines in the world.<br><br>Clicking on a city, you can view the entire map of the subway system and the construction history of its stations and lines, understanding the changes over the years.");


    // --- 2. METRO WRAPPER ---
    let metroWrapper = createDiv().parent(aboutContainer).class("relative w-full -mt-[60px]");

    // SVG Linea Metro (Background)
    let svgContent = `<svg class="absolute top-0 left-0 w-full h-[3300px] z-0 pointer-events-none overflow-visible" viewBox="0 0 900 3300" preserveAspectRatio="none"><path d="M820-500V50q0 40-40 40H140q-80 0-80 80v80q0 80 80 80h270q40 0 40 50v2000q0 100 100 100h230q40 0 40 40v980" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="450" cy="90" r="9" stroke="#000" stroke-width="4" fill="#fff"/></svg>`;
    metroWrapper.html(svgContent);

    // Sezione "WHO ARE WE?" 
    let whoAreWe = createDiv().parent(metroWrapper).class("absolute top-[130px] left-[7%] w-[420px] text-center z-10 -translate-x-1/2 translate-x-[160px]");
    createElement('h3', "WHO ARE WE?").parent(whoAreWe).class("m-0 mb-2.5 font-bold text-2xl");
    createP("We are a group of students of the Politecnico di Milano, from the course of “Laboratorio di Computer Grafica”, C2 section, studying Design della Comunicazione.").parent(whoAreWe).class("m-0 text-base leading-relaxed");

    // Spacer
    createDiv().parent(metroWrapper).class("h-[450px] w-full block");

    // --- 3. STUDENT CARDS ---
    TEAM_MEMBERS.forEach((member, index) => {
        // MODIFICA 1: Aumentato il margine inferiore (mb-12) per spaziare di più gli elementi
        let item = createDiv().parent(metroWrapper).class("timeline-item relative min-h-[1px] -mt-20 mb-40 pointer-events-none group");
        
        if (index === 0) item.addClass("!mt-0"); 

        // MODIFICA 2: Tolto group-hover, messo solo hover sul pallino
        // Ora il pallino reagisce solo se il mouse è SU DI LUI, non sul riquadro.
        createDiv().parent(item).class("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-4 border-black rounded-full z-10 pointer-events-auto transition-transform duration-300 hover:scale-125 hover:bg-black");

        // Card Studente
        createProfileBox(item, member);
    });
}

function drawAbout() {
}

function removeAbout() {
    let container = getContentContainer();
    if (container) {
        // Reset degli stili flex e altezza impostati dalla Home
        container.style('height', '');
        container.style('display', '');
        container.style('flex-direction', '');
        container.style('overflow', '');
        container.html(""); // Pulisce il contenuto
    }
}

// --- HELPER COMPONENTS ---

function createTopInfoBox(parent, title, htmlContent) {
    let box = createDiv().parent(parent).class("w-full md:w-[45%] min-w-[300px] border-[3.5px] border-black p-5 rounded-2xl bg-white text-sm leading-snug relative cursor-default transition-transform duration-300 pointer-events-auto");
    
    createElement('h3', title).parent(box).class("text-xl m-0 mb-4 font-bold leading-tight");
    createP(htmlContent).parent(box).class("max-w-[420px] mx-auto text-base leading-normal m-0");
}

function createProfileBox(parent, member) {
    // MODIFICA 3: Avvicinati i box alla linea centrale
    // Left: da 360px a 280px | Right: da 160px a 100px
    let marginClass = member.side === 'left' ? "ml-[calc(50%-435px)]" : "ml-[calc(50%+75px)]";
    
    let arrowClasses = "";
    if (member.side === 'left') {
        arrowClasses = `
            before:content-[''] before:absolute before:left-full before:top-1/2 before:-mt-[26px] before:border-y-[26px] before:border-y-transparent before:border-l-[50px] before:border-l-black
            after:content-[''] after:absolute after:left-full after:top-1/2 after:-mt-[21px] after:border-y-[21px] after:border-y-transparent after:border-l-[44px] after:border-l-white
        `;
    } else {
        arrowClasses = `
            before:content-[''] before:absolute before:right-full before:top-1/2 before:-mt-[26px] before:border-y-[26px] before:border-y-transparent before:border-r-[50px] before:border-r-black
            after:content-[''] after:absolute after:right-full after:top-1/2 after:-mt-[21px] after:border-y-[21px] after:border-y-transparent after:border-r-[44px] after:border-r-white
        `;
    }

    let card = createDiv().parent(parent).class(`w-[360px] border-4 border-black rounded-xl p-8 bg-white relative cursor-pointer transition-all duration-300 pointer-events-auto hover:-translate-y-2 group/card ${marginClass} ${arrowClasses}`);
    
    card.mouseClicked(() => {
        if (card.hasClass('flipped')) card.removeClass('flipped');
        else card.addClass('flipped');
    });

    let inner = createDiv().parent(card).class("relative w-full h-full text-center");

    let front = createDiv().parent(inner).class("relative z-10 opacity-100 transition-opacity duration-300 font-medium w-full h-full group-[.flipped]/card:opacity-0 group-[.flipped]/card:pointer-events-none");
    
    //let img = createImg(member.img, `Foto ${member.surname}`).parent(front).class("w-full h-auto block rounded-lg bg-gray-200");
    //img.elt.onerror = function() { this.style.display='none'; }; 
    
    createElement('h3', member.surname).parent(front).class("text-center m-0 mt-2 text-2xl");
    createSpan(member.name).parent(front).class("text-base block text-center");

    let back = createDiv().parent(inner).class("absolute top-0 left-0 w-full h-full bg-white flex flex-col items-center justify-center opacity-0 z-20 transition-opacity duration-300 group-[.flipped]/card:opacity-100 group-[.flipped]/card:pointer-events-auto");
    
    createElement('h3', "CONTACT").parent(back).class("m-0 mb-0 text-xl font-bold");
    
    let mailLink = createA(`https://outlook.office.com/mail/deeplink/compose?to=${member.email}`, `${member.name.toLowerCase().replace(' ', '')}.${member.surname.toLowerCase()}<br>@mail.polimi.it`, "_blank").parent(back);
    mailLink.class("text-sm text-black underline underline-offset-4 break-all p-1.5 mt-1.5 hover:text-gray-500 transition-colors duration-200");
    
    mailLink.mouseClicked((e) => {
        e.stopPropagation();
        if(e.cancelBubble !== undefined) e.cancelBubble = true;
    });
}