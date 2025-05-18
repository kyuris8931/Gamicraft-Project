// js/autotools_interface.js

// --- Global PWA State Variables (expected to be defined in main.js or globally) ---
// let bState = {};
// let assetCache = {};
// let pwaMode = "idle"; // To be reset on major updates

/**
 * This function is called by Tasker (via AutoTools Web Screen)
 * to update the PWA's data.
 * 'values' will be an object containing properties that match the 'id'
 * of the <meta name="autotoolswebscreen" ... /> tags in index.html,
 * or the keys sent via an "Update Web Screen" action in Tasker.
 *
 * For our setup, we expect:
 * values.initialBattleState (or a similar name if Tasker sends updates with a different key)
 * values.initialAssetCache (or a similar name if Tasker sends updates with a different key)
 */
function autoToolsUpdateValues(values) {
    pwaLogger("AUTOTOOLS_INTERFACE: autoToolsUpdateValues called by Tasker.");

    let newBattleStateReceived = false;
    let newAssetCacheReceived = false;

    // Log the raw values received for debugging
    let logValues = {};
    if (values.initialBattleState) logValues.initialBattleState = "(Battle State JSON received)";
    if (values.initialAssetCache) logValues.initialAssetCache = "(Asset Cache JSON received)";
    // Add any other keys you expect Tasker to send for logging
    if (values.jsonDataBattle) logValues.jsonDataBattle = "(jsonDataBattle received - possible update key)";


    pwaLogger("AUTOTOOLS_INTERFACE: Data from Tasker: " + JSON.stringify(Object.keys(values).length > 0 ? logValues : "Empty values object"));

    // Process initialAssetCache (typically sent once or when assets change)
    // Tasker might send this with the key 'initialAssetCache' from the meta tag,
    // or a different key if it's an update.
    const assetCacheDataKey = values.initialAssetCache ? 'initialAssetCache' : (values.assetCache ? 'assetCache' : null);
    if (assetCacheDataKey && values[assetCacheDataKey]) {
        try {
            let parsedAssetCache;
            if (typeof values[assetCacheDataKey] === 'string') {
                parsedAssetCache = JSON.parse(values[assetCacheDataKey]);
            } else if (typeof values[assetCacheDataKey] === 'object') {
                parsedAssetCache = values[assetCacheDataKey]; // Assume already an object
            } else {
                pwaLogger("AUTOTOOLS_INTERFACE_ERROR: Asset cache data is not a string or object.");
                parsedAssetCache = null;
            }

            if (parsedAssetCache) {
                // Only update if significantly different or if assetCache is empty
                // For simplicity now, we'll just assign. A more complex diff could be used.
                assetCache = parsedAssetCache; // Update global PWA assetCache
                newAssetCacheReceived = true;
                pwaLogger("AUTOTOOLS_INTERFACE: Asset cache updated from Tasker.");
            }
        } catch (e) {
            pwaLogger("AUTOTOOLS_INTERFACE_ERROR: Error parsing asset cache from Tasker: " + e);
        }
    }


    // Process initialBattleState (or jsonDataBattle for subsequent updates)
    // Tasker might send this with the key 'initialBattleState' from the meta tag,
    // or 'jsonDataBattle' (or similar) for updates.
    const battleStateDataKey = values.initialBattleState ? 'initialBattleState' : (values.jsonDataBattle ? 'jsonDataBattle' : null);
    if (battleStateDataKey && values[battleStateDataKey]) {
        let newBState;
        try {
            if (typeof values[battleStateDataKey] === 'string') {
                newBState = JSON.parse(values[battleStateDataKey]);
            } else if (typeof values[battleStateDataKey] === 'object') {
                newBState = values[battleStateDataKey]; // Assume already an object
            } else {
                pwaLogger("AUTOTOOLS_INTERFACE_ERROR: Battle state data is not a string or object.");
                newBState = null;
            }

            if (newBState) {
                // Basic check for actual change to avoid unnecessary full re-renders
                // if (JSON.stringify(bState) !== JSON.stringify(newBState)) {
                    bState = newBState; // Update global PWA battle state
                    pwaMode = "idle";   // Reset PWA mode on any major state update from Tasker
                    newBattleStateReceived = true;
                    pwaLogger("AUTOTOOLS_INTERFACE: Battle state (bState) updated from Tasker.");
                // } else {
                //     pwaLogger("AUTOTOOLS_INTERFACE: New battle state is identical to current bState. No main update.");
                // }
            }
        } catch (e) {
            pwaLogger("AUTOTOOLS_INTERFACE_ERROR: Error parsing battle state from Tasker: " + e);
        }
    }

    // If battle state was updated, refresh the entire UI
    if (newBattleStateReceived) {
        if (typeof refreshAllUIElements === "function") {
            // Handle animations based on lastActionDetails *before* full refresh might be better
            // so the UI can show the "before" state briefly for the animation source.
            // However, refreshAllUIElements will redraw based on the new state.

            // Trigger animations if details are present in the new bState
            if (bState.lastActionDetails) {
                const { attackerId, targetId, damageDealt, actionType } = bState.lastActionDetails;
                pwaLogger(`AUTOTOOLS_INTERFACE: Processing lastActionDetails - Attacker: ${attackerId}, Target: ${targetId}, Damage: ${damageDealt}, Action: ${actionType}`);

                if (attackerId && actionType === "NormalAttack") {
                    const attackerUnit = getUnitById(attackerId); // Helper from ui_renderer.js
                    if (attackerUnit && typeof animateUnitAction === "function") {
                        animateUnitAction(attackerId, attackerUnit.type === "Ally" ? "attack_ally" : "attack_enemy");
                    }
                }
                if (targetId && damageDealt > 0) {
                    if (typeof animateUnitAction === "function") animateUnitAction(targetId, "hit");
                    if (typeof showDamagePopup === "function") showDamagePopup(targetId, damageDealt);
                }
                // Clear lastActionDetails after processing to prevent re-animation on no-change updates
                // This should ideally be handled by Tasker not sending it again, or PWA having a flag.
                // For now, we assume Tasker sends it only when relevant for the immediate last action.
            }
            
            refreshAllUIElements();
        } else {
            pwaLogger("AUTOTOOLS_INTERFACE_ERROR: refreshAllUIElements function not found!");
        }
    } else if (newAssetCacheReceived && Object.keys(bState).length > 0) {
        // If only asset cache was updated but a battle state exists, still refresh UI
        // as image sources might have changed.
        if (typeof refreshAllUIElements === "function") {
            refreshAllUIElements();
            pwaLogger("AUTOTOOLS_INTERFACE: Asset cache updated, refreshing UI.");
        }
    }

    // Update battle message if sent separately (less common if full state is sent)
    if (values.BattleMessage && elBattleMessageArea && (!newBattleStateReceived || bState.BattleMessage !== values.BattleMessage)) {
        elBattleMessageArea.textContent = values.BattleMessage;
        pwaLogger("AUTOTOOLS_INTERFACE: BattleMessage updated separately.");
    }
}

/**
 * Sends a command to Tasker.
 * @param {string} commandId - The ID of the command/action (e.g., "normal_attack_kyuris", "QuitBattleAction").
 * @param {string | null} targetUnitId - The ID of the target unit, if applicable.
 */
function sendCommandToTasker(commandId, targetUnitId = null) {
    const activeHero = getActiveHeroFromState(); // From ui_renderer.js or global
    if (!activeHero && commandId !== 'QuitBattleAction') { // Allow QuitBattleAction even if no active hero
        pwaLogger("COMMAND_SENDER_ERROR: Cannot send command, no active hero identified.");
        return;
    }

    const actorId = activeHero ? activeHero.id : "PWA_System"; // Fallback actor for system actions like quit

    // Format: ActorID=:=CommandID=:=TargetID
    const commandParams = [
        actorId,
        commandId,
        targetUnitId || "" // Send empty string if no targetId
    ];
    const commandString = commandParams.join("=:=\");
    const commandPrefix = "TBC_PLAYER_ACTION"; // Consistent prefix for Tasker profile

    pwaLogger(`COMMAND_SENDER: Sending to Tasker: ${commandPrefix}=:=${commandString}`);

    // Check for AutoTools bridge (standard and parent for iframe scenarios)
    if (window.AutoTools && typeof window.AutoTools.sendCommand === 'function') {
        window.AutoTools.sendCommand(commandString, commandPrefix, false); // false for no haptic feedback
    } else if (window.parent && window.parent.AutoTools && typeof window.parent.AutoTools.sendCommand === 'function') {
        window.parent.AutoTools.sendCommand(commandString, commandPrefix, false);
    } else {
        pwaLogger("COMMAND_SENDER_ERROR: AutoTools.sendCommand is not available. Command not sent.");
        // --- For PWA-only testing without Tasker ---
        // You can uncomment and expand simulateTaskerResponse for testing.
        // if (typeof simulateTaskerResponse === "function") {
        //     simulateTaskerResponse(commandPrefix, commandString);
        // }
        // --- End PWA-only testing ---
    }
}

/*
// --- Optional: Function to simulate Tasker's response for PWA-only testing ---
// This would need to be significantly expanded to be useful.
function simulateTaskerResponse(prefix, commandStr) {
    pwaLogger(`SIMULATE_TASKER: Received command: ${prefix}=:=${commandStr}`);
    const params = commandStr.split("=:=");
    const actorId = params[0];
    const actionId = params[1];
    const targetId = params[2];

    // Create a deep copy of the current bState to modify
    let nextState = JSON.parse(JSON.stringify(bState));

    const attacker = nextState.Units.find(u => u.id === actorId);
    const target = nextState.Units.find(u => u.id === targetId);

    if (actionId.includes("normal_attack") && attacker && target && target.status !== "Defeated") {
        const damage = attacker.stats.ATK;
        target.stats.HP = Math.max(0, target.stats.HP - damage);
        nextState.BattleMessage = `${attacker.name} attacks ${target.name} for ${damage} damage!`;
        
        nextState.lastActionDetails = { attackerId: actorId, targetId: targetId, damageDealt: damage, actionType: "NormalAttack" };

        if (target.stats.HP === 0) {
            target.status = "Defeated";
            target.pseudoPos = null; // Remove from active play
            target.turnOrder = null;
            nextState.BattleMessage += ` ${target.name} has been defeated!`;
            nextState.lastActionDetails.actionType = "UnitDefeated";
        }
    } else if (actionId === "QuitBattleAction") {
        nextState.BattleState = "Lose"; // Or some other defined end state
        nextState.BattleMessage = "Player quit the battle.";
    }

    // Simulate very basic turn progression (Tasker's turn_manager.js would do this properly)
    if (nextState.BattleState === "Ongoing") {
        const currentActiveUnitIndex = nextState.Units.findIndex(u => u.id === nextState.ActiveUnitID);
        if (currentActiveUnitIndex !== -1) {
            nextState.Units[currentActiveUnitIndex].status = "EndTurn";
        }
        
        let nextActiveFound = false;
        let nextTurnOrder = Infinity;
        let nextActiveUnitId = null;

        // Find next unit by turnOrder among Idle units
        const livingIdleUnits = nextState.Units.filter(u => u.status === "Idle");
        if (livingIdleUnits.length > 0) {
            livingIdleUnits.sort((a,b) => a.turnOrder - b.turnOrder);
            nextActiveUnitId = livingIdleUnits[0].id;
            nextActiveFound = true;
        } else { // If no Idle, check if all living units are EndTurn (new round)
            const livingUnits = nextState.Units.filter(u => u.status !== "Defeated");
            if (livingUnits.every(u => u.status === "EndTurn")) {
                nextState.Round++;
                nextState.TurnInRound = 1;
                livingUnits.forEach(u => {
                    u.status = "Idle";
                    // Re-shuffle turnOrder (simplified: just use existing or re-assign sequentially)
                    // Tasker would do a proper shuffle.
                });
                if (livingUnits.length > 0) {
                    livingUnits.sort((a,b) => a.turnOrder - b.turnOrder); // Assume turnOrder is still somewhat valid
                    nextActiveUnitId = livingUnits[0].id;
                    nextActiveFound = true;
                }
            }
        }

        if (nextActiveFound) {
            nextState.ActiveUnitID = nextActiveUnitId;
            const newActiveUnit = nextState.Units.find(u => u.id === nextActiveUnitId);
            newActiveUnit.status = "Active";
            // Recalculate pseudoPos relative to new active unit (simplified)
            const activeUnitIndex = nextState.Units.indexOf(newActiveUnit);
            nextState.Units.forEach((u,idx) => {
                if (u.status !== "Defeated") u.pseudoPos = idx - activeUnitIndex;
            });

            nextState.BattleMessage = `${newActiveUnit.name}'s turn.`;
        } else { // No one left to act, check win/loss
            const livingAllies = nextState.Units.filter(u => u.type === "Ally" && u.status !== "Defeated").length;
            const livingEnemies = nextState.Units.filter(u => u.type === "Enemy" && u.status !== "Defeated").length;
            if (livingEnemies === 0 && livingAllies > 0) nextState.BattleState = "Win";
            else if (livingAllies === 0) nextState.BattleState = "Lose";
        }
    }


    // Simulate Tasker sending the updated state back
    pwaLogger("SIMULATE_TASKER: Sending updated state back to PWA in 0.5s...");
    setTimeout(() => {
        // Use a different key to avoid confusion with actual Tasker updates if both are active
        autoToolsUpdateValues({ jsonDataBattle: nextState }); 
    }, 500);
}
*/
