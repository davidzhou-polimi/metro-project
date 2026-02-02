// modules/about/about.js

let aboutContainer = null;

const TEAM_MEMBERS = [
    { surname: "Basso", name: "Michele Lucio", img: "assets/images/basso_michelelucio.jpeg", email: "michelelucio.basso@mail.polimi.it", side: "left" },
    { surname: "Della Valle", name: "Emma", img: "assets/images/dellavalle_emma.jpeg", email: "emma.dellavalle@mail.polimi.it", side: "right" },
    { surname: "Favre", name: "Mathias", img: "assets/images/favre_mathias.jpeg", email: "mathias.favre@mail.polimi.it", side: "left" },
    { surname: "Fois", name: "Chiara", img: "assets/images/fois_chiara.jpeg", email: "chiara.fois@mail.polimi.it", side: "right" },
    { surname: "Naldi", name: "Viola", img: "assets/images/naldi_viola.jpeg", email: "viola.naldi@mail.polimi.it", side: "left" },
    { surname: "Zhou", name: "David", img: "assets/images/zhou_david.jpeg", email: "david.zhou@mail.polimi.it", side: "right" }
];

function setupAbout() {
    let parent = getContentContainer();
    parent.html("");

    // RESET CLASSI DEL PARENT
    // Rimozione classi restrittive, che potrebbero arrivare dalla Home
    parent.removeClass("h-[calc(100vh-4.5rem)]");
    parent.removeClass("max-h-screen");
    parent.addClass("min-h-screen");
    parent.removeClass("p-4"); 
    parent.addClass("p-0");
    parent.removeClass("overflow-hidden"); 
    parent.class("w-full h-auto");

    document.title = "About – World Metro";

    let scrollWrapper = createDiv().parent(parent)
        .class("w-full h-full overflow-hidden");

    aboutContainer = createDiv().parent(scrollWrapper).class("w-full max-w-[1200px] mx-auto px-4 relative flex flex-col");

    // Linea verticale mobile
    createDiv().parent(aboutContainer).class("block md:hidden absolute left-1/2 -top-12 -bottom-24 -translate-x-1/2 w-[4px] bg-black z-0");

    let metroWrapper = createDiv().parent(aboutContainer).class("absolute inset-0 w-full h-full pointer-events-none");

    let svgContent = `
    <svg class="hidden md:block w-full h-full z-0 overflow-visible" viewBox="0 0 900 3000" preserveAspectRatio="none">
        <path d="M820-200V50q0 40-40 40H140q-80 0-80 80v80q0 80 80 80h270q40 0 40 50v2800" 
              stroke="#000" stroke-width="4" fill="none" vector-effect="non-scaling-stroke" />
    </svg>`;
    metroWrapper.html(svgContent);

    let contentSection = createDiv().parent(aboutContainer).class("relative z-10 w-full");

    // Intro Boxes
    let introWrapper1 = createDiv().parent(contentSection).class("flex flex-row justify-center items-stretch gap-4 md:gap-10 pt-12 md:mb-20");
    createTopInfoBox(introWrapper1, "OUR DATA SOURCE", 
        `The information visualized here is sourced from <a href="https://www.citylines.co/" target="_blank" class="underline">Citylines.co</a>, a global initiative that maps and archives urban transportation networks in cities all over the world.`);
    let introWrapper2 = createDiv().parent(contentSection).class("flex flex-row justify-center items-stretch gap-4 md:gap-10 pt-12 mb-12 md:mb-20");
    createTopInfoBox(introWrapper2, "WHAT IS THE PROJECT ABOUT?", 
        "The project is an interactive web experience that invites users to discover the intricate network of subways and transportation systems that crisscross major global cities. It is not a simple static map, but rather a visual exploration tool that allows users to navigate between cities, countries, and continents to understand how we move within the urban fabric.");

    // "WHO ARE WE?"
    let whoAreWeWrapper = createDiv().parent(contentSection).class("flex justify-center mb-12 md:mb-32");
    createTopInfoBox(whoAreWeWrapper, "WHO ARE WE?", 
        `We are six Communication Design students from Politecnico di Milano working together in the <a href="https://github.com/lcg-infodesign" target="_blank" class="underline">Laboratorio di Computer Grafica per l'Information Design</a> (C2).`, true);

    // Schede studenti
    TEAM_MEMBERS.forEach((member) => {
        let item = createDiv().parent(contentSection).class("relative flex flex-col items-center md:block mb-12 md:mb-36 w-full");
        
        createDiv().parent(item).class("hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[4px] border-black rounded-full z-30 transition-transform duration-300 hover:scale-125 hover:bg-black pointer-events-auto");

        createProfileBox(item, member);
    });
    
    createDiv().parent(contentSection).class("h-24");
}

function createTopInfoBox(parent, title, htmlContent, isWhoAreWe = false) {
    let widthClass = "w-[90%] md:w-[550px]";
    let box = createDiv().parent(parent).class(`${widthClass} border-[4px] border-black p-6 rounded-2xl bg-white z-20 shadow-none`);
    
    createElement('h3', title).parent(box).class("text-lg md:text-xl mb-3 font-bold uppercase");
    createP(htmlContent).parent(box).class("text-sm md:text-base leading-relaxed");
}

function createProfileBox(parent, member) {
    let posClass = member.side === 'left' ? "md:mr-[58%] md:ml-auto" : "md:ml-[58%] md:mr-auto";
    
    let card = createDiv().parent(parent).class(`w-[90%] max-w-[400px] border-[4px] border-black rounded-2xl bg-white relative cursor-pointer transition-all duration-300 hover:-translate-y-2 group/card overflow-hidden z-20 ${posClass}`);
    
    card.mouseClicked(() => card.toggleClass('flipped'));

    // Container interno flessibile
    let inner = createDiv().parent(card).class("relative w-full flex flex-col");

    let front = createDiv().parent(inner).class("flex flex-col p-4 transition-all duration-500 group-[.flipped]/card:opacity-0");
    
    // Altezza fissa proporzionale per le immagini
    let imgContainer = createDiv().parent(front).class("w-full aspect-[4/3] overflow-hidden rounded-lg mb-3");
    createImg(member.img, member.surname).parent(imgContainer).class("w-full h-full object-cover");
    
    createElement('h3', `${member.surname} ${member.name}`).parent(front).class("text-base font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis uppercase");

    let back = createDiv().parent(inner).class("absolute inset-0 bg-white flex flex-col items-center justify-center p-6 opacity-0 transition-all duration-500 group-[.flipped]/card:opacity-100 group-[.flipped]/card:z-30");
    createElement('h3', "CONTACT").parent(back).class("text-base font-bold mb-4");
    
    // Uso diretto del campo member.email x gestire nomi/cognomi composti
    let emailDisplay = member.email; 
    let mailLink = createA(`mailto:${member.email}`, emailDisplay, "_blank").parent(back);
    mailLink.class("text-base text-black underline underline-offset-4 hover:text-gray-500 transition-colors text-center break-all font-medium");
    
    mailLink.mouseClicked((e) => e.stopPropagation());
}

function removeAbout() {
    if (aboutContainer) {
        aboutContainer.remove();
        aboutContainer = null;
    }
}