// --- turn_manager.js (Tasker - Final Correct Logic) ---
// TUGAS: Melakukan upkeep di AKHIR giliran untuk unit yang baru saja beraksi,
// lalu menentukan giliran berikutnya.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

// Helper: Fisher-Yates Shuffle (Tidak ada perubahan)
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

// Helper: Synchronize pseudoPos (Tidak ada perubahan)
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

// Helper: Check Battle End Condition (Tidak ada perubahan)
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
 * FUNGSI UPKEEP AKHIR GILIRAN (END-OF-TURN)
 * Memproses status efek HANYA untuk unit yang baru saja menyelesaikan gilirannya.
 * @param {object} unit - Objek unit yang gilirannya baru saja selesai.
 */
function processUpkeepAtEndOfTurn(unit) {
    if (!unit || !unit.statusEffects) return;

    scriptLogger(`UPKEEP (End-of-Turn): Memproses status efek untuk ${unit.name}.`);

    // Proses semua debuff (kurangi durasi)
    if (unit.statusEffects.debuffs) {
        unit.statusEffects.debuffs.forEach(effect => {
            if (typeof effect.duration === 'number') {
                effect.duration--;
            }
        });
        // Hapus debuff yang durasinya sudah habis
        unit.statusEffects.debuffs = unit.statusEffects.debuffs.filter(e => e.duration > 0);
    }
    
    // Proses semua buff (jika ada di masa depan)
    if (unit.statusEffects.buffs) {
        unit.statusEffects.buffs.forEach(effect => {
            if (typeof effect.duration === 'number') {
                effect.duration--;
            }
        });
        // Hapus buff yang durasinya sudah habis
        unit.statusEffects.buffs = unit.statusEffects.buffs.filter(e => e.duration > 0);
    }
}


// --- MAIN SCRIPT LOGIC (dengan alur yang benar) ---
let bState = null;
try {
    scriptLogger("TURN_MANAGER_INFO: Script started (Correct End-of-Turn Upkeep Logic).");
    bState = JSON.parse(battle_state);
    
    bState.lastActionDetails = null;
    const actorThatJustActedId = bState.activeUnitID;
    const unitThatJustActed = bState.units.find(u => u.id === actorThatJustActedId);

    // ====================================================================
    // LANGKAH 1: Lakukan upkeep pada unit yang BARU SAJA selesai beraksi.
    // ====================================================================
    if (unitThatJustActed) {
        processUpkeepAtEndOfTurn(unitThatJustActed);
    }

    // ====================================================================
    // LANGKAH 2: Lanjutkan dengan logika untuk menentukan giliran berikutnya.
    // ====================================================================
    bState._turnOrder = bState._turnOrder.filter(id => bState.units.find(u => u.id === id && u.status !== "Defeated"));

    if (checkBattleEnd(bState) || bState._turnOrder.length === 0) {
        scriptLogger("TURN_MANAGER: Pertempuran telah berakhir.");
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
            scriptLogger(`TURN_MANAGER: ${unitThatJustActed.name} akan beraksi lagi.`);
        } else {
            const nextUnitInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id)).find(u => u.status === "Idle");
            
            if (nextUnitInOrder) {
                nextActiveUnitId = nextUnitInOrder.id;
            } else {
                scriptLogger("TURN_MANAGER: Semua unit telah beraksi. Memulai ronde baru.");
                bState.round++;
                bState.turnInRound = 0;
                
                bState.units.forEach(u => {
                    if (u.status !== "Defeated") u.status = "Idle";
                });
                
                let newRoundOrder = bState.units.filter(u => u.status !== "Defeated").map(u => u.id);
                shuffleArray(newRoundOrder);
                bState._turnOrder = newRoundOrder;
                scriptLogger(`TURN_MANAGER: Urutan ronde baru: [${bState._turnOrder.join(', ')}]`);
                
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
            bState.battleMessage = `Giliran ${newActiveUnit.name}.`;
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
