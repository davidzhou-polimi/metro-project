// --- VARIABILI GLOBALI DATI ---
let rawData = {};
let db = {};

let layout = {
    main: null,   // Conterrà il div centrale (il "buco" da riempire)
    header: null, // Conterrà la navbar
    footer: null
};

// --- Variabili interfaccia ---
let mappa;
let mappaContainer;
let boundsCittaCorrente = null;
let btnBack;
let fonts = {};

// --- STATO DELL'APP ---
let appState = {
    currentYear: 2025,
    maxYear: 2025,
    minYear: 1900,
    hiddenLineIds: [],
    activeCityId: null,
    isPlaying: false,
    animationInterval: null,
    speed: 150,
};

// --- TOKEN di MAPBOX ---

const MAPBOX_PUBLIC_TOKEN = "pk.eyJ1IjoiZGF2aWR6aG91cG9saW1pIiwiYSI6ImNtbDVxcDB3cTA1d3MzY3M4cWIyMmJhNHUifQ.pvgVyaAO5_NTN1FkKZWC9A";

// Verifichiamo se il token privato esiste ed è diverso dal segnaposto
const isPrivateTokenValid = typeof MAPBOX_PRIVATE_TOKEN !== "undefined" && MAPBOX_PRIVATE_TOKEN !== "pk.use_your_own_token";

const MAPBOX_TOKEN = isPrivateTokenValid ? MAPBOX_PRIVATE_TOKEN : MAPBOX_PUBLIC_TOKEN;

// Debug per confermare quale token è in uso
console.log(`Token Mapbox in uso: ${isPrivateTokenValid ? "Privato" : "Pubblico"}`);

// --- Icone ---

/**
 * @license
 * Questo file contiene icone originali e icone derivate dal progetto Lucide.
 * Le icone Lucide sono soggette alla seguente licenza:
 * Icons by Lucide (https://lucide.dev)
 * Copyright (c) 2013-2026 Cole Bemis (Feather)
 * Copyright (c) 2026 Lucide Contributors
 * Licensed under ISC (https://opensource.org/licenses/ISC)
 */

const icons = {
    // * Icone personalizzate *
    //reset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90" fill="currentColor"><path d="M53.28 65.67c-8.93 3.46-18.76 1.25-25.05-5.64l-.69-.75 12-1.33-8.74-7.49-18.91 2.7 2.71 18.95 8.69 7.45-1.15-11.09 1 .9c9.56 8.62 23.07 10.61 35.26 5.19 12.03-5.35 19.56-16.71 19.75-29.75H67.96c-.2 9.44-5.79 17.4-14.69 20.86ZM75.4 17.9l-8.69-7.45 1.15 11.09-1-.9c-9.56-8.62-23.08-10.61-35.26-5.19C19.57 20.8 12.04 32.16 11.85 45.2h10.19c.2-9.44 5.79-17.4 14.69-20.86 8.93-3.46 18.76-1.25 25.05 5.64l.69.75-12 1.33 8.74 7.49 18.91-2.7-2.71-18.95Z"/></svg>`,
    play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90" fill="currentColor"><path d="M20.54 76.27V12.18l54.74 32.05-54.74 32.05Z"/></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90" fill="currentColor"><path d="M22.23 12.95h11.4l.63.63V76.4l-.63.63h-11.4l-.63-.63V13.59l.63-.63Zm34.14 0h11.4l.63.63V76.4l-.63.63h-11.4l-.63-.63V13.59l.63-.63Z"/></svg>`,
    back: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90"><path d="M84.17 50.67V39.33h-59.3l24.39-28.89H36.87L5.83 45l31.04 34.56h12.39L24.87 50.67z" fill="currentColor"/></svg>`,
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90" fill="currentColor"><path d="m30.28 12.95.25.77 14.51 43.96 14.42-43.96.25-.77h9.72l.25.78 19.84 61.85.47 1.46H77.58l-.24-.79-13.11-42.27-13.94 42.29-.25.77H39.97l-.25-.77-13.95-42.29-13.11 42.27-.24.79H0l.47-1.46 19.84-61.85.25-.78z"/></svg>`,
    about: `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" fill="currentColor"><path d="M39.66 30.73h10.68l.59.56v47.7l-.59.56H39.66l-.59-.56v-47.7zm4.75-20.29h1.19l7.12 7.12v1.19l-7.12 7.12h-1.19l-7.12-7.12v-1.19z"/></svg>`,

    // * Icone Lucide *
    reset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9a9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5m5 4a9 9 0 0 1-9 9a9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></g></svg>`,
    //play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>`,
    //pause: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="5" height="18" x="14" y="3" rx="1"/><rect width="5" height="18" x="5" y="3" rx="1"/></g></svg>`,
    //back: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 19l-7-7l7-7m7 7H5"/></svg>`,
    //home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>`,
    //about: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></g></svg>`,
    chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m6 9 6 6 6-6"/></svg>`,
    operative: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12l2 2l4-4"/></g></svg>`,
    construction: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="M8 12h8m-4-4"/><circle cx="12" cy="12" r="10"/></g></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="m21 21l-4.34-4.34"/><circle cx="11" cy="11" r="8"/></g></svg>`,
    hideLine: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></g></svg>`,
    showLine: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575a1 1 0 0 1 0 .696a10.8 10.8 0 0 1-1.444 2.49m-6.41-.679a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 4.446-5.143M2 2l20 20"/></g></svg>`,
}