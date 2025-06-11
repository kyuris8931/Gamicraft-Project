// --- turn_manager.js (Tasker - Corrected Linear Turn & EndTurn Logic) ---
// ... (fungsi helper shuffleArray, updateAllPseudoPositions, checkBattleEnd, getCurrentLinearOrder tetap sama seperti di Canvas sebelumnya) ...

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

// 1. Helper: Fisher-Yates Shuffle
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

// 2. Helper: Update Pseudo Positions (Bipolar Linear, Active is 0)
function updateAllPseudoPositions(bState, orderedAliveUnitIdsThisRound) {
    try {
        if (!bState || !bState.units || !bState.activeUnitID || !orderedAliveUnitIdsThisRound || orderedAliveUnitIdsThisRound.length === 0) {
            scriptLogger("PSEUDO_POS_UPDATE_ERROR: Missing data or empty order list for pseudoPos update in Turn Manager.");
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
        scriptLogger("PSEUDO_POS_UPDATE: Pseudo positions updated (bipolar linear) by Turn Manager.");
    } catch (e) {
        scriptLogger("UPDATE_PSEUDO_POS_CRITICAL_ERROR (Turn Manager): " + e.message + " Stack: " + e.stack);
    }
}

// 3. Helper: Check Battle End Condition
function checkBattleEnd(bState) {
    try {
        const aliveAllies = bState.units.filter(u => u.type === "Ally" && u.status !== "Defeated").length;
        const aliveEnemies = bState.units.filter(u => u.type === "Enemy" && u.status !== "Defeated").length;
        if (aliveEnemies === 0 && aliveAllies > 0) {
            bState.battleState = "Win"; bState.battleMessage = "Victory!"; return true;
        } else if (aliveAllies === 0) {
            bState.battleState = "Lose"; bState.battleMessage = "Defeat..."; return true;
        } else if (aliveEnemies === 0 && aliveAllies === 0) {
            bState.battleState = "Draw"; bState.battleMessage = "Draw!"; return true;
        }
        if (bState.battleState !== "Win" && bState.battleState !== "Lose" && bState.battleState !== "Draw") {
            bState.battleState = "Ongoing";
        }
        return false;
    } catch (e) {
        scriptLogger("CHECK_BATTLE_END_ERROR (Turn Manager): " + e.message);
        if (typeof bState === 'object' && bState !== null) { bState.battleState = "Error"; }
        return true;
    }
}

// 4. Helper: Get Linear Order of Alive Units based on current PseudoPos
function getCurrentLinearOrder(bState) {
    const aliveUnits = bState.units.filter(u => u.status !== "Defeated");
    return aliveUnits.sort((a, b) => {
        const pa = a.pseudoPos;
        const pb = b.pseudoPos;
        if (pa === 0) return -1;
        if (pb === 0) return 1;
        if (pa > 0 && pb > 0) return pa - pb;
        if (pa < 0 && pb < 0) return pa - pb;
        if (pa > 0 && pb < 0) return -1;
        if (pa < 0 && pb > 0) return 1;
        return 0;
    });
}

// --- MAIN SCRIPT LOGIC for Turn Management ---
let bState = null;
taskerLogOutput = "";
scriptLogger("TURN_MANAGER_INFO: Script started.");

try {
    // A. Log raw input and Parse JSON
    scriptLogger("TURN_MANAGER_DEBUG: Raw 'battle_state' input (first 300 chars): [" + (typeof battle_state === 'string' ? battle_state.substring(0,300) : typeof battle_state) + "]");
    if (typeof battle_state === 'string' && battle_state.trim() !== "") {
        bState = JSON.parse(battle_state);
        bState.lastActionDetails = null;
        scriptLogger("TURN_MANAGER_INFO: Parsed battle_state successfully.");
        // Log crucial properties immediately after parse
        scriptLogger(`TURN_MANAGER_DEBUG: Post-Parse - activeUnitID: ${bState.activeUnitID}, Round: ${bState.round}, TurnInRound: ${bState.turnInRound}, Units type: ${typeof bState.units}, Units length: ${bState.units ? bState.units.length : 'N/A'}`);
    } else {
        scriptLogger("TURN_MANAGER_ERROR: Input 'battle_state' is empty, null, or not a string. Value: [" + battle_state + "]");
        throw new Error("Input 'battle_state' is empty, null, or not a string.");
    }

    // B. Mark the unit that just acted
    // Check if bState.units is an array before calling .find
    if (!bState.units || !Array.isArray(bState.units)) {
        scriptLogger("TURN_MANAGER_ERROR: bState.units is not a valid array after parse.");
        throw new Error("bState.units is not an array.");
    }
    const unitThatJustActed = bState.units.find(u => u.id === bState.activeUnitID); // This is where the original error likely occurred if bState.units was undefined
    // ... (sisa logika utama sama seperti di Canvas tasker_turn_manager_v6_revised_order) ...
    // C. Check for battle end
    // D. Battle is Ongoing: Determine next turn or new round
    // F. Update battle message (if battle still ongoing)

    // (Salin sisa logika utama dari Langkah B hingga F dari versi sebelumnya ke sini, saya akan persingkat untuk respons ini)
    if (unitThatJustActed && unitThatJustActed.status !== "Defeated") {
        unitThatJustActed.status = "EndTurn";
        scriptLogger(`TURN_MANAGER_INFO: Unit ${unitThatJustActed.name} (ID: ${bState.activeUnitID}) status set to EndTurn.`);
    } else if (bState.activeUnitID) {
        scriptLogger(`TURN_MANAGER_WARN: Unit ${bState.activeUnitID} (acted) not found or already defeated.`);
    } else {
        scriptLogger("TURN_MANAGER_ERROR: bState.activeUnitID was undefined when trying to mark end turn.");
    }

    if (checkBattleEnd(bState)) {
        scriptLogger(`TURN_MANAGER_INFO: Battle ended. State: ${bState.battleState}`);
        let finalOrderIds = bState._currentRoundInitialOrderIds;
        if (!finalOrderIds || finalOrderIds.length === 0) {
            finalOrderIds = bState.units.filter(u => u.status !== "Defeated").map(u => u.id).sort();
        }
        if (bState.activeUnitID && !bState.units.find(u => u.id === bState.activeUnitID && u.status !== "Defeated")) {
            const firstAliveInFinalOrder = finalOrderIds.length > 0 ? bState.units.find(u => u.id === finalOrderIds[0] && u.status !== "Defeated") : null;
            bState.activeUnitID = firstAliveInFinalOrder ? firstAliveInFinalOrder.id : null;
        }
        if (bState.activeUnitID && finalOrderIds.length > 0) {
             updateAllPseudoPositions(bState, finalOrderIds);
        } else if (bState.units.some(u => u.status !== "Defeated")) {
            bState.units.forEach((u,i) => u.pseudoPos = (u.status !== "Defeated" ? i : 999) );
        } else {
            bState.units.forEach(u => u.pseudoPos = 999);
        }
    } else {
        let nextActiveUnitId = null;
        const currentLinearOrderUnits = getCurrentLinearOrder(bState);
        const currentLinearOrderIds = currentLinearOrderUnits.map(u => u.id);
        scriptLogger("TURN_MANAGER_DEBUG: Current linear order IDs: " + currentLinearOrderIds.join(', '));
        let indexOfUnitThatActed = unitThatJustActed ? currentLinearOrderIds.indexOf(unitThatJustActed.id) : -1;
        scriptLogger(`TURN_MANAGER_DEBUG: Index of acted unit (${unitThatJustActed ? unitThatJustActed.name : 'N/A'}): ${indexOfUnitThatActed}`);

        if (currentLinearOrderIds.length > 0 && indexOfUnitThatActed !== -1) {
            for (let i = 1; i <= currentLinearOrderIds.length; i++) {
                const checkIndex = (indexOfUnitThatActed + i) % currentLinearOrderIds.length;
                const potentialNextUnitId = currentLinearOrderIds[checkIndex];
                const potentialNextUnit = bState.units.find(u => u.id === potentialNextUnitId);
                if (potentialNextUnit && potentialNextUnit.status === "Idle") {
                    nextActiveUnitId = potentialNextUnit.id; break;
                }
            }
        } else if (currentLinearOrderIds.length > 0) {
            const firstIdleInOrder = currentLinearOrderUnits.find(u => u.status === "Idle");
            if (firstIdleInOrder) nextActiveUnitId = firstIdleInOrder.id;
        }

        if (nextActiveUnitId) {
            bState.activeUnitID = nextActiveUnitId;
            bState.turnInRound++;
            updateAllPseudoPositions(bState, currentLinearOrderIds);
            const nextUnitObj = bState.units.find(u=>u.id === bState.activeUnitID);
            scriptLogger(`TURN_MANAGER_INFO: Next turn: ${nextUnitObj ? nextUnitObj.name : 'Unknown'}. R${bState.round}-T${bState.turnInRound}`);
        } else {
            bState.round++;
            bState.turnInRound = 1;
            scriptLogger(`TURN_MANAGER_INFO: Starting New Round ${bState.round}`);
            const aliveIds = [];
            bState.units.forEach(u => { if (u.status !== "Defeated") { u.status = "Idle"; aliveIds.push(u.id); }});
            if (aliveIds.length > 0) {
                shuffleArray(aliveIds);
                bState._currentRoundInitialOrderIds = aliveIds;
                bState.activeUnitID = bState._currentRoundInitialOrderIds[0];
                updateAllPseudoPositions(bState, bState._currentRoundInitialOrderIds);
                const firstNewRoundUnit = bState.units.find(u => u.id === bState.activeUnitID);
                scriptLogger(`TURN_MANAGER_INFO: First turn of R${bState.round}: ${firstNewRoundUnit ? firstNewRoundUnit.name : 'Unknown'}`);
            } else {
                checkBattleEnd(bState);
                scriptLogger("TURN_MANAGER_ERROR: No alive units for new round.");
            }
        }
        if (bState.battleState === "Ongoing" && bState.activeUnitID) {
            const currentActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
            if (currentActiveUnit) bState.battleMessage = `${currentActiveUnit.name}'s turn.`;
            else { bState.battleMessage = "Error: Active unit error."; scriptLogger("TURN_MANAGER_ERROR: Active unit not found for message."); }
        }
    }

} catch (e) {
    scriptLogger("TURN_MANAGER_GLOBAL_SCRIPT_ERROR: " + e.message + " Stack: " + e.stack);
    if (typeof bState !== 'object' || bState === null) bState = { units: [], _scriptErrorLog: taskerLogOutput };
    bState.battleState = "Error";
    bState.battleMessage = "TurnManager Script Error: " + e.message.substring(0, 40);
}

try {
    if (typeof bState !== 'object' || bState === null) {
        scriptLogger("FINAL_STRINGIFY_ERROR: bState is not valid object.");
        throw new Error("bState became null or not an object.");
    }

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
} catch (e) {
    scriptLogger("FINAL_STRINGIFY_ERROR: Could not stringify final bState. Error: " + e.message);
    let errorBStateObject = { /* ... (sama seperti sebelumnya) ... */
        battleState: "Error", battleMessage: "Critical Error: Final state not serializable. " + e.message.substring(0, 30),
        _scriptErrorLog: taskerLogOutput,
        _originalActiveUnitID: (typeof bState === 'object' && bState !== null && bState.activeUnitID) ? bState.activeUnitID : "Unknown",
        _originalRound: (typeof bState === 'object' && bState !== null && bState.round) ? bState.round : 0,
        _originalTurn: (typeof bState === 'object' && bState !== null && bState.turnInRound) ? bState.turnInRound : 0
    };
    battle_state = JSON.stringify(errorBStateObject);
}

var js_script_log = taskerLogOutput;
