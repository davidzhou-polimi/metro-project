// modules/home/logic_home_animation.js

const HOME_MIN_YEAR = 1863;
const HOME_MAX_YEAR = 2025;

function toggleHomePlayback(forceState) {
    let shouldPlay = forceState !== undefined ? forceState : !homeState.isPlaying;

    if (shouldPlay) {
        // Stop preventivo
        if (homeState.animationInterval) clearInterval(homeState.animationInterval);
        
        homeState.isPlaying = true;
        
        // Aggiorna icona pulsante
        if (homeState.uiElements.playBtn) {
            homeState.uiElements.playBtn.html(pauseIcon); 
        }

        // Se siamo alla fine, ricomincia dall'inizio
        if (homeState.filters.year >= HOME_MAX_YEAR) {
            // Aggiorna sia il filtro logico sia l'interfaccia (Slider) immediatamente
            setHomeFilter('year', HOME_MIN_YEAR);
            updateHomeUIForAnimation(HOME_MIN_YEAR); 
        }

        homeState.animationInterval = setInterval(() => {
            if (homeState.filters.year < HOME_MAX_YEAR) {
                // Incrementa anno
                let nextYear = homeState.filters.year + 1;
                
                // Aggiorna UI Slider e Testo
                updateHomeUIForAnimation(nextYear);
                
                // Applica il filtro e ridisegna la Treemap
                setHomeFilter('year', nextYear);
            } else {
                // Fine ciclo
                toggleHomePlayback(false);
            }
        }, appState.speed);
    } else {
        // Pausa
        homeState.isPlaying = false;
        
        if (homeState.uiElements.playBtn) {
            homeState.uiElements.playBtn.html(playIcon); 
        }
        
        if (homeState.animationInterval) clearInterval(homeState.animationInterval);
    }
}

function stopHomeAnimation() {
    if (homeState.animationInterval) clearInterval(homeState.animationInterval);
    homeState.isPlaying = false;
    
    if (homeState.uiElements.playBtn) {
        homeState.uiElements.playBtn.html(playIcon);
    }
}

function updateHomeUIForAnimation(year) {
    // Aggiorna Slider
    let slider = homeState.uiElements.slider;
    if (slider) {
        slider.value(year);
        // Aggiorna gradiente background slider
        const perc = ((year - HOME_MIN_YEAR) / (HOME_MAX_YEAR - HOME_MIN_YEAR)) * 100;
        slider.style("background", `linear-gradient(to right, #171717 ${perc}%, #D4D4D4 ${perc}%)`);
    }

    // Aggiorna Testo Anno (Anche se setHomeFilter lo fa, questo è più reattivo per l'animazione)
    let display = homeState.uiElements.yearDisplay;
    if (display) {
        display.html(year);
    }
}