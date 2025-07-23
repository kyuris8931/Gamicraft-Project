// --- enemy_action_processor.js (v1.4 - Simplified Stun Logic) ---

let taskerLogOutput = "";
let wasTargetEliminated = false;

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[AI_PROC] ${message}\\n`;
}

function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

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
    scriptLogger("Script started.");
    bState = JSON.parse(battle_state);
    
    // Clear any action details from the start-of-turn effects if this script is running.
    // This prevents old popups from appearing if the enemy attacks normally.
    if (!bState._unitIsStunned) {
        bState.lastActionDetails = null;
    }

    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) throw new Error("bState.activeUnitID not found.");

    const attacker = getUnitById(activeEnemyId, bState.units);
    if (!attacker) throw new Error(`Enemy with ID ${activeEnemyId} not found.`);

    if (attacker.stats.hp <= 0 || attacker.status === "Defeated") {
        scriptLogger(`Action cancelled for ${attacker.name} because HP is 0 or status is 'Defeated'.`);
        exit(); 
    }

    // --- STUN LOGIC SIMPLIFIED ---
    // This script now only needs to check the flag. The popup is handled by the previous script.
    if (bState._unitIsStunned) {
        scriptLogger(`Action cancelled for ${attacker.name} due to active stun effect. The turn will be skipped.`);
        // No need to set lastActionDetails here anymore.
    } else {
    // --- END OF SIMPLIFICATION ---
        scriptLogger(`Processing turn for ${attacker.name} (Role: ${attacker.role}).`);
        
        const aliveUnits = bState.units.filter(u => u.status !== 'Defeated');
        const numAlive = aliveUnits.length;
        let validTargetPseudoPositions = [];
        const attackerRole = attacker.role ? attacker.role.toLowerCase() : 'melee';

        if (attackerRole === 'ranged') {
            if (numAlive > 2) validTargetPseudoPositions.push(2);
            if (numAlive > 3) validTargetPseudoPositions.push(numAlive - 2);
        } else {
            if (numAlive > 1) validTargetPseudoPositions.push(1);
            if (numAlive > 2) validTargetPseudoPositions.push(numAlive - 1);
        }
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
            
            bState.battleMessage = `${attacker.name} attacks ${chosenTarget.name} for ${damageResult.totalDamage} damage!`;
            bState.lastActionDetails = {
                actorId: activeEnemyId,
                commandId: "__BASIC_ATTACK__",
                commandName: "Basic Attack",
                targets: [chosenTarget.id],
                effectsSummary: [`${chosenTarget.name} (-${damageResult.totalDamage} HP)`]
            };
        } else {
            bState.battleMessage = `${attacker.name} has no targets in range.`;
            bState.lastActionDetails = { actorId: activeEnemyId, actionOutcome: "NO_TARGET_IN_RANGE" };
        }
    }
    
    // --- STUN BUG FIX: REACTIVE CLEANUP ---
    // Always clean up the flag at the end of this script, regardless of what happened.
    if (bState.hasOwnProperty('_unitIsStunned')) {
        delete bState._unitIsStunned;
        scriptLogger("Reactively cleaned up '_unitIsStunned' flag at the end of the action.");
    }
    // --- END OF FIX ---

} catch (e) {
    scriptLogger("ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Enemy AI Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;