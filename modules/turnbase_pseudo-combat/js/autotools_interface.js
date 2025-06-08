// js/autotools_interface.js
// Contains functions for Web Screen to interact with Tasker,
// primarily sendCommandToTasker.
// The autoToolsUpdateValues function is now defined inline in index.html
// to ensure it's recognized by AutoTools for the "Update" toggle.

/**
 * Sends a command string to Tasker.
 * @param {string} commandId - The ID of the command/action (e.g., "PLAYER_ACTION").
 * @param {object|string} [payload=null] - Optional data to send. If an object, it's JSON.stringified.
 */
function sendCommandToTasker(commandId, payload = null) {
    let commandString = String(commandId); // Ensure commandId is a string
    if (payload !== null) {
        try {
            const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
            commandString = `${commandString}=:=${payloadString}`; // AutoTools command format
        } catch (e) {
            // Use wsLogger if available, otherwise console.log
            const logger = typeof wsLogger === 'function' ? wsLogger : console.log;
            logger(`COMMAND_SENDER_ERROR: Failed to stringify payload for command ${commandId}: ${e}. Sending command ID only.`);
        }
    }

    const commandPrefix = "GAMICRAFT_TBC_COMMAND"; // Match this prefix in your Tasker profile
    const logger = typeof wsLogger === 'function' ? wsLogger : console.log;
    logger(`COMMAND_SENDER: Sending to Tasker: Prefix="${commandPrefix}", Command="${commandString}"`);

    // Check for AutoToolsAndroid object on window or parent (for iframes)
    if (typeof window.AutoToolsAndroid !== 'undefined' && typeof window.AutoToolsAndroid.sendCommand === 'function') {
        window.AutoToolsAndroid.sendCommand(commandString, commandPrefix, false); // false for no default haptic feedback
    } else if (typeof window.parent !== 'undefined' && typeof window.parent.AutoToolsAndroid !== 'undefined' && typeof window.parent.AutoToolsAndroid.sendCommand === 'function') {
        window.parent.AutoToolsAndroid.sendCommand(commandString, commandPrefix, false);
    } else {
        logger("COMMAND_SENDER_ERROR: AutoToolsAndroid.sendCommand is not available. Command not sent to Tasker.");
        // You can add mock responses here for PC development if needed
        // e.g., if (commandId === "PLAYER_ACTION") { simulateTaskerResponseForAction(payload); }
    }
}

// Example of a function that might be called from your UI to trigger a Tasker command
// function performPlayerAttack(targetId) {
//     const activeUnit = getActiveUnit(); // Assuming getActiveUnit() is globally available or imported
//     if (activeUnit) {
//         sendCommandToTasker("PLAYER_ACTION", {
//             actorId: activeUnit.id,
//             commandId: "basic_attack_id", // Or get dynamically
//             actionType: "BasicAttack",
//             targetId: targetId
//         });
//     }
// }

// Log to confirm this minimal file is loaded.
if (typeof wsLogger === 'function') {
    wsLogger("AUTOTOOLS_INTERFACE_JS: Minimal autotools_interface.js loaded (update function is inline in HTML).");
} else {
    console.log("AUTOTOOLS_INTERFACE_JS: Minimal autotools_interface.js loaded (update function is inline in HTML).");
}
