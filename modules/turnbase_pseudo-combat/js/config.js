// js/config.js
// Gamicraft WebScreen Configuration

// Default background color fallback
const DEFAULT_BACKGROUND_COLOR = '#f4f6f8'; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]

// Maximum visible units in pseudomap (example, not currently used by core logic for limit)
const MAX_VISIBLE_PSEUDOMAP_UNITS = 7;    // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]

// Maximum visible player heroes in deck (example, not currently used by core logic for limit)
const MAX_VISIBLE_PLAYER_HEROES = 3;    // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]

// staticAssetFilenames: Contains SIMPLE FILENAMES for placeholders.
// Full paths will be constructed by ui_renderer.js using window.gcpcPlaceholderPath.
const staticAssetFilenames = { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    portraits: { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        "placeholder_hero_portrait_head": "placeholder_hero_portrait_head.png", // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        "placeholder_enemy_portrait_head": "placeholder_enemy_portrait_head.png", // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        "placeholder_enemy_sprite_fullbody": "placeholder_enemy_sprite_fullbody.png", // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    },
    animations: { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        "default_attack_fx": "default_strike.gif" // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    }
};

// --- WebScreen Logger ---
let wsLogOutputElement = null; // This will be assigned in main.js to the <pre id="ws-log-output"> element
let accumulatedWsLogString = ""; // Global string to accumulate all log messages
const MAX_LOG_STRING_LENGTH = 250000; // Approx 250KB limit to prevent memory issues. Adjust as needed.
                                     // A typical character is 1-2 bytes.

/**
 * Logs a message to the WebScreen UI log element, the browser console,
 * and accumulates it into a global string.
 * @param {string} message - The message to log.
 */
function wsLogger(message) {
    // Create a timestamp with milliseconds for better debugging
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`;
    const logMessage = `[${timestamp}] ${message}`;

    // 1. Append to the UI log element (if it exists)
    if (wsLogOutputElement) {
        const newLogEntryDiv = document.createElement('div');
        newLogEntryDiv.textContent = logMessage;
        wsLogOutputElement.appendChild(newLogEntryDiv);

        // Auto-scroll to the bottom of the log element
        // Check if the element is actually scrollable and scrolled near the bottom
        const scrollThreshold = 10; // Pixels from bottom - KOREKSI DI SINI
        const isScrolledToBottom = wsLogOutputElement.scrollHeight - wsLogOutputElement.clientHeight <= wsLogOutputElement.scrollTop + scrollThreshold;
        
        if (isScrolledToBottom) {
             wsLogOutputElement.scrollTop = wsLogOutputElement.scrollHeight;
        }
    }

    // 2. Accumulate to the global string, with a length limit
    if (accumulatedWsLogString.length < MAX_LOG_STRING_LENGTH) {
        accumulatedWsLogString += logMessage + "\n"; // Add newline for readability in copied text
    } else {
        // Indicate truncation if limit is reached, but only once.
        const truncationMessage = "\n... (Log truncated due to length limit) ...\n";
        if (!accumulatedWsLogString.endsWith(truncationMessage)) {
            accumulatedWsLogString += truncationMessage;
        }
    }

    // 3. Log to the browser's developer console
    console.log(`[WS_LOG ${timestamp}] ${message}`);
}

/**
 * Retrieves the full accumulated log string.
 * @returns {string} The accumulated log messages.
 */
function getAccumulatedWsLog() {
    return accumulatedWsLogString;
}

/**
 * Clears the accumulated log string and the UI log display.
 */
function clearAccumulatedWsLog() {
    accumulatedWsLogString = ""; // Clear the string
    if (wsLogOutputElement) {
        wsLogOutputElement.innerHTML = ""; // Clear the UI display
    }
    wsLogger("Accumulated log cleared by user."); // Log this action
}

// --- Other Helper Functions (like toRoman) ---
/**
 * Converts a number to its Roman numeral representation.
 * @param {number} num - The number to convert.
 * @returns {string} The Roman numeral string, or the original number as a string if invalid.
 */
function toRoman(num) { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    if (typeof num !== 'number' || isNaN(num) || num < 1 || num >= 4000) { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        return String(num); // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    }
    const romanMap = [ // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 1000, numeral: "M" }, { value: 900, numeral: "CM" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 500, numeral: "D" }, { value: 400, numeral: "CD" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 100, numeral: "C" }, { value: 90, numeral: "XC" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 50, numeral: "L" }, { value: 40, numeral: "XL" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 10, numeral: "X" }, { value: 9, numeral: "IX" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 5, numeral: "V" }, { value: 4, numeral: "IV" }, // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        { value: 1, numeral: "I" } // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    ];
    let result = ''; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    let currentNum = num; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
    for (let i = 0; i < romanMap.length; i++) { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        while (currentNum >= romanMap[i].value) { // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
            result += romanMap[i].numeral; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
            currentNum -= romanMap[i].value; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
        }
    }
    return result; // [cite: uploaded:turnbase_pseudo-combat-v3/js/config.js]
}

// Initial log to confirm the file is loaded
// wsLogger function might not be fully ready if main.js hasn't assigned wsLogOutputElement yet,
// so this initial log might only go to console.log.
// It's better to call wsLogger for "config.js loaded" from main.js after wsLogOutputElement is set.
console.log("CONFIG_JS: config.js parsed (log accumulation logic included).");