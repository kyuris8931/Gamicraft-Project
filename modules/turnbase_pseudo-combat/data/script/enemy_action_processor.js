// --- script_tasker/enemy_action_processor.js (Corrected with Final Range Logic) ---

let taskerLogOutput = "";
let wasTargetEliminated = false;

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}

// Helper: getUnitById (Tidak ada perubahan)
function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

// Helper: applyDamage (Tidak ada perubahan)
function applyDamage(targetUnit, damageAmount) {
    let remainingDamage = Math.round(damageAmount);
    let shieldDamageDealt = 0;
    let hpDamageDealt = 0;
    if (targetUnit.stats.shieldHP && targetUnit.stats.shieldHP > 0) {
        shieldDamageDealt = Math.min(targetUnit.stats.shieldHP, remainingDamage);
        targetUnit.stats.shieldHP -= shieldDamageDealt;
        remainingDamage -= shieldDamageDealt;
    }
    if (remainingDamage > 0) {
        hpDamageDealt = Math.min(targetUnit.stats.hp, remainingDamage);
        targetUnit.stats.hp -= hpDamageDealt;
    }
    if (targetUnit.stats.hp <= 0) {
        targetUnit.stats.hp = 0;
        targetUnit.status = "Defeated";
        wasTargetEliminated = true;
    }
    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}

// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("ENEMY_AI: Script started (Final Range Logic).");

    if (typeof battle_state !== 'string' || !battle_state.trim()) {
        throw new Error("Input 'battle_state' is empty.");
    }
    bState = JSON.parse(battle_state);

    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) throw new Error("bState.activeUnitID not found.");

    const attacker = getUnitById(activeEnemyId, bState.units);
    if (!attacker) throw new Error(`Enemy with ID ${activeEnemyId} not found.`);

    const stunEffect = attacker.statusEffects?.debuffs?.find(e => e.name === "Stun");

    if (stunEffect) {
        scriptLogger(`ENEMY_AI: ${attacker.name} terkena Stun. Melewatkan giliran.`);
        bState.battleMessage = `${attacker.name} terkena Stun!`;
        bState.lastActionDetails = {
            actorId: activeEnemyId,
            commandId: "__STUNNED__",
            commandName: "Stunned",
            actionOutcome: "STUNNED"
        };
        // Durasi stun akan dikurangi oleh turn_manager di akhir giliran ini.
    } else {
        scriptLogger(`ENEMY_AI: Giliran untuk ${attacker.name} (Role: ${attacker.role}).`);
        
        const aliveUnits = bState.units.filter(u => u.status !== 'Defeated');
        const numAlive = aliveUnits.length;
        let validTargetPseudoPositions = [];
        const attackerRole = attacker.role ? attacker.role.toLowerCase() : 'melee';

        // --- PERBAIKAN LOGIKA JARAK SERANG DI SINI ---
        if (attackerRole === 'ranged') {
            // Ranged HANYA bisa menyerang pada Jarak 2
            scriptLogger(`ENEMY_AI: ${attacker.name} adalah Ranged. Menargetkan jarak 2.`);
            if (numAlive > 2) validTargetPseudoPositions.push(2); // Jarak 2 ke depan (posisi ke-2)
            if (numAlive > 3) validTargetPseudoPositions.push(numAlive - 2); // Jarak 2 ke belakang (posisi ke n-2)
        } else {
            // Melee (atau role lain) HANYA bisa menyerang pada Jarak 1
            scriptLogger(`ENEMY_AI: ${attacker.name} adalah Melee. Menargetkan jarak 1.`);
            if (numAlive > 1) validTargetPseudoPositions.push(1); // Jarak 1 ke depan (posisi ke-1)
            if (numAlive > 2) validTargetPseudoPositions.push(numAlive - 1); // Jarak 1 ke belakang (posisi ke n-1)
        }
        // --- AKHIR PERBAIKAN ---

        validTargetPseudoPositions = [...new Set(validTargetPseudoPositions)];
        
        const potentialTargets = aliveUnits.filter(unit =>
            unit.type === "Ally" &&
            validTargetPseudoPositions.includes(unit.pseudoPos)
        );

        if (potentialTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * potentialTargets.length);
            const chosenTarget = potentialTargets[randomIndex];
            const damageDealt = attacker.stats.atk;
            const damageResult = applyDamage(chosenTarget, damageDealt);
            
            bState.battleMessage = `${attacker.name} menyerang ${chosenTarget.name} sebesar ${damageResult.totalDamage} damage!`;
            bState.lastActionDetails = {
                actorId: activeEnemyId,
                commandId: "__BASIC_ATTACK__",
                commandName: "Basic Attack",
                targets: [chosenTarget.id],
                effectsSummary: [`${chosenTarget.name} (-${damageResult.totalDamage} HP)`]
            };
        } else {
            bState.battleMessage = `${attacker.name} tidak memiliki target dalam jangkauan.`;
            bState.lastActionDetails = { actorId: activeEnemyId, actionOutcome: "NO_TARGET_IN_RANGE" };
        }
    }

} catch (e) {
    scriptLogger("ENEMY_AI_ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Enemy AI Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
