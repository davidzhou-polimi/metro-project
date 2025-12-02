function togglePlayback(forceState) {
    let shouldPlay = forceState !== undefined ? forceState : !appState.isPlaying;

    if (shouldPlay) {
        // *** SICUREZZA ***
        // Prima di far partire un nuovo intervallo, uccidiamo eventuali "fantasmi"
        if (appState.animationInterval) clearInterval(appState.animationInterval);
        
        appState.isPlaying = true;
        let btn = select("#btn-play");
        if (btn) btn.html("PAUSA");

        if (appState.currentYear >= appState.maxYear) {
            appState.currentYear = appState.minYear;
        }

        appState.animationInterval = setInterval(() => {
            if (appState.currentYear < appState.maxYear) {
                appState.currentYear++;
                updateUIForAnimation();
                aggiornaFiltriCombinati();
            } else {
                // Fine ciclo
                if (!appState.hasCompletedFirstCycle) {
                    appState.hasCompletedFirstCycle = true;
                    if (typeof sbloccaControlliTimeline === 'function') {
                        sbloccaControlliTimeline();
                    }
                }
                togglePlayback(false);
            }
        }, appState.speed);
    } else {
        // Pausa
        appState.isPlaying = false;
        let btn = select("#btn-play");
        if (btn) btn.html("PLAY");
        // Chiude l'intervallo
        if (appState.animationInterval) clearInterval(appState.animationInterval);
    }
}

function stopAnimation() {
    if (appState.animationInterval) clearInterval(appState.animationInterval);
    appState.isPlaying = false;
    let btn = select("#btn-play");
    if (btn) btn.html("PLAY");
}

function updateUIForAnimation() {
    let slider = select("#timeline-slider");
    // Usiamo minYear come fallback se currentYear non è settato
    let displayYear = Math.max(appState.currentYear, appState.minYear);
    
    // Aggiorna slider solo se esiste
    if (slider) slider.value(displayYear);

    // Aggiorna i testi h3 (l'anno visualizzato)
    let h3s = document.getElementsByTagName("h3");
    for (let h of h3s) {
        if (!isNaN(parseInt(h.innerText))) {
            h.innerText = displayYear;
        }
    }
}