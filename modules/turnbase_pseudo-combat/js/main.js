// js/main.js
// Gamicraft WebScreen Main Initialization - Handles PC and Android asset paths

// --- Global State Variables ---
var bState = {}; // Battle state object
var previousBState = null; // Untuk menyimpan state sebelumnya (untuk animasi, dll)
var wsMode = "idle"; // Webscreen mode (e.g., "idle", "targeting_enemy")

// --- Global UI State Variables ---
let currentEnemyIndex = 0;
let currentPlayerHeroStartIndex = 0;

// --- Global Path Variables (diinisialisasi di initializeApp) ---
// window.gcpcRootPath, window.gcpcDataPath, window.gcpcPlaceholderPath

// --- DOM Element References (diinisialisasi di initializeDOMReferences) ---
let elDynamicBackground;
let elRoundTurnDisplay, elBattleMessageDisplay, elBattleOptionsTrigger;
let elEnemyCarousel, elPrevEnemyBtn, elNextEnemyBtn;
let elPseudomapTrack, elPseudomapArea;
let elPlayerHeroesCarousel, elPlayerHeroesDeck;
let elTeamResourcesDisplay, elActionButtonsGroup;
let elBattleLogOverlay, elBattleLogEntries, elCloseLogBtn;
let elCopyWsLogBtn, elClearWsLogBtn;
// elOpenWsLogBtn akan dicari secara spesifik di event_handlers.js karena bisa ada di beberapa tempat
let elWsLoggerScreen, elCloseWsLoggerBtn; // Untuk WS Logger screen


var handleNewBattleState = function(newBStateData) {
    wsLogger("MAIN_JS: handleNewBattleState called.");
    wsLogger("MAIN_JS_DEBUG: newBStateData (first 200 chars): " + (typeof newBStateData === 'object' ? JSON.stringify(newBStateData).substring(0,200) : String(newBStateData).substring(0,200)));

    // Simpan bState saat ini SEBELUM di-update, jika bState sudah ada isinya
    if (typeof bState === 'object' && bState !== null && Object.keys(bState).length > 0 && bState.units) {
        try {
            previousBState = JSON.parse(JSON.stringify(bState));
            wsLogger("MAIN_JS: previousBState was DEEP COPIED from current bState.");
            wsLogger("MAIN_JS_DEBUG: previousBState.activeUnitID (sample): " + (previousBState.activeUnitID || 'N/A'));
        } catch (e) {
            wsLogger("MAIN_JS_ERROR: Could not deep copy bState to previousBState. Error: " + e);
            previousBState = null; // Penting untuk null jika error
        }
    } else {
        wsLogger("MAIN_JS_INFO: Current bState is empty or invalid, previousBState set to null or its last value.");
        previousBState = null; // Pastikan null jika bState awal kosong atau tidak valid
    }

    // Update bState global dengan data BARU
    bState = newBStateData;
    wsMode = "idle"; // Reset wsMode, penting jika aksi sebelumnya adalah skill

    wsLogger("MAIN_JS: bState updated with new data. activeUnitID: " + (bState.activeUnitID || 'N/A') + ". Calling refreshAllUIElements.");
    wsLogger("MAIN_JS_DEBUG: previousBState being passed to refreshAllUIElements is " + (previousBState ? "DEFINED" : "NULL"));

    if (typeof refreshAllUIElements === "function") {
        refreshAllUIElements(previousBState); // Kirim previousBState untuk perbandingan animasi
    } else {
        wsLogger("MAIN_JS_ERROR: refreshAllUIElements function is not defined!");
    }
};

/**
 * Initializes the WebScreen application.
 */
async function initializeApp() {
    wsLogOutputElement = document.getElementById('ws-log-output');
    // Tombol #open-ws-log-btn akan di-handle oleh event_handlers.js karena bisa ada di beberapa tempat
    elWsLoggerScreen = document.getElementById('ws-logger-screen');
    elCloseWsLoggerBtn = document.getElementById('close-ws-logger-btn');

    if (!wsLogOutputElement) {
        console.error("FATAL ERROR: Log output element #ws-log-output not found!");
        // Fallback logger sederhana jika wsLogger dari config.js gagal
        window.wsLogger = window.wsLogger || function(message) { console.log(`[WS_LOG_FALLBACK] ${message}`); };
    } else {
        wsLogOutputElement.textContent = ''; // Bersihkan log UI saat init
    }
    wsLogger("MAIN_JS: initializeApp starting. Logger ready.");

    initializeDOMReferences(); // Referensi ke elemen DOM lainnya

    // Pengaturan Path (Android vs PC)
    if (typeof window.AutoToolsAndroid !== 'undefined') {
        let rawTaskerPath = "";
        if (typeof window.assetBasePath === 'string' && window.assetBasePath.trim() !== "") {
            rawTaskerPath = window.assetBasePath;
        } else {
            const metaAssetBasePathElement = document.querySelector('meta[name="autotoolswebscreen"][id="assetBasePath"]');
            rawTaskerPath = metaAssetBasePathElement ? metaAssetBasePathElement.getAttribute('defaultValue') : "/storage/emulated/0/gamicraft/modules/turnbase_pseudo-combat";
        }
        if (rawTaskerPath.startsWith('file:///')) rawTaskerPath = rawTaskerPath.substring('file:///'.length);
        if (rawTaskerPath.endsWith('/')) rawTaskerPath = rawTaskerPath.slice(0, -1);
        window.gcpcRootPath = "file://" + rawTaskerPath;
        window.gcpcDataPath = window.gcpcRootPath + "/data/";
        window.gcpcPlaceholderPath = window.gcpcRootPath + "/app/mockup/";
        wsLogger(`MAIN_JS: Android Paths Initialized. Root: ${window.gcpcRootPath}`);
    } else {
        window.gcpcRootPath = ""; // Untuk PC, path relatif ke index.html
        window.gcpcDataPath = "data/";
        window.gcpcPlaceholderPath = "mockup/";
        wsLogger(`MAIN_JS: PC Paths Initialized. Root: (relative), Data: ${window.gcpcDataPath}`);
    }

    // Memuat battle state awal
    let initialBattleData = window.battleState; // Dari <meta> atau di-set oleh Tasker
    let loadedFromTaskerOrMeta = false;

    if (initialBattleData) {
        if (typeof initialBattleData === 'string' && initialBattleData.trim() !== "" && initialBattleData.trim() !== "{}") {
            try {
                bState = JSON.parse(initialBattleData);
                loadedFromTaskerOrMeta = true;
                wsLogger("MAIN_JS: Initial battle state (string) loaded and parsed from Tasker/meta.");
            } catch (e) {
                wsLogger("MAIN_JS_ERROR: Failed to parse initial battleState string: " + e + ". Data: " + initialBattleData.substring(0,100));
                bState = {};
            }
        } else if (typeof initialBattleData === 'object' && initialBattleData !== null && Object.keys(initialBattleData).length > 0 && initialBattleData.units) {
            bState = initialBattleData; // Langsung gunakan objek
            loadedFromTaskerOrMeta = true;
            wsLogger("MAIN_JS: Initial battle state (object) loaded from Tasker/meta.");
        } else {
            wsLogger("MAIN_JS_INFO: Initial battleState from Tasker/meta is empty or invalid format.");
        }
    }

    if (!loadedFromTaskerOrMeta || Object.keys(bState).length === 0 || !bState.units) {
        wsLogger("MAIN_JS: No valid initial state from Tasker/meta OR bState is empty/invalid. Loading MOCK JSON for PC.");
        try {
            const response = await fetch('mock_battle_state.json'); // Path ke mock JSON
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            bState = await response.json();
            wsLogger("MAIN_JS: Successfully loaded and parsed mock_battle_state.json.");
            if (bState.activeUnitID && bState.units && !bState.activeUnitType) {
                const activeUnit = bState.units.find(u => u.id === bState.activeUnitID);
                if (activeUnit) bState.activeUnitType = activeUnit.type;
            }
        } catch (e) {
            wsLogger("MAIN_JS_ERROR: Failed to load/parse mock_battle_state.json: " + e);
            wsLogger("MAIN_JS_WARN: Falling back to minimal bState.");
            bState = { battleState: "Error", battleMessage: "Failed to load any battle data.", units: [], teamSP: 0, maxTeamSP: 0, assets:{} };
        }
    }
    wsLogger("MAIN_JS: Initial bState.battleMessage: " + (bState ? bState.battleMessage : "N/A") + ", activeUnitID: " + (bState ? bState.activeUnitID : "N/A"));

    previousBState = null; // Pastikan previousBState null pada load pertama

    if (typeof refreshAllUIElements === "function") {
        refreshAllUIElements(previousBState); // Kirim null karena ini load pertama
        wsLogger("MAIN_JS: Initial UI rendered.");
    } else {
        wsLogger("MAIN_JS_ERROR: refreshAllUIElements function not found!");
    }

    if (typeof initializeEventListeners === "function") {
        initializeEventListeners();
        // wsLogger("MAIN_JS: Event listeners initialized."); // Sudah dilog di event_handlers.js
    } else {
        wsLogger("MAIN_JS_ERROR: initializeEventListeners function not found!");
    }

    wsLogger("MAIN_JS: Application initialization complete.");
}

/**
 * Initializes references to DOM elements.
 */
function initializeDOMReferences() {
    elDynamicBackground = document.getElementById('dynamic-background');
    elRoundTurnDisplay = document.getElementById('round-turn-display');
    elBattleMessageDisplay = document.getElementById('battle-message-display');
    elBattleOptionsTrigger = document.getElementById('battle-options-trigger');
    elEnemyCarousel = document.getElementById('enemy-carousel');
    elPrevEnemyBtn = document.getElementById('prev-enemy-btn');
    elNextEnemyBtn = document.getElementById('next-enemy-btn');
    elPseudomapTrack = document.getElementById('pseudomap-track');
    elPseudomapArea = document.getElementById('pseudomap-area');
    elPlayerHeroesCarousel = document.getElementById('player-heroes-carousel');
    elPlayerHeroesDeck = document.getElementById('player-heroes-deck');
    elTeamResourcesDisplay = document.getElementById('team-resources-display');
    elActionButtonsGroup = document.getElementById('action-buttons-group');
    elBattleLogOverlay = document.getElementById('battle-log-overlay');
    elBattleLogEntries = document.getElementById('battle-log-entries');
    elCloseLogBtn = document.getElementById('close-log-btn');
    // elOpenWsLogBtn tidak perlu di-cache global di sini karena event_handlers akan mencarinya.
    elCopyWsLogBtn = document.getElementById('copy-ws-log-btn');
    elClearWsLogBtn = document.getElementById('clear-ws-log-btn');
    // elWsLoggerScreen dan elCloseWsLoggerBtn sudah dihandle di initializeApp
    wsLogger("MAIN_JS: DOM elements referenced.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
