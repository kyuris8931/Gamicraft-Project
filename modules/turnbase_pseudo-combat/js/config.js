// js/config.js

// --- PWA CONFIGURATION ---
const PSEUDOMAP_MAX_VISIBLE_UNITS = 7; // Maximum visible units in PseudoMap before scroll
const NORMAL_ATTACK_RANGE = 1;         // Normal Attack range (PseudoPos +1 and -1 for this showcase)

// --- STATIC ASSET CACHE (Example/Fallback for PWA development) ---
// In a real implementation, Tasker will populate a similar structure via the 'initialAssetCache' meta tag.
// The Base64 strings below are very short and invalid examples, just for structure.
// Replace them with valid Base64 strings of your actual images or proper placeholders for testing.
// Example placeholder Base64 for a 1x1 pixel transparent PNG:
const tinyTransparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const staticAssetCache = {
  portraits: {
    "kyuris_default_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "KyurisCFG"),
    "tir_default_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "TirCFG"),
    "riou_default_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "RiouCFG"),
    "highland_soldier_default_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "HighlandCFG"),
    "luca_blight_default_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "LucaCFG"),
    // Add more placeholder portraitRefs if your staticBattleState (if you were to re-add it for testing) uses them
    "placeholder_ally_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "AllyPlh"),
    "placeholder_enemy_portrait": tinyTransparentPng.replace("NkYAAAAAYAAjCB0C8", "EnemyPlh")
  },
  ui_elements: {
    // Example for future use:
    // "diamond_frame_ally_base64": "data:image/png;base64,DiamondAllyBase64..."
  },
  sfx: {
    // Example for future use:
    // "attack_hit_sfx_base64": "data:audio/wav;base64,AttackHitSfxBase64..."
  }
};

// Note: staticBattleState has been removed.
// The PWA's main.js will now primarily expect initialBattleState to be populated
// by Tasker via the <meta name="autotoolswebscreen" id="initialBattleState" ... /> tag.
// If window.initialBattleState is empty or undefined, main.js might initialize
// bState to a very minimal default or show an error/waiting message.

// Global variable for logging (can be accessed by all JS modules)
let pwaLogOutputElement; // Will be initialized in main.js
function pwaLogger(message) {
    if (pwaLogOutputElement) {
        const timestamp = new Date().toLocaleTimeString().split(" ")[0];
        pwaLogOutputElement.textContent += `[${timestamp}] ${message}\n`;
        pwaLogOutputElement.scrollTop = pwaLogOutputElement.scrollHeight;
    }
    console.log(`[PWA_LOG] ${message}`);
}
