// --- turn_manager.js (Tasker - v2.2 - Zombie Bug Fixed) ---
// TASK: Ends the current turn, performs upkeep, cleans up defeated units,
// and correctly determines the next turn or starts a new round.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += `[TURN_MGR] ${message}\\n`; }

// Helper: Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Helper: Synchronize pseudoPos based on the _turnOrder array
function updateOrdinalPositions(bState) {
    if (!bState || !bState._turnOrder || !bState.units) { return; }
    bState._turnOrder.forEach((unitId, index) => {
        const unit = bState.units.find(u => u.id === unitId);
        if (unit) unit.pseudoPos = index;
    });
}

/**
 * END-OF-TURN UPKEEP FUNCTION
 * Reduces status effect durations ONLY for the unit that just finished its turn.
 * @param {object} bState - The battle_state object.
 * @param {string} actingUnitId - The ID of the unit whose turn has just ended.
 */
function processUpkeepAtEndOfTurn(bState, actingUnitId) {
    const unit = bState.units.find(u => u.id === actingUnitId);
    if (!unit || !unit.statusEffects) return;

    scriptLogger(`Running upkeep for ${unit.name}.`);
    
    const updateAndFilterEffects = (effectList) => {
        if (!effectList || effectList.length === 0) return [];
        effectList.forEach(effect => {
            if (typeof effect.duration === 'number') effect.duration--;
        });
        return effectList.filter(e => e.duration > 0 || typeof e.duration !== 'number');
    };

    unit.statusEffects.debuffs = updateAndFilterEffects(unit.statusEffects.debuffs);
    unit.statusEffects.buffs = updateAndFilterEffects(unit.statusEffects.buffs);

    // Sync global active_effects list
    if (bState.active_effects) {
        bState.active_effects = bState.active_effects.filter(activeEffect => {
            const targetUnit = bState.units.find(u => u.id === activeEffect.target_id);
            if (!targetUnit || !targetUnit.statusEffects) return false;
            const allEffects = [...(targetUnit.statusEffects.debuffs || []), ...(targetUnit.statusEffects.buffs || [])];
            return allEffects.some(effect => effect.name === activeEffect.name);
        });
    }
}

// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    scriptLogger("Script started.");
    bState = JSON.parse(battle_state);
    
    bState.lastActionDetails = null;
    const actorThatJustActedId = bState.activeUnitID;

    // STEP 1: Perform Upkeep (duration reduction) for the unit that just acted.
    processUpkeepAtEndOfTurn(bState, actorThatJustActedId);

    // STEP 2: Check for battle end conditions immediately after any potential status effect changes.
    const aliveAllies = bState.units.filter(u => u.type === 'Ally' && u.status !== 'Defeated').length;
    const aliveEnemies = bState.units.filter(u => u.type === 'Enemy' && u.status !== 'Defeated').length;

    if (aliveEnemies === 0 && aliveAllies > 0) {
        bState.battleState = "Win";
        bState.battleMessage = "Victory!";
        bState.activeUnitID = null;
    } else if (aliveAllies === 0) {
        bState.battleState = "Lose";
        bState.battleMessage = "Defeat...";
        bState.activeUnitID = null;
    } else {
        // If the battle continues, determine the next turn.
        
        // Clean the current turn order from any defeated units.
        bState._turnOrder = bState._turnOrder.filter(id => {
            const unit = bState.units.find(u => u.id === id);
            return unit && unit.status !== "Defeated";
        });

        const actorShouldActAgain = bState._actorShouldActAgain === actorThatJustActedId;
        delete bState._actorShouldActAgain;

        const unitThatJustActed = bState.units.find(u => u.id === actorThatJustActedId);
        if (unitThatJustActed && !actorShouldActAgain) {
            unitThatJustActed.status = "EndTurn";
        }
        
        let nextActiveUnitId = null;
        if (actorShouldActAgain) {
            nextActiveUnitId = actorThatJustActedId;
        } else {
            // Find the next unit in the current turn order that is still waiting to act.
            const nextUnitInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id)).find(u => u && u.status === "Idle");
            
            if (nextUnitInOrder) {
                // If found, they are the next active unit.
                nextActiveUnitId = nextUnitInOrder.id;
            } else {
                // If no one is left to act in this round, start a new one.
                scriptLogger("All units have acted. Starting a new round.");
                bState.round++;
                bState.turnInRound = 0;
                
                // --- ZOMBIE UNIT FIX ---
                // Before creating the new turn order, re-verify the status of all units based on HP.
                // This prevents "zombie" units if their status wasn't updated correctly in a previous step.
                scriptLogger("Running a safety check on all unit statuses before new round.");
                bState.units.forEach(u => {
                    if (u.stats.hp <= 0 && u.status !== "Defeated") {
                        u.status = "Defeated";
                        scriptLogger(`Safety check: Marked ${u.name} as Defeated due to HP being 0.`);
                    }
                });
                // --- END OF FIX ---
                
                // Reset status for ALL LIVING units.
                bState.units.forEach(u => {
                    if (u.status !== "Defeated") {
                        u.status = "Idle";
                    }
                });
                
                // Rebuild the turn order from the master list, now guaranteed to be clean.
                let newRoundOrder = bState.units
                    .filter(u => u.status !== "Defeated")
                    .map(u => u.id);
                
                shuffleArray(newRoundOrder);
                bState._turnOrder = newRoundOrder;
                scriptLogger(`New round order created with ${bState._turnOrder.length} units: [${bState._turnOrder.join(', ')}]`);
                
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
            bState.battleMessage = `${newActiveUnit.name}'s turn.`;
        }
        
        updateOrdinalPositions(bState);
    }
} catch (e) {
    scriptLogger("ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Turn Manager Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
