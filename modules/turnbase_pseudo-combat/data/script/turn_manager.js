// --- turn_manager.js (Tasker - Final Correct Logic) ---
// TASK: Perform upkeep at the END of the turn for the unit that just acted,
// then determine the next turn.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

// Helper: Fisher-Yates Shuffle (No changes)
function shuffleArray(array) {
    try {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    } catch (e) {
        scriptLogger("SHUFFLE_ERROR: " + e.message);
    }
}

// Helper: Synchronize pseudoPos (No changes)
function updateOrdinalPositions(bState) {
    try {
        if (!bState || !bState._turnOrder || !bState.units) { return; }
        bState._turnOrder.forEach((unitId, index) => {
            const unit = bState.units.find(u => u.id === unitId);
            if (unit) unit.pseudoPos = index;
        });
        scriptLogger("ORDINAL_POS_UPDATE: All pseudoPos values synchronized.");
    } catch (e) {
        scriptLogger("UPDATE_ORDINAL_POS_CRITICAL_ERROR: " + e.message);
    }
}

// Helper: Check Battle End Condition (No changes)
function checkBattleEnd(bState) {
    try {
        const aliveAllies = bState.units.filter(u => u.type === "Ally" && u.status !== "Defeated").length;
        const aliveEnemies = bState.units.filter(u => u.type === "Enemy" && u.status !== "Defeated").length;
        if (aliveEnemies === 0 && aliveAllies > 0) {
            bState.battleState = "Win"; bState.battleMessage = "Victory!"; return true;
        } else if (aliveAllies === 0) {
            bState.battleState = "Lose"; bState.battleMessage = "Defeat..."; return true;
        }
        if (bState.battleState !== "Win" && bState.battleState !== "Lose") {
            bState.battleState = "Ongoing";
        }
        return false;
    } catch (e) {
        scriptLogger("CHECK_BATTLE_END_ERROR (Turn Manager): " + e.message);
        if (typeof bState === 'object' && bState !== null) { bState.battleState = "Error"; }
        return true;
    }
}

/**
 * END-OF-TURN UPKEEP FUNCTION
 * Processes status effects ONLY for the unit that just finished its turn.
 * @param {object} unit - The unit object whose turn just ended.
 */
function processUpkeepAtEndOfTurn(unit) {
    if (!unit || !unit.statusEffects) return;

    scriptLogger(`UPKEEP (End-of-Turn): Processing status effects for ${unit.name}.`);

    // Process all debuffs (reduce duration)
    if (unit.statusEffects.debuffs) {
        unit.statusEffects.debuffs.forEach(effect => {
            if (typeof effect.duration === 'number') {
                effect.duration--;
            }
        });
        // Remove debuffs with expired duration
        unit.statusEffects.debuffs = unit.statusEffects.debuffs.filter(e => e.duration > 0);
    }
    
    // Process all buffs (if applicable in the future)
    if (unit.statusEffects.buffs) {
        unit.statusEffects.buffs.forEach(effect => {
            if (typeof effect.duration === 'number') {
                effect.duration--;
            }
        });
        // Remove buffs with expired duration
        unit.statusEffects.buffs = unit.statusEffects.buffs.filter(e => e.duration > 0);
    }
}


// --- MAIN SCRIPT LOGIC (with correct flow) ---
let bState = null;
try {
    scriptLogger("TURN_MANAGER_INFO: Script started (Correct End-of-Turn Upkeep Logic).");
    bState = JSON.parse(battle_state);
    
    bState.lastActionDetails = null;
    const actorThatJustActedId = bState.activeUnitID;
    const unitThatJustActed = bState.units.find(u => u.id === actorThatJustActedId);

    // ====================================================================
    // STEP 1: Perform upkeep for the unit that JUST finished acting.
    // ====================================================================
    if (unitThatJustActed) {
        processUpkeepAtEndOfTurn(unitThatJustActed);
    }

    // ====================================================================
    // STEP 2: Continue with logic to determine the next turn.
    // ====================================================================
    bState._turnOrder = bState._turnOrder.filter(id => bState.units.find(u => u.id === id && u.status !== "Defeated"));

    if (checkBattleEnd(bState) || bState._turnOrder.length === 0) {
        scriptLogger("TURN_MANAGER: The battle has ended.");
        bState.activeUnitID = null;
    } else {
        const actorShouldActAgain = bState._actorShouldActAgain === actorThatJustActedId;
        delete bState._actorShouldActAgain;

        if (unitThatJustActed && !actorShouldActAgain) {
            unitThatJustActed.status = "EndTurn";
        }
        
        let nextActiveUnitId = null;

        if (actorShouldActAgain) {
            nextActiveUnitId = actorThatJustActedId;
            scriptLogger(`TURN_MANAGER: ${unitThatJustActed.name} will act again.`);
        } else {
            const nextUnitInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id)).find(u => u.status === "Idle");
            
            if (nextUnitInOrder) {
                nextActiveUnitId = nextUnitInOrder.id;
            } else {
                scriptLogger("TURN_MANAGER: All units have acted. Starting a new round.");
                bState.round++;
                bState.turnInRound = 0;
                
                bState.units.forEach(u => {
                    if (u.status !== "Defeated") u.status = "Idle";
                });
                
                let newRoundOrder = bState.units.filter(u => u.status !== "Defeated").map(u => u.id);
                shuffleArray(newRoundOrder);
                bState._turnOrder = newRoundOrder;
                scriptLogger(`TURN_MANAGER: New round order: [${bState._turnOrder.join(', ')}]`);
                
                nextActiveUnitId = bState._turnOrder[0];
            }
        }

        const newActiveIndex = bState._turnOrder.indexOf(nextActiveUnitId);
        if (newActiveIndex > 0) {
            const unitsToMove = bState._turnOrder.splice(0, newActiveIndex);
            bState._turnOrder.push(...unitsToMove);
        }
        
        bState.activeUnitID = bState._turnOrder[0];
        
        const newActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
        if (newActiveUnit) {
            newActiveUnit.status = "Active";
            bState.activeUnitType = newActiveUnit.type;
            bState.turnInRound++;
            bState.battleMessage = `Turn of ${newActiveUnit.name}.`;
        }
        
        updateOrdinalPositions(bState);
    }
} catch (e) {
    scriptLogger("TURN_MANAGER_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Turn Manager Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
