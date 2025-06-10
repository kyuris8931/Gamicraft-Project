// --- initiate_battle.js (Tasker) ---
// Initializes the battle state for Round 1, Turn 1.
// Sets non-active alive units to "Idle", active unit to "Active",
// shuffles for initial turn order, sets active unit, and calculates pseudo positions.
// Assumes 'battle_state' (string) is available from Tasker global variable.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

// 1. Helper: Fisher-Yates Shuffle
function shuffleArray(array) { /* ... (sama seperti sebelumnya) ... */
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
function updateAllPseudoPositions(bState, orderedAliveUnitIdsThisRound) { /* ... (fungsi ini sudah benar dari revisi sebelumnya, pastikan menggunakannya) ... */
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

    if (aliveUnitIdsForFirstRound.length > 0) {
        shuffleArray(aliveUnitIdsForFirstRound);
        bState._currentRoundInitialOrderIds = aliveUnitIdsForFirstRound;
        bState.activeUnitID = bState._currentRoundInitialOrderIds[0];
        scriptLogger("INIT_BATTLE_INFO: Shuffled. Order: " + bState._currentRoundInitialOrderIds.join(', '));
        scriptLogger(`INIT_BATTLE_INFO: First active unit ID: ${bState.activeUnitID}`);

        // BARU: Set status unit yang aktif menjadi "Active" (atau biarkan "Idle" jika itu desainnya)
        const firstActiveUnitObject = bState.units.find(u => u.id === bState.activeUnitID);
        if (firstActiveUnitObject) {
            // Jika Anda ingin statusnya "Active" secara eksplisit:
            // firstActiveUnitObject.status = "Active";
            // scriptLogger(`INIT_BATTLE_INFO: Status for ${firstActiveUnitObject.name} set to Active.`);
            // Jika Anda ingin tetap "Idle" dan hanya mengandalkan bState.activeUnitID:
            // Biarkan saja, karena sudah di-set "Idle" di loop sebelumnya.
            // Untuk saat ini, mari kita coba TETAPKAN "Idle" agar konsisten dengan ide bahwa
            // activeUnitID adalah penentu utama, dan turn_manager akan mengubahnya ke "EndTurn".
            // Jika turn_manager error, kita perlu log dari sana.
            // Untuk tujuan debugging jika ini adalah sumber error di turn_manager:
             firstActiveUnitObject.status = "Active"; // COBA UBAH KE "Active"
             scriptLogger(`INIT_BATTLE_INFO: Status for ${firstActiveUnitObject.name} explicitly set to "Active" for testing turn_manager.`);

        }

        updateAllPseudoPositions(bState, bState._currentRoundInitialOrderIds);

        if (firstActiveUnitObject) { // Gunakan objek yang sudah ditemukan
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

        // Di dalam turn_manager.js, sebelum stringify terakhir
    let finalActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (finalActiveUnit) {
        bState.activeUnitType = finalActiveUnit.type; // MENAMBAHKAN INFORMASI TIPE UNIT AKTIF
        bState.battleMessage = `${finalActiveUnit.name}'s turn.`;
    } else if (bState.battleState === "Ongoing") {
        bState.battleMessage = "Error: Active unit not found for message.";
        bState.activeUnitType = "Unknown"; // Atau null
        scriptLogger("TURN_MANAGER_ERROR: Active unit for message/type not found, battle 'Ongoing'.");
    } else { // Battle ended
        bState.activeUnitType = "None"; // Atau sesuai kondisi akhir
    }

battle_state = JSON.stringify(bState);

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
