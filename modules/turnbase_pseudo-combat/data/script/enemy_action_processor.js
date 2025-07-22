// --- enemy_action_processor.js (Complete with Pre-Action Status Check) ---

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

    if (typeof battle_state !== 'string' || !battle_state.trim()) {
        throw new Error("Input 'battle_state' is empty.");
    }
    bState = JSON.parse(battle_state);

    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) throw new Error("bState.activeUnitID not found.");

    const attacker = getUnitById(activeEnemyId, bState.units);
    if (!attacker) throw new Error(`Enemy with ID ${activeEnemyId} not found.`);

    // --- PRE-ACTION PREVENTION BLOCK ---
    // Check if the unit was already defeated by a prior effect (e.g., poison).
    if (attacker.stats.hp <= 0 || attacker.status === "Defeated") {
        scriptLogger(`Action cancelled for ${attacker.name} because HP is 0 or status is 'Defeated'.`);
        exit(); 
    }

    // Check for stun effect processed by the start-of-turn script.
    if (bState._unitIsStunned) {
        scriptLogger(`Action cancelled for ${attacker.name} due to active stun effect.`);
        bState.lastActionDetails = {
            actorId: activeEnemyId,
            commandId: "__STUNNED__",
            commandName: "Stunned",
            actionOutcome: "STUNNED"
        };
        delete bState._unitIsStunned; // Clean up the flag.
    } else {
        // --- NORMAL AI LOGIC ---
        scriptLogger(`Processing turn for ${attacker.name} (Role: ${attacker.role}).`);
        
        const aliveUnits = bState.units.filter(u => u.status !== 'Defeated');
        const numAlive = aliveUnits.length;
        let validTargetPseudoPositions = [];
        const attackerRole = attacker.role ? attacker.role.toLowerCase() : 'melee';

        if (attackerRole === 'ranged') {
            if (numAlive > 2) validTargetPseudoPositions.push(2);
            if (numAlive > 3) validTargetPseudoPositions.push(numAlive - 2);
        } else { // Melee or other roles default to adjacent attack.
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

} catch (e) {
    scriptLogger("ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Enemy AI Error: " + e.message;
}

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
