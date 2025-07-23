// --- turn_manager.js (Tasker - v2.5 - Group Effect Sync Fixed) ---
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
        if (!effectList) return [];
        effectList.forEach(effect => {
            if (effect.hasOwnProperty('duration')) {
                effect.duration--;
            }
        });
        return effectList.filter(effect => {
            return !effect.hasOwnProperty('duration') || effect.duration > 0;
        });
    };

    unit.statusEffects.debuffs = updateAndFilterEffects(unit.statusEffects.debuffs);
    unit.statusEffects.buffs = updateAndFilterEffects(unit.statusEffects.buffs);

    // --- PERBAIKAN BUG ADA DI SINI ---
    // Sync global active_effects list, now smarter about group effects.
    if (bState.active_effects) {
        bState.active_effects = bState.active_effects.filter(activeEffect => {
            // IF it's a group effect (has target_scope), ALWAYS keep it.
            // Its duration is handled by the other logic block.
            if (activeEffect.target_scope) {
                return true;
            }

            // IF it's an individual effect, run the original sync logic.
            const targetUnit = bState.units.find(u => u.id === activeEffect.target_id);
            if (!targetUnit || !targetUnit.statusEffects) {
                // The target might be defeated, so the effect should be cleaned up.
                return false;
            }
            
            // Check if the effect still exists in the unit's personal buff/debuff list.
            const allUnitEffects = [...(targetUnit.statusEffects.debuffs || []), ...(targetUnit.statusEffects.buffs || [])];
            return allUnitEffects.some(unitEffect => unitEffect.name === activeEffect.name);
        });
        scriptLogger("Global active_effects list has been synchronized correctly.");
    }
    // --- AKHIR DARI PERBAIKAN ---
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

    // STEP 1.5: Perform Upkeep for GLOBAL GROUP EFFECTS (Model A Logic)
    scriptLogger("Checking for global group effects to update...");
    const unitThatJustActed = bState.units.find(u => u.id === actorThatJustActedId);

    if (unitThatJustActed && bState.active_effects && bState.active_effects.length > 0) {
        bState.active_effects.forEach(effect => {
            if (!effect.target_scope || typeof effect.duration !== 'number') {
                return;
            }

            const isAllyTurn = unitThatJustActed.type === 'Ally';
            const isEnemyTurn = unitThatJustActed.type === 'Enemy';
            const isAllyEffect = effect.target_scope === 'team_allies';
            const isEnemyEffect = effect.target_scope === 'team_enemies';

            if ((isAllyTurn && isAllyEffect) || (isEnemyTurn && isEnemyEffect)) {
                effect.duration--;
                scriptLogger(`Decremented duration for group effect "${effect.source_item_name || effect.effect_id}". New duration: ${effect.duration}`);
            }
        });

        const initialEffectCount = bState.active_effects.length;
        bState.active_effects = bState.active_effects.filter(effect => {
            return !effect.target_scope || typeof effect.duration !== 'number' || effect.duration > 0;
        });
        if (bState.active_effects.length < initialEffectCount) {
            scriptLogger("Cleaned up expired group effects (duration reached 0).");
        }
    }

    // STEP 2: Check for battle end conditions.
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
        bState._turnOrder = bState._turnOrder.filter(id => {
            const unit = bState.units.find(u => u.id === id);
            return unit && unit.status !== "Defeated";
        });

        const actorShouldActAgain = bState._actorShouldActAgain === actorThatJustActedId;
        delete bState._actorShouldActAgain;

        if (unitThatJustActed && !actorShouldActAgain) {
            unitThatJustActed.status = "EndTurn";
        }
        
        let nextActiveUnitId = null;
        if (actorShouldActAgain) {
            nextActiveUnitId = actorThatJustActedId;
        } else {
            const nextUnitInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id)).find(u => u && u.status === "Idle");
            
            if (nextUnitInOrder) {
                nextActiveUnitId = nextUnitInOrder.id;
            } else {
                scriptLogger("All units have acted. Starting a new round.");
                bState.round++;
                bState.turnInRound = 0;
                
                scriptLogger("Running a safety check on all unit statuses before new round.");
                bState.units.forEach(u => {
                    if (u.stats.hp <= 0 && u.status !== "Defeated") {
                        u.status = "Defeated";
                        scriptLogger(`Safety check: Marked ${u.name} as Defeated due to HP being 0.`);
                    }
                });
                
                bState.units.forEach(u => {
                    if (u.status !== "Defeated") {
                        u.status = "Idle";
                    }
                });
                
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
