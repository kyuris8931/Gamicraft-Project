// --- script_tasker/initiate_battle.js (Bulletproof & Defensive Version) ---
// This version wraps the entire script in a try-catch block to prevent silent crashes
// and provides extremely detailed logging for troubleshooting.

// Define final output variables at the top level
var battle_state;
var js_script_log = "--- Execution Log for initiate_battle.js ---\n";

try {
    // --- All functions are defined inside the try block ---

    function scriptLogger(message) {
        // Simple logger, as the main one is now js_script_log
        js_script_log += message + "\n";
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function updateOrdinalPositions(bState) {
        if (!bState?._turnOrder || !bState?.units) return;
        bState._turnOrder.forEach((unitId, index) => {
            const unit = bState.units.find(u => u.id === unitId);
            if (unit) unit.pseudoPos = index;
        });
        scriptLogger("OK: All pseudoPos values synchronized.");
    }

    function applyLevelProgression(unit, level) {
        if (!unit.stats) {
            scriptLogger(`-> WARNING: Unit ${unit.name || unit.id} is missing 'stats' object. Skipping level progression.`);
            return;
        }
        if (level <= 1) return;
        const levelBonus = level - 1;
        let statGrowth = { hp: 0, atk: 0 };
        if (unit.type === 'Ally') {
            // Added safety check for unit.id before using .includes()
            statGrowth = (unit.id && unit.id.includes("kyuris")) ? { hp: 1, atk: 0.25 } : { hp: 4, atk: 1 };
        } else if (unit.type === 'Enemy') {
            if (unit.tier === "Minion") statGrowth = { hp: 2, atk: 1 };
            else if (unit.tier === "Elite") statGrowth = { hp: 4, atk: 2 };
            else if (unit.tier === "Boss") statGrowth = { hp: 6, atk: 3 };
        }
        unit.stats.maxHp += levelBonus * statGrowth.hp;
        unit.stats.hp = unit.stats.maxHp;
        unit.stats.atk += levelBonus * statGrowth.atk;
    }

    function applyExerciseProgression(kyurisUnit, exerciseProgression) {
        if (!kyurisUnit?.stats || !Array.isArray(exerciseProgression) || !(kyurisUnit.id && kyurisUnit.id.includes("kyuris"))) return;
        exerciseProgression.forEach(exercise => {
            const exerciseLevel = exercise?.level || 1;
            if (exerciseLevel > 1) {
                const statBonus = exerciseLevel - 1;
                const statToBoost = exercise.stats;
                switch (statToBoost) {
                    case "ATK": kyurisUnit.stats.atk += statBonus; break;
                    case "HP": kyurisUnit.stats.maxHp += statBonus; kyurisUnit.stats.hp = kyurisUnit.stats.maxHp; break;
                }
            }
        });
    }

    // --- MAIN SCRIPT LOGIC ---
    scriptLogger("Step 1: Checking input variables...");
    
    // TROUBLESHOOTING: Log the type and content of input variables
    scriptLogger("-> Type of 'battle_state': " + typeof battle_state);
    scriptLogger("-> Type of 'progression_data': " + typeof progression_data);
    
    if (typeof battle_state !== 'string' || !battle_state.trim()) {
        throw new Error("Input 'battle_state' is not a valid string or is empty.");
    }
     if (typeof progression_data !== 'string' || !progression_data.trim()) {
        throw new Error("Input 'progression_data' is not a valid string or is empty.");
    }
    scriptLogger("OK: Input variables appear to be valid strings.");

    scriptLogger("Step 2: Parsing JSON data...");
    const bState = JSON.parse(battle_state);
    const progressionData = JSON.parse(progression_data);
    scriptLogger("OK: JSON parsing successful.");

    bState.round = 1;
    bState.turnInRound = 1;
    bState.battleState = "Ongoing";
    bState.progression_snapshot = progressionData;
    
    scriptLogger("Step 3: Applying stat progressions...");
    if (bState.units && Array.isArray(bState.units)) {
        const enemyGlobalLevel = progressionData?.enemyProgression?.globalLevel || 1;
        scriptLogger(`-> Enemy Global Level detected as: ${enemyGlobalLevel}`);

        bState.units.forEach((unit, index) => {
            if (!unit) {
                scriptLogger(`-> WARNING: Unit at index ${index} is null. Skipping.`);
                return;
            }
             if (!unit.id) {
                scriptLogger(`-> WARNING: Unit at index ${index} is missing an 'id'. Skipping.`);
                return;
            }

            let finalLevel = 1;
            if (unit.type === 'Ally') {
                if (Array.isArray(progressionData?.heroes)) {
                    const heroProgression = progressionData.heroes.find(h => h.id === unit.id);
                    finalLevel = heroProgression?.level || 1;
                }
                applyLevelProgression(unit, finalLevel);
                applyExerciseProgression(unit, progressionData.exerciseStatsProgression);
            } else if (unit.type === 'Enemy') {
                finalLevel = enemyGlobalLevel;
                applyLevelProgression(unit, finalLevel);
                unit.expValue = (unit.expValue || 1) * finalLevel;
            }
            unit.level = finalLevel;
        });
        scriptLogger("OK: Stat progressions applied.");
    } else {
        scriptLogger("WARNING: bState.units is missing or not an array. Skipping stat progression.");
    }
    
    scriptLogger("Step 4: Setting up initial turn order...");
    const initialTurnOrder = [];
    if(Array.isArray(bState.units)) {
        bState.units.forEach(unit => {
            if (unit?.status !== "Defeated") {
                unit.status = "Idle";
                initialTurnOrder.push(unit.id);
            }
        });
    }

    if (initialTurnOrder.length > 0) {
        shuffleArray(initialTurnOrder);
        bState._turnOrder = initialTurnOrder;
        bState.activeUnitID = bState._turnOrder[0];
        
        const firstActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
        if (firstActiveUnit) {
             firstActiveUnit.status = "Active";
             bState.activeUnitType = firstActiveUnit.type;
             bState.battleMessage = `Battle Start! ${firstActiveUnit.name}'s turn.`;
        }
        updateOrdinalPositions(bState);
        scriptLogger("OK: Initial turn order established.");
    } else {
        bState.battleState = "Error";
        bState.battleMessage = "Error: No units available to start the battle.";
        bState._turnOrder = [];
    }

    // Final state assignment if everything is successful
    battle_state = JSON.stringify(bState);
    scriptLogger("--- Script finished successfully! ---");

} catch (e) {
    // This block will execute if ANY error occurs anywhere in the script.
    js_script_log += "\n--- SCRIPT CRASHED ---\n";
    js_script_log += "ERROR: " + e.message + "\n";
    js_script_log += "STACK TRACE: " + e.stack + "\n";
    
    // Create a minimal error state to send back for easier debugging
    const errorState = {
        battleState: "Error",
        battleMessage: "initiate_battle.js script crashed.",
        _scriptErrorLog: js_script_log
    };
    battle_state = JSON.stringify(errorState);
}

// This line is now guaranteed to be reached.
