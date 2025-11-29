function togglePlayback(forceState) {
    let shouldPlay = forceState !== undefined ? forceState : !appState.isPlaying;

    if (shouldPlay) {
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
                togglePlayback(false);
            }
        }, appState.speed);
    } else {
        appState.isPlaying = false;
        let btn = select("#btn-play");
        if (btn) btn.html("PLAY");
        clearInterval(appState.animationInterval);
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
    let displayYear = Math.max(appState.currentYear, appState.minYear);
    if (slider) slider.value(displayYear);

    let h3s = document.getElementsByTagName("h3");
    for (let h of h3s) {
        if (!isNaN(parseInt(h.innerText))) {
            h.innerText = displayYear;
        }
    }
}