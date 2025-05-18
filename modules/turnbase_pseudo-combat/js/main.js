// js/main.js

// --- Global PWA State Variables ---
let bState = {};      // Holds the current battle state
let assetCache = {};  // Holds the loaded image/asset data
let pwaMode = "idle"; // Current PWA mode: "idle", "targeting_enemy", "waiting_tasker"

// --- DOM Element References (initialized in DOMContentLoaded) ---
// These are declared here and assigned in the DOMContentLoaded listener.
// They are also listed in ui_renderer.js for clarity but assigned here.
let elBattleScreen, elRoundTurnInfo, elBattleMessageArea;
let elMainEnemyDisplayContainer, elMainEnemyDisplayWrapper, elPrevEnemyBtn, elNextEnemyBtn;
let elPseudomapStrip;
let elActiveHeroPanel;
let elBattleEndScreen, elBattleResultMessage, elQuitBattleBtn;
// pwaLogOutputElement is defined and used by pwaLogger in config.js, but initialized here.

/**
 * Initializes the PWA application.
 * This function is called once the DOM is fully loaded.
 */
function initializeApp() {
    // 1. Initialize the PWA Logger Element FIRST.
    // pwaLogger function is defined in config.js and needs this.
    pwaLogOutputElement = document.getElementById('pwaLogOutputArea');
    if (!pwaLogOutputElement) {
        console.error("FATAL ERROR: Log output element #pwaLogOutputArea not found! Logger will not work.");
        // Fallback to console.log if visual logger fails
        window.pwaLogger = console.log; // Override with console.log
        pwaLogger("MAIN_INIT_ERROR: #pwaLogOutputArea not found. Using console.log for pwaLogger.");
    } else {
        // Clear any previous log content if the page was reloaded
        pwaLogOutputElement.textContent = '';
    }

    pwaLogger("MAIN_INIT: DOMContentLoaded - Application starting.");

    // 2. Initialize other DOM Element References
    elBattleScreen = document.getElementById('battle-screen');
    elRoundTurnInfo = document.getElementById('round-turn-info');
    elBattleMessageArea = document.getElementById('battle-message-area');
    
    elMainEnemyDisplayContainer = document.getElementById('main-enemy-display-container');
    elMainEnemyDisplayWrapper = document.getElementById('main-enemy-display-wrapper');
    elPrevEnemyBtn = document.getElementById('prev-enemy-btn');
    elNextEnemyBtn = document.getElementById('next-enemy-btn');
    
    elPseudomapStrip = document.getElementById('pseudomap-strip');
    
    elActiveHeroPanel = document.getElementById('active-hero-panel');
    
    elBattleEndScreen = document.getElementById('battle-end-screen');
    elBattleResultMessage = document.getElementById('battle-result-message');
    elQuitBattleBtn = document.getElementById('quit-battle-btn');

    pwaLogger("MAIN_INIT: DOM elements referenced.");

    // 3. Load Initial Asset Cache
    // Tries to load from Tasker-injected 'initialAssetCache', falls back to 'staticAssetCache' from config.js
    if (typeof window.initialAssetCache !== 'undefined' && window.initialAssetCache && Object.keys(window.initialAssetCache).length > 0) {
        try {
            // Ensure deep copy if it's an object, or parse if it's a string
            let rawAssetCache = window.initialAssetCache;
            assetCache = (typeof rawAssetCache === 'string') ? JSON.parse(rawAssetCache) : JSON.parse(JSON.stringify(rawAssetCache));
            pwaLogger("MAIN_INIT: Initial asset cache loaded from Tasker (meta tag).");
        } catch (e) {
            pwaLogger("MAIN_INIT_ERROR: Failed to parse initialAssetCache from Tasker. Using static. Error: " + e);
            assetCache = JSON.parse(JSON.stringify(staticAssetCache || { portraits: {} })); // Fallback
        }
    } else if (typeof staticAssetCache !== 'undefined') {
        assetCache = JSON.parse(JSON.stringify(staticAssetCache)); // Deep copy from config.js
        pwaLogger("MAIN_INIT: Initial asset cache loaded from static config.js.");
    } else {
        assetCache = { portraits: {} }; // Minimal fallback
        pwaLogger("MAIN_INIT_WARN: No asset cache data found from Tasker or config.js. Using empty cache.");
    }

    // 4. Load Initial Battle State
    // Tries to load from Tasker-injected 'initialBattleState'.
    // If not available, initializes with a minimal waiting state.
    if (typeof window.initialBattleState !== 'undefined' && window.initialBattleState && Object.keys(window.initialBattleState).length > 0) {
        try {
            // Ensure deep copy if it's an object, or parse if it's a string
            let rawBattleState = window.initialBattleState;
            bState = (typeof rawBattleState === 'string') ? JSON.parse(rawBattleState) : JSON.parse(JSON.stringify(rawBattleState));
            pwaLogger("MAIN_INIT: Initial battle state loaded from Tasker (meta tag).");
        } catch (e) {
            pwaLogger("MAIN_INIT_ERROR: Failed to parse initialBattleState from Tasker. Using minimal default. Error: " + e);
            bState = { Units: [], BattleState: "Error", BattleMessage: "Error loading battle data!" };
        }
    } else {
        // If Tasker doesn't send initialBattleState (e.g., direct browser load for testing PWA UI without full Tasker setup)
        // PWA will show a "waiting" or "error" state until Tasker sends data via autoToolsUpdateValues.
        bState = { Units: [], BattleState: "Waiting", BattleMessage: "Waiting for battle data from Tasker..." };
        pwaLogger("MAIN_INIT: No initial battle state from Tasker. Waiting for update via autoToolsUpdateValues.");
    }

    // 5. Initialize Event Listeners
    if (typeof initializeEventListeners === "function") {
        initializeEventListeners();
        pwaLogger("MAIN_INIT: Event listeners initialized.");
    } else {
        pwaLogger("MAIN_INIT_ERROR: initializeEventListeners function not found!");
    }

    // 6. Render Initial UI
    if (typeof refreshAllUIElements === "function") {
        refreshAllUIElements();
        pwaLogger("MAIN_INIT: Initial UI rendered.");
    } else {
        pwaLogger("MAIN_INIT_ERROR: refreshAllUIElements function not found!");
    }

    pwaLogger("MAIN_INIT: Application initialization complete.");

    // --- For PWA-only testing: Simulate receiving data from Tasker after a delay ---
    // Comment this out when integrating with actual Tasker.
    /*
    setTimeout(() => {
        if (bState.BattleState === "Waiting") { // Only if we didn't get data from Tasker initially
            pwaLogger("MAIN_SIMULATE: Simulating Tasker sending initial data...");
            // Define a testBattleState here if you removed staticBattleState from config.js
            // const testBattleState = { 
            //     BattleState: "Ongoing", Round: 1, TurnInRound: 1, ActiveUnitID: "kyuris_01", 
            //     BattleMessage: "Simulated Battle Start!", 
            //     Units: [ { id: "kyuris_01", name: "Kyuris (Sim)", type: "Ally", status: "Active", turnOrder: 1, pseudoPos: 0, stats: { HP: 50, MaxHP: 50, ATK: 10 }, portraitRef: "kyuris_default_portrait", commands: [{ commandId: "na_kyuris_sim", commandType: "NormalAttack", name: "Attack", range: 1, targetableType: "Enemy"}]}],
            //     lastActionDetails: {}
            // };
            // const testAssetCache = staticAssetCache; // Use the one from config.js for simulation
            // if (typeof autoToolsUpdateValues === "function") {
            //    autoToolsUpdateValues({ initialBattleState: testBattleState, initialAssetCache: testAssetCache });
            // }
        }
    }, 2000);
    */
    // --- End PWA-only testing simulation ---
}

// --- Start the Application ---
// Wait for the DOM to be fully loaded before running initialization
document.addEventListener('DOMContentLoaded', initializeApp);
