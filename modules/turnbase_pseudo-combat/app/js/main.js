// js/main.js
// Gamicraft WebScreen Main Initialization - Handles PC and Android asset paths
// Versi dengan perbaikan state management untuk `previousBState`.

// --- Global State Variables ---
var bState = {}; // Battle state object
var previousBState = null; // Untuk menyimpan state sebelumnya, penting untuk perbandingan animasi
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
let elWsLoggerScreen, elCloseWsLoggerBtn;

/**
 * --- FUNGSI KUNCI YANG DIPERBAIKI ---
 * Menangani data battle state yang baru dari Tasker.
 * Memastikan `previousBState` tersimpan dengan benar sebelum memperbarui `bState`.
 * @param {object} newBStateData - Objek battle state yang baru.
 */
var handleNewBattleState = function(newBStateData) {
    wsLogger("MAIN_JS: handleNewBattleState called.");
    wsLogger("MAIN_JS_DEBUG: newBStateData received.");

    // BUGFIX: Simpan bState saat ini sebagai previousBState SEBELUM di-update.
    // Ini adalah langkah paling krusial untuk mencegah animasi berulang.
    if (typeof bState === 'object' && bState !== null && Object.keys(bState).length > 0) {
        try {
            // DEEP COPY sangat penting di sini agar tidak hanya menjadi referensi.
            previousBState = JSON.parse(JSON.stringify(bState));
            wsLogger("MAIN_JS: previousBState has been successfully deep-copied from the current bState.");
        } catch (e) {
            wsLogger("MAIN_JS_ERROR: Could not deep-copy bState to previousBState. Error: " + e);
            previousBState = null; // Reset jika terjadi error.
        }
    } else {
        // Jika bState awal kosong, tidak ada state sebelumnya.
        previousBState = null;
        wsLogger("MAIN_JS_INFO: Current bState is empty, so previousBState is set to null.");
    }

    // Update bState global dengan data BARU
    bState = newBStateData;
    wsMode = "idle"; // Selalu reset wsMode ke idle setelah menerima state baru.

    wsLogger("MAIN_JS: Global bState updated. Calling refreshAllUIElements.");
    wsLogger("MAIN_JS_DEBUG: The previousBState being passed is " + (previousBState ? "DEFINED" : "NULL"));

    if (typeof refreshAllUIElements === "function") {
        // Kirim state sebelumnya untuk perbandingan di UI renderer
        refreshAllUIElements(previousBState); 
    } else {
        wsLogger("MAIN_JS_ERROR: refreshAllUIElements function is not defined!");
    }
};

/**
 * Initializes the WebScreen application.
 */
async function initializeApp() {
    wsLogOutputElement = document.getElementById('ws-log-output');
    elWsLoggerScreen = document.getElementById('ws-logger-screen');
    elCloseWsLoggerBtn = document.getElementById('close-ws-logger-btn');

    if (!wsLogOutputElement) {
        console.error("FATAL ERROR: Log output element #ws-log-output not found!");
        window.wsLogger = window.wsLogger || function(message) { console.log(`[WS_LOG_FALLBACK] ${message}`); };
    } else {
        wsLogOutputElement.textContent = '';
    }
    wsLogger("MAIN_JS: initializeApp starting. Logger ready.");

    initializeDOMReferences();

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
        window.gcpcRootPath = "";
        window.gcpcDataPath = "data/";
        window.gcpcPlaceholderPath = "mockup/";
        wsLogger(`MAIN_JS: PC Paths Initialized. Root: (relative), Data: ${window.gcpcDataPath}`);
    }

    // Memuat battle state awal
    let initialBattleData = window.battleState;
    let loadedFromTaskerOrMeta = false;

    if (initialBattleData) {
        if (typeof initialBattleData === 'string' && initialBattleData.trim() !== "" && initialBattleData.trim() !== "{}") {
            try {
                bState = JSON.parse(initialBattleData);
                loadedFromTaskerOrMeta = true;
                wsLogger("MAIN_JS: Initial battle state (string) loaded and parsed from Tasker/meta.");
            } catch (e) {
                wsLogger("MAIN_JS_ERROR: Failed to parse initial battleState string: " + e);
                bState = {};
            }
        } else if (typeof initialBattleData === 'object' && initialBattleData !== null && Object.keys(initialBattleData).length > 0) {
            bState = initialBattleData;
            loadedFromTaskerOrMeta = true;
            wsLogger("MAIN_JS: Initial battle state (object) loaded from Tasker/meta.");
        }
    }

    if (!loadedFromTaskerOrMeta || Object.keys(bState).length === 0) {
        wsLogger("MAIN_JS: No valid initial state from Tasker/meta. Loading MOCK JSON for PC.");
        try {
            const response = await fetch('mock_battle_state.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            bState = await response.json();
            wsLogger("MAIN_JS: Successfully loaded mock_battle_state.json.");
        } catch (e) {
            wsLogger("MAIN_JS_ERROR: Failed to load/parse mock_battle_state.json: " + e);
            bState = { battleState: "Error", battleMessage: "Failed to load any battle data.", units: [] };
        }
    }
    
    // Pada render pertama, tidak ada state sebelumnya.
    previousBState = null; 

    if (typeof refreshAllUIElements === "function") {
        refreshAllUIElements(null); // Kirim null karena ini load pertama
        wsLogger("MAIN_JS: Initial UI rendered.");
    } else {
        wsLogger("MAIN_JS_ERROR: refreshAllUIElements function not found!");
    }

    if (typeof initializeEventListeners === "function") {
        initializeEventListeners();
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
    elCopyWsLogBtn = document.getElementById('copy-ws-log-btn');
    elClearWsLogBtn = document.getElementById('clear-ws-log-btn');
    wsLogger("MAIN_JS: DOM elements referenced.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
