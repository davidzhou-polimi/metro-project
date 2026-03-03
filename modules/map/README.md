# Gestione delle date e dati mancanti nella mappa

Questo documento descrive la logica implementata nel progetto per la gestione delle date (costruzione, apertura, chiusura) relative agli elementi visualizzati sulla mappa (sistemi, linee, stazioni) e come vengono trattate le informazioni **assenti**, **incomplete** o **invalide** per garantire l'integrità visiva e dell'esperienza temporale della timeline.

I riferimenti logici principali si trovano in:
- `core/utils.js` (parser, utilità di calcolo temporale e funzione `getInheritedLineOpening`)
- `modules/map/logic_map.js` (orchestratore dei feature layers di Mapbox: tratte, stazioni, filtri temporali, popup)

---

## 1. Regole generali e parsing (`core/utils.js`)

### `parseYear`
Tutte le date introdotte dal JSON vengono preprocessate tramite `parseYear`.
- **Estrapolazione numerica**: garantisce un formato anno intero (es. `"1990-01-01"` → `1990`).
- Restituisce `null` per valori nulli, undefined o non parsabili.

### Anno terminale (`endOfTime`)
`endOfTime = appState.maxYear || CURRENT_YEAR`. Rappresenta l'anno massimo gestito dalla UI ed è usato come data di "comparsa a fine slider" per elementi senza date significative.

### Chiusura (`closure`)
Se `closure` è nullo o assente, viene impostato a **`9999`** — convenzione per "mai dismesso". Il valore 9999 è il sentinella universale usato in tutto il codebase.

### Filtro anno 1863
Il sistema invalida date antecedenti al **1863** (anno di apertura della prima metropolitana — London Underground) **sia nella mappa visiva che nelle statistiche aggregate**. Questo vale sia per la visualizzazione in `logic_map.js` (righe sezione e stazione) sia per i calcoli chilometrici in `calculateNetworkLength`.

---

## 2. Elaborazione delle tratte fisiche (sezioni)

Ogni tratta viene costruita iterando `db.section_lines` per ogni linea della città. Le date vengono risolte nell'ordine seguente:

### Ordine di risoluzione

1. **Parsing base** da `section.buildstart`, `section.opening`, `section.closure`.
2. **Flag `isInstant`**: se `buildstart === opening` oppure `buildstart` è assente, la fase di cantiere è istantanea (la tratta appare già operativa).
3. **Ereditarietà Inversa (Linea ← Stazioni)** — solo se mancano **entrambe** `opening` e `buildstart`:
   - Si chiama `getInheritedLineOpening(line.id)`, che calcola (una tantum, con cache) la data di apertura più antica tra le stazioni servite **esclusivamente** da quella linea (stazioni con un solo record in `station_lines`), rispettando il `fromyear` della relazione e il filtro `>= 1860`.
   - Se trovata, questa data diventa `opening`.
4. **Limiti Relazionali (`section_lines.fromyear` / `toyear`)**:
   - Se `relFrom` è definito e `opening < relFrom`, allora `opening = relFrom` e `buildstart = relFrom`.
   - Se `relTo` è definito e `closure > relTo`, allora `closure = relTo`.
5. **Filtro 1863**: `buildstart` e `opening` vengono azzerati (→ `null`) se antecedenti al 1863.
6. **Fallback mancanza `opening`**:
   - Se esiste `buildstart` → `opening = 9999` (cantiere eterno, mai operativo).
   - Altrimenti → `opening = endOfTime` (non apparirà mai sulla mappa, salvo all'ultimo anno UI).
7. **Fallback mancanza `buildstart`**:
   - Se `opening !== endOfTime` → `buildstart = opening` (comparsa istantanea come operativa).
   - Altrimenti → `buildstart = endOfTime`.
8. **Ripristino `isInstant`**: se il flag era vero, si forza `buildstart = opening` al termine.

### Calcolo chilometrico (`calculateNetworkLength` e sidebar)

Sia nella treemap della Home sia nel pannello Sidebar della mappa, si contano **solo i km operativi** (`isActive`). Una tratta è `isActive` se:
- `opening <= anno` (la tratta è già aperta).
- `closure > anno` (non è ancora dismessa).

I km in costruzione non influiscono sui totali. In `calculateNetworkLength`, i limiti relazionali `fromyear`/`toyear` vengono applicati per sezione, e l'apertura effettiva minima tra tutte le relazioni pertinenti viene usata come `opening` di riferimento.

---

## 3. Elaborazione delle stazioni

### Binding linea e stazioni orfane
Per ogni stazione della città (`db.stations.filter(s => s.city_id)`), si cerca la prima relazione in `db.station_lines`. Se non esiste (stazione orfana) o la linea associata non appartiene alla città corrente, la stazione viene **scartata**.

### Controllo prossimità (anti-outlier)
Se esiste almeno una sezione per la città (`totalSectionsFound > 0`), ogni stazione viene verificata rispetto alla sua linea con `getDistanceFromLine`. Se la distanza supera `MAX_DISTANCE_THRESHOLD` (≈ 0.02 gradi ≈ 2 km), la stazione è considerata un "fantasma" e viene **scartata**.

### Ricerca della sezione più vicina (proximity check — 2 passi)

Per ereditare i limiti temporali, ogni stazione cerca la sezione della propria linea più adiacente geometricamente tramite `lineSectionsDataMap`:

1. **Distanza minima assoluta**: si calcola la distanza minima dall'insieme di tutte le sezioni della linea.
2. **Candidati**: si raccolgono tutte le sezioni entro `minDist + 1e-3` gradi (≈ 111 m aggiuntivi) da tale minimo.
3. **Selezione tra i candidati**:
   - Se c'è un solo candidato → quello è `nearestSection`.
   - Se ce ne sono più d'uno (tipico per stazioni terminali/di scambio), si filtrano i **compatibili**: sezioni la cui `opening` sia ≤ all'`opening` originale della stazione nel DB (evita che una stazione terminale erediti l'estensione più giovane). Se nessun compatibile, si usa l'insieme completo.
   - Dal set risultante si sceglie la sezione con `opening` **più antica** (reduce su min).

### Applicazione dei limiti dalla sezione più vicina

Una volta trovata `nearestSection`:
- Se `nearestSection.buildstart` è definito e `buildstart` della stazione è precedente (o assente), la stazione eredita `buildstart` della tratta (non può comparire in cantiere prima della propria tratta fisica).
- L'`opening` della stazione non può essere precedente a `nearestSection.opening` (una stazione non può essere operativa prima della sua tratta).
- La `closure` della stazione non può essere successiva a `nearestSection.closure` (se la tratta chiude, la stazione chiude con essa).
- **Salvaguardia**: se dopo questi aggiustamenti `buildstart > opening`, si forza `buildstart = opening`.

### Ordine completo di risoluzione delle stazioni

1. Parsing base (`buildstart`, `opening`, `closure`).
2. Applicazione limiti da `nearestSection` (vedi sopra).
3. Flag `isInstant`: se `buildstart === opening` o `buildstart` è assente dopo il proximity check.
4. **Limiti Relazionali (`station_lines.fromyear` / `toyear`)**:
   - Se `relFrom` definito e `opening < relFrom` → `opening = relFrom`.
   - Se `relTo` definito e `closure > relTo` → `closure = relTo`.
5. **Ereditarietà `getInheritedLineOpening`** — solo se ancora mancano **entrambe** `opening` e `buildstart`.
6. Fallback `opening`: se assente → `9999` (se `buildstart` esiste) oppure `endOfTime`.
7. Fallback `buildstart`: se assente → `opening` (se `opening !== endOfTime`) oppure `endOfTime`.
8. Ripristino `isInstant`: `buildstart = opening`.

> **Nota sulla chiusura stazioni**: la chiusura non segue più una logica "se TUTTE le sezioni adiacenti chiudono". Viene ereditata direttamente dalla `closure` della sezione più vicina (`nearestSection`). Se nessuna sezione è trovata, `closure` rimane al valore di default `9999`.

---

## 4. Layer Mapbox e filtri temporali

### Layer linee

| Layer ID | Tipo | Visibilità |
|---|---|---|
| `lines-construction` | `line` | `buildstart <= anno < opening` |
| `lines-operational` | `line` | `opening <= anno < closure` |
| `lines-layer-hitbox` | `line` (opacità 0) | `(operativo OR costruzione)` — per intercettare i click |

Il layer hitbox ha larghezza 15px e opacità 0: è invisibile ma cliccabile. Sul click viene mostrato un popup con il nome e il colore della linea.

### Layer stazioni

| Layer ID | Tipo | Visibilità |
|---|---|---|
| `stations-construction` | `circle` | `buildstart <= anno < opening`, bordo `#6e7b8d` |
| `stations-operational` | `circle` | `opening <= anno`, non dismessa; bordo `lineColor` |
| `stations-labels` | `symbol` | Stessi filtri di `stations-operational` |

Il filtraggio delle stazioni riusa la proprietà `lineId` (uguale a quello delle feature delle linee), quindi nascondere una linea dalla sidebar rimuove istantaneamente anche tutte le sue stazioni, senza dover ricostruire array separati.

### Gestione visibilità linee (`hiddenLineIds`)
La condizione `condNotHidden` esclude le feature il cui `lineId` compare in `appState.hiddenLineIds`. Se l'array è vuoto, la condizione è `true` (nessun filtro attivo).

---

## 5. Visualizzazione nel popup (`formatDateRange`)

La funzione `formatDateRange(start, end, isOperational)` produce le stringhe testuali mostrate nel popup di stazioni e linee.

- **`start`** viene invalidato (`"N/A"`) se: nullo, `NaN`, o **`>= 9999`** (il valore sentinella — mai aperto).
- **Sezione Operativa** (`isOperational = true`):
  - Se `end` è assente, `NaN`, `>= endOfTime` o `=== 9999` → **`"Since [start]"`**.
  - Altrimenti → **`"[start] – [end]"`**.
- **Sezione Costruzione** (`isOperational = false`): stessa logica, dove `end` è l'anno di apertura.
- Se `start === "N/A"` → restituisce direttamente **`"N/A"`** per evitare stringhe tipo *"Since N/A"*.

### Logica popup stazione — serving lines

Il popup della stazione risolve le linee di servizio attive confrontando `currentYear` con le date effettive della stazione **fratella** (stesso nome, stessa città), ricercate in `appState.cityFeaturesStazioni`. Vengono mostrate solo le linee per cui la stazione risulta operativa (`currentYear >= effectiveStart && currentYear < effectiveEnd`) **o** in costruzione (`currentYear >= sibB && currentYear < effectiveStart`) al momento della visualizzazione.

---

## 6. Funzioni di contorno

### `calcolaRangeAnni` (calcolo dello slider)
Il range della timeline (`minYear` → `maxYear`) viene calcolato analizzando tutti i `buildstart` e `opening` delle sezioni della città, filtrando i valori < 1863 e i valori sentinella `9999`. Il `minYear` è il minore tra i valori validi trovati.

### `bloccaVistaConBuffer`
Dopo `fitBounds`, calcola il `maxBounds` della mappa espandendo la vista attuale di un buffer proporzionale all'aspect ratio dello schermo (costante `PIXEL_BUFFER = 400px` scalata per il lato minore). Il minZoom è impostato a `max(1.5, currentZoom - 1)`.

### `resetFiltriMappa`
Ripristina `hiddenLineIds = []` e `currentYear = maxYear`, rimuove temporaneamente i vincoli di maxBounds/minZoom prima di eseguire `fitBounds`, e li re-imposta tramite `bloccaVistaConBuffer` al termine del movimento.
