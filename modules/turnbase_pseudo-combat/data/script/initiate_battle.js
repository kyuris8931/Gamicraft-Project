// --- script_tasker/initiate_battle.js  ---
// Date Modified: 16-06-2025
// Description: Initializes the battle state for a new encounter.
// Includes: Stat application from progression data, initial turn order shuffling,
// and setting the first active unit and pseudo positions.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the base battle template.
// - progression_data: JSON string of the user's overall progression.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the fully initialized battle_state for Round 1.
// - js_script_log: Execution log for debugging.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

// 1. Helper: Fisher-Yates Shuffle
function shuffleArray(array) { /* ... (same as before) ... */
    try {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    } catch (e) {
        scriptLogger("INIT_BATTLE_SHUFFLE_ERROR: " + e.message);
    }
}

// 2. Helper: Update Pseudo Positions (Bipolar Linear, Active is 0)
function updateAllPseudoPositions(bState, orderedAliveUnitIdsThisRound) { /* ... (this function is correct from previous revisions, ensure to use it) ... */
    try {
        if (!bState || !bState.units || !bState.activeUnitID || !orderedAliveUnitIdsThisRound || orderedAliveUnitIdsThisRound.length === 0) {
            scriptLogger("PSEUDO_POS_UPDATE_ERROR: Missing data or empty order list for pseudoPos update.");
            return;
        }
        const activeUnitInRoundOrderIndex = orderedAliveUnitIdsThisRound.indexOf(bState.activeUnitID);
        if (activeUnitInRoundOrderIndex === -1) {
            scriptLogger(`PSEUDO_POS_UPDATE_ERROR: Active unit ${bState.activeUnitID} not in orderedAliveUnitIdsThisRound.`);
            bState.units.forEach(u => { if (u.status !== "Defeated") u.pseudoPos = 999; });
            return;
        }
        const numAliveInOrder = orderedAliveUnitIdsThisRound.length;
        for (let i = 0; i < numAliveInOrder; i++) {
            const unitIdInOrder = orderedAliveUnitIdsThisRound[i];
            const unitToUpdate = bState.units.find(u => u.id === unitIdInOrder);
            if (unitToUpdate) {
                let relativeIndex = (i - activeUnitInRoundOrderIndex + numAliveInOrder) % numAliveInOrder;
                let pseudoPosValue;
                if (relativeIndex === 0) {
                    pseudoPosValue = 0;
                } else if (relativeIndex <= numAliveInOrder / 2) {
                    pseudoPosValue = relativeIndex;
                } else {
                    pseudoPosValue = relativeIndex - numAliveInOrder;
                }
                unitToUpdate.pseudoPos = pseudoPosValue;
            }
        }
        scriptLogger("PSEUDO_POS_UPDATE: Initial pseudo positions updated (bipolar linear).");
    } catch (e) {
        scriptLogger("UPDATE_PSEUDO_POS_CRITICAL_ERROR: " + e.message + " Stack: " + e.stack);
    }
}


// --- MAIN SCRIPT LOGIC for Battle Initiation ---
try {
    let bState = null;
    taskerLogOutput = "";
    scriptLogger("INIT_BATTLE_INFO: Script started.");

    if (typeof battle_state === 'string' && battle_state.trim() !== "") {
        bState = JSON.parse(battle_state);
        scriptLogger("INIT_BATTLE_INFO: Parsed battle_state.");
    } else {
        throw new Error("Input 'battle_state' is empty, null, or not a string.");
    }

    if (typeof progression_data !== 'string' || !progression_data.trim()) {
        throw new Error("Input 'progression_data' is empty.");
    }
    const progressionData = JSON.parse(progression_data);
    scriptLogger("INIT_BATTLE_INFO: Parsed progression_data.");

    bState.round = 1;
    bState.turnInRound = 1;
    bState.battleState = "Ongoing";
    scriptLogger(`INIT_BATTLE_INFO: Set Round: ${bState.round}, TurnInRound: ${bState.turnInRound}, BattleState: ${bState.battleState}`);

    const aliveUnitIdsForFirstRound = [];
    if (bState.units && Array.isArray(bState.units)) {
        bState.units.forEach(unit => {
            if (unit.status !== "Defeated") {
                // Default all to Idle first
                unit.status = "Idle";
                aliveUnitIdsForFirstRound.push(unit.id);
            }
            unit.pseudoPos = 99;
        });
        scriptLogger(`INIT_BATTLE_INFO: Initialized status for ${aliveUnitIdsForFirstRound.length} alive units to Idle.`);
    } else {
        throw new Error("bState.units is missing or not an array.");
    }
    
    bState.progression_snapshot = progressionData;
    scriptLogger("INIT_BATTLE_INFO: Progression data snapshot injected into battle_state.");
    
    // Apply progression stats to units
    if (bState.units && Array.isArray(bState.units)) {
        const enemyGlobalLevel = progressionData.enemyProgression.globalLevel;

        bState.units.forEach(unit => {
            let unitProgression;
            let finalLevel;

            if (unit.type === 'Ally') {
                unitProgression = progressionData.heroes.find(h => h.id === unit.id);
                finalLevel = unitProgression ? unitProgression.level : 1;
                
                if (finalLevel > 1) {
                    const levelBonus = finalLevel - 1;
                    const statGrowth = (unit.id.includes("kyuris")) ? { hp: 1, atk: 1 } : { hp: 3, atk: 2 }; // Default growth for non-kyuris allies
                    unit.stats.maxHp += levelBonus * statGrowth.hp;
                    unit.stats.hp = unit.stats.maxHp; // Full heal at the start of battle
                    unit.stats.atk += levelBonus * statGrowth.atk;
                }

                // --- NEW ADDITION: Apply bonus stats from exercise progression ONLY for Kyuris ---
                if (unit.id.includes("kyuris") && progressionData.exerciseStatsProgression) {
                    scriptLogger(`INIT_BATTLE_INFO: Applying exercise progression for ${unit.name}.`);
                    
                    progressionData.exerciseStatsProgression.forEach(exercise => {
                        const exerciseLevel = exercise.level || 1;
                        if (exerciseLevel > 1) {
                            const statBonus = exerciseLevel - 1; // Bonus is (level - 1)
                            const statToBoost = exercise.stats;

                            switch (statToBoost) {
                                case "ATK":
                                    unit.stats.atk += statBonus;
                                    scriptLogger(`INIT_BATTLE_INFO: -> ${unit.name} gains +${statBonus} ATK from ${exercise.id} (Level ${exerciseLevel}). New ATK: ${unit.stats.atk}`);
                                    break;
                                case "HP":
                                    unit.stats.maxHp += statBonus;
                                    // Current HP also needs to be updated to the new maxHp
                                    unit.stats.hp = unit.stats.maxHp;
                                    scriptLogger(`INIT_BATTLE_INFO: -> ${unit.name} gains +${statBonus} MaxHP from ${exercise.id} (Level ${exerciseLevel}). New MaxHP: ${unit.stats.maxHp}`);
                                    break;
                                default:
                                    scriptLogger(`INIT_BATTLE_WARN: Unknown exercise stat type '${statToBoost}' for ${exercise.id}.`);
                                    break;
                            }
                        }
                    });
                }


            } else if (unit.type === 'Enemy') {
                finalLevel = enemyGlobalLevel;
                if (finalLevel > 1) {
                     const levelBonus = finalLevel - 1;
                     let statGrowth = { hp: 0, atk: 0 };
                     if(unit.tier === "Minion") statGrowth = { hp: 3, atk: 1 };
                     if(unit.tier === "Elite") statGrowth = { hp: 6, atk: 2 };
                     if(unit.tier === "Boss") statGrowth = { hp: 9, atk: 3 };

                     unit.stats.maxHp += levelBonus * statGrowth.hp;
                     unit.stats.hp = unit.stats.maxHp;
                     unit.stats.atk += levelBonus * statGrowth.atk;
                }
                // Update enemy expValue based on global level
                unit.expValue = (unit.expValue || 1) * finalLevel;
            }
             // Save final level for reference in UI if needed
            unit.level = finalLevel;
        });
        scriptLogger("INIT_BATTLE_INFO: Stats progression based on level has been applied.");
    }
    
    if (aliveUnitIdsForFirstRound.length > 0) {
        shuffleArray(aliveUnitIdsForFirstRound);
        bState._currentRoundInitialOrderIds = aliveUnitIdsForFirstRound;
        bState.activeUnitID = bState._currentRoundInitialOrderIds[0];
        scriptLogger("INIT_BATTLE_INFO: Shuffled. Order: " + bState._currentRoundInitialOrderIds.join(', '));
        scriptLogger(`INIT_BATTLE_INFO: First active unit ID: ${bState.activeUnitID}`);

        const firstActiveUnitObject = bState.units.find(u => u.id === bState.activeUnitID);
        if (firstActiveUnitObject) {
             firstActiveUnitObject.status = "Active";
             scriptLogger(`INIT_BATTLE_INFO: Status for ${firstActiveUnitObject.name} explicitly set to "Active" for testing turn_manager.`);
        }

        updateAllPseudoPositions(bState, bState._currentRoundInitialOrderIds);

        if (firstActiveUnitObject) {
            bState.battleMessage = `Battle Start! ${firstActiveUnitObject.name}'s turn.`;
        } else {
            bState.battleMessage = "Battle Start! Determining first turn...";
            scriptLogger("INIT_BATTLE_WARN: Could not find first active unit object for message after ID was set.");
        }
    } else {
        scriptLogger("INIT_BATTLE_ERROR: No alive units to start the battle. Setting battle to 'Error'.");
        bState.battleState = "Error";
        bState.battleMessage = "Error: No units to start battle.";
        bState.activeUnitID = null;
    }

    let finalActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (finalActiveUnit) {
        bState.activeUnitType = finalActiveUnit.type;
        bState.battleMessage = `${finalActiveUnit.name}'s turn.`;
    } else if (bState.battleState === "Ongoing") {
        bState.battleMessage = "Error: Active unit not found for message.";
        bState.activeUnitType = "Unknown";
        scriptLogger("TURN_MANAGER_ERROR: Active unit for message/type not found, battle 'Ongoing'.");
    } else {
        bState.activeUnitType = "None";
    }

    battle_state = JSON.stringify(bState);
    scriptLogger("INIT_BATTLE_INFO: Battle initiation complete. battle_state updated.");

} catch (e) {
    scriptLogger("INIT_BATTLE_GLOBAL_SCRIPT_ERROR: " + e.message + " Stack: " + e.stack);
    let errorBStateObject = {
        battleState: "Error",
        battleMessage: "Init Script Error: " + e.message.substring(0, 50),
        _scriptErrorLog: taskerLogOutput,
        _originalInputBattleState: (typeof battle_state === 'string' ? battle_state.substring(0,100) + "..." : "Not a string or empty")
    };
    battle_state = JSON.stringify(errorBStateObject);
}

var js_script_log = taskerLogOutput;