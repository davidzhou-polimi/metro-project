<details>
<summary>Informazioni sul dataset</summary>

#### Fonte dei dati
[Citylines](https://www.citylines.co/) è un database open source relativo ai sistemi di trasporto urbano, in particolare alle linee di trasporto pubblico (metro, tram, bus, ferrovie urbane) nel mondo, ideato e realizzato da Bruno Salerno.

A questa struttura base abbiamo integrato un [dataset aggiuntivo per i continenti](assets\data\countries.json), permettendo una categorizzazione geografica macroscopica delle città.

#### Rielaborazione dei dati
Poiché il dataset originale include diverse tipologie di trasporto (bus, ferrovie, tram) senza una categorizzazione univoca alla fonte, abbiamo isolato i sistemi di tipo "metropolitana" a livello globale, utilizzando un **algoritmo di filtraggio** che include specifici ID di modalità di trasporto (es. heavy and light rail) e keyword (es. “metro”, “subway”, “underground”) ma esclude anche sistemi che contengono termini fuorvianti nel nome (es. “bus”, “railway”, “train”).

</details>

<details>
<summary>Obiettivi di conoscenza e scelte progettuali a loro supporto</summary>

> #### 1. Identificare la dimensione e collocazione geografica di un sistema metropolitano.
Nella Home Page si utilizza una **TreeMap**, dove la grandezza di **ogni blocco è proporzionale alla lunghezza totale della rete**, permettendo un confronto visivo immediato tra le città. I blocchi sono **colorati in base al continente** di appartenenza per facilitare la localizzazione geografica, e passando il mouse su di essi appaiono etichette con i dettagli precisi. Nella pagina di dettaglio di una città selezionata invece, **la mappa proietta l'infrastruttura sul tessuto urbano reale**, permettendo di valutare l'estensione fisica della rete.

> #### 2. Comprendere l’evoluzione temporale dei sistemi metropolitani.
Sia la Home Page che la mappa di dettaglio integrano una **timeline interattiva** dotata di riproduzione automatica ("play"). Questa funzione aggiorna dinamicamente la visibilità degli elementi, mettendo in luce i **ritmi di espansione delle reti**.

> #### 3. Comprendere l’evoluzione/distribuzione spaziale dei sistemi metropolitani.
La **mappa geografica** distingue visivamente lo **stato delle infrastrutture**: le tratte operative sono mostrate con linee solide e colorate, mentre quelle in costruzione sono tratteggiate. La visualizzazione si adatta automaticamente all'estensione della rete della città selezionata, permettendo di comprendere la dimensione e la collocazione geografica della rete metropolitana oltre che osservare come si ramifica nel tessuto urbano reale.

> #### 4. Comprendere la complessità strutturale della rete (numero di linee e stazioni) in relazione alla sua estensione.
Una **sidebar** organizza i dati in modo gerarchico, mostrando i sistemi di trasporto e le singole linee con **statistiche aggiornate in tempo reale** (chilometri e numero di stazioni attive). L'**interazione diretta con i nodi della mappa** (stazioni) rivela tramite popup i **punti di interscambio** e le sovrapposizioni tra linee, dettagliando la complessità topologica che non sarebbe visibile da una semplice lista.

</details>

<details>
<summary>Team e ruoli (WIP)</summary>

#### Michele Lucio Basso
- 

#### Emma Della Valle
- 

#### Mathias Favre
- 

#### Chiara Fois
-

#### Viola Naldi
- **Architettura dell'informazione e layout:** definizione della struttura logica, delle gerarchie visive e dell'organizzazione dei contenuti per ottimizzare la navigazione.
- **Visual & Interaction Design:** progettazione dell'interfaccia grafica su Figma e sviluppo delle componenti interattive (stati, micro-interazioni e transizioni).
- **Sviluppo sidebar:** sviluppo e codifica della sidebar nella pagina di dettaglio, curandone struttura, interazione e integrazione con il resto dell’interfaccia.

#### David Zhou
- **Architettura tecnica:** sviluppo della struttura Single Page App (SPA) e integrazione dei vari moduli attraverso la logica JS.
- **Logica e database:** gestione del database, dei filtri e della logica di caricamento dei dataset (città, linee, sistemi).
- **Sviluppo core:** implementazione del sistema di visualizzazione su mappa tramite Mapbox GL JS e collegamento tra dati e componenti grafici.
- **Refactoring e pulizia:** revisione e adattamento del codice di ogni componente per garantirne il funzionamento logico, l'armonizzazione visiva globale tramite Tailwind CSS e la corretta visualizzazione complessiva.

#### Attività condivise
- **Brainstorming:** sessioni collettive per la scelta del tema del progetto e la definizione dell'identità visiva.
- **Data visualization:** decisione collegiale sulle modalità di visualizzazione dei dati, per rendere efficace il racconto dell'informazione e il confronto tra i sistemi metropolitani.

</details>

<details>
<summary>Note sullo sviluppo</summary>

####

L’AI è stata un prezioso strumento di supporto. In particolare, abbiamo utilizzato *Gemini* per la generazione di specifici snippet di codice complessi (es. l'algoritmo del Minimum Spanning Tree), l'ottimizzazione di alcune funzioni e la risoluzione dei bug.

</details>

<details>
<summary>Autori e licenza</summary>

#### Autori

- Michele Lucio Basso
- Emma Della Valle
- Mathias Favre
- Chiara Fois
- Viola Naldi
- David Zhou

#### Licenza di utilizzo

[Creative Commons Attribution 4.0 International (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)
</details>
