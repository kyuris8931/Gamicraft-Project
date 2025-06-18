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

/**
 * FUNGSI HELPER BARU: Memproses status efek di awal giliran unit.
 * Mengurangi durasi dan memeriksa status seperti Stun.
 * @param {object} unit - Objek unit yang akan diproses.
 * @param {object} bStateRef - Referensi ke battle_state untuk mengubah battleMessage.
 * @returns {boolean} True jika unit bisa beraksi, false jika tidak (misal, karena Stun).
 */
function processStatusEffectsOnTurnStart(unit, bStateRef) {
    if (!unit.statusEffects) return true; // Bisa beraksi jika tidak punya status efek.

    let canAct = true;
    const allEffects = [...(unit.statusEffects.buffs || []), ...(unit.statusEffects.debuffs || [])];

    allEffects.forEach(effect => {
        // Cek Stun
        if (effect.name === "Stun" && effect.duration > 0) {
            canAct = false;
            bStateRef.battleMessage = `${unit.name} is Stunned and cannot act!`;
            scriptLogger(`TURN_MANAGER: ${unit.name} terkena Stun, melewatkan giliran.`);
        }

        // Kurangi durasi
        if (typeof effect.duration === 'number' && effect.duration > 0) {
            effect.duration--;
            scriptLogger(`TURN_MANAGER: Durasi status '${effect.name}' pada ${unit.name} dikurangi menjadi ${effect.duration}.`);
        }
    });

    // Hapus efek yang durasinya habis
    if (unit.statusEffects.buffs) {
        unit.statusEffects.buffs = unit.statusEffects.buffs.filter(e => e.duration > 0);
    }
    if (unit.statusEffects.debuffs) {
        unit.statusEffects.debuffs = unit.statusEffects.debuffs.filter(e => e.duration > 0);
    }

    return canAct;
}


// --- LOGIKA UTAMA SKRIP ---
let bState = null;
taskerLogOutput = "";
scriptLogger("TURN_MANAGER_INFO: Script dimulai.");

try {
    if (typeof battle_state !== 'string' || !battle_state.trim()) { throw new Error("Input 'battle_state' kosong."); }
    bState = JSON.parse(battle_state);
    
    // Reset flag dari giliran sebelumnya
    if (bState.lastActionDetails) {
        bState.lastActionDetails = null;
    }

    // --- TAHAP 1: UPKEEP - Kelola semua status efek untuk SEMUA unit ---
    scriptLogger("TURN_MANAGER: Memulai fase Upkeep (pengurangan durasi status).");
    bState.units.forEach(unit => {
        if (unit.statusEffects) {
            const allEffects = [...(unit.statusEffects.buffs || []), ...(unit.statusEffects.debuffs || [])];
            allEffects.forEach(effect => {
                if (typeof effect.duration === 'number' && effect.duration > 0) {
                    effect.duration--;
                    scriptLogger(`TURN_MANAGER: Durasi '${effect.name}' pada ${unit.name} -> ${effect.duration}.`);
                }
            });
            // Hapus efek yang durasinya habis
            if (unit.statusEffects.buffs) unit.statusEffects.buffs = unit.statusEffects.buffs.filter(e => e.duration > 0);
            if (unit.statusEffects.debuffs) unit.statusEffects.debuffs = unit.statusEffects.debuffs.filter(e => e.duration > 0);
        }
    });


    // --- TAHAP 2: Tandai giliran yang baru saja selesai ---
    const unitThatJustActed = bState.units.find(u => u.id === bState.activeUnitID);
    if (unitThatJustActed && unitThatJustActed.status !== "Defeated") {
        unitThatJustActed.status = "EndTurn";
    }

    if (checkBattleEnd(bState)) {
        scriptLogger("TURN_MANAGER: Pertarungan berakhir.");
    } else {
        // --- TAHAP 3: Tentukan unit aktif berikutnya ---
        let nextUnitFound = false;

        // Cek 'act again'
        if (bState._actorShouldActAgain) {
            const actorId = bState._actorShouldActAgain;
            const actor = bState.units.find(u => u.id === actorId);
            if (actor) {
                actor.status = "Idle";
                bState.activeUnitID = actor.id;
                bState.battleMessage = `${actor.name} gets another turn!`;
                bState.turnInRound++;
                nextUnitFound = true;
            }
            delete bState._actorShouldActAgain;
        }

        // Jika tidak 'act again', cari unit berikutnya
        if (!nextUnitFound) {
            const aliveIdsInOrder = bState._currentRoundInitialOrderIds.filter(id => bState.units.find(u => u.id === id && u.status !== 'Defeated'));
            const lastActiveIndex = aliveIdsInOrder.indexOf(bState.activeUnitID);
            
            let nextUnitInRound = null;
            for (let i = 0; i < aliveIdsInOrder.length; i++) {
                const checkIndex = (lastActiveIndex + 1 + i) % aliveIdsInOrder.length;
                const unit = bState.units.find(u => u.id === aliveIdsInOrder[checkIndex]);
                // PERUBAHAN DI SINI: Tidak ada lagi pengecekan Stun.
                if (unit && unit.status === "Idle") {
                    nextUnitInRound = unit;
                    break;
                }
            }

            if (nextUnitInRound) {
                bState.activeUnitID = nextUnitInRound.id;
                bState.battleMessage = `${nextUnitInRound.name}'s turn.`;
                bState.turnInRound++;
            } else {
                // Ronde Baru
                bState.round++;
                bState.turnInRound = 1; // Reset turn counter
                const aliveIdsNewRound = bState.units.filter(u => u.status !== "Defeated").map(u => u.id);
                if (aliveIdsNewRound.length > 0) {
                    bState.units.forEach(u => { if (u.status !== "Defeated") u.status = "Idle"; });
                    shuffleArray(aliveIdsNewRound);
                    bState._currentRoundInitialOrderIds = aliveIdsNewRound;
                    const firstUnit = bState.units.find(u => u.id === aliveIdsNewRound[0]);
                    bState.activeUnitID = firstUnit.id;
                    bState.battleMessage = `${firstUnit.name}'s turn.`;
                } else {
                    checkBattleEnd(bState);
                }
            }
        }
        updateAllPseudoPositions(bState, bState._currentRoundInitialOrderIds.filter(id => bState.units.find(u => u.id === id && u.status !== 'Defeated')));
    }

    // Finalisasi state
    const finalActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (finalActiveUnit) {
        bState.activeUnitType = finalActiveUnit.type;
        const activeUnitIndexInArray = bState.units.findIndex(u => u.id === bState.activeUnitID);
        bState.activeUnitIndex = (activeUnitIndexInArray !== -1) ? activeUnitIndexInArray + 1 : 0;
    } else {
        bState.activeUnitType = "None";
        bState.activeUnitIndex = 0;
    }

} catch (e) {
    scriptLogger("TURN_MANAGER_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Turn Manager Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
