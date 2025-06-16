// --- script_tasker/process_basic_attack.js (Complete & Fixed Version) ---
// Description: Processes the Basic Attack action from the player.
// Includes: damage calculation, damage application, random SP generation,
// and tracking defeated enemies for progression system.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
// - actor_id: ID of the unit performing the Basic Attack.
// - target_id: ID of the unit targeted by the Basic Attack.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.
// - js_script_log: Execution log for debugging.
// - was_target_eliminated: Boolean, true if the target was successfully defeated.

let taskerLogOutput = "";
let wasTargetEliminated = false;

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}

// --- HELPER FUNCTIONS ---

function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

/**
 * Applies damage to the target, accounting for shield and tracking progression.
 * @param {object} targetUnit - Target unit object.
 * @param {number} damageAmount - Amount of damage.
 * @param {object} bStateRef - Reference to battle_state for progression tracking.
 * @returns {{totalDamage: number, shieldDamage: number, hpDamage: number}}
 */
function applyDamage(targetUnit, damageAmount, bStateRef) {
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

        // Track defeated enemies for progression
        if (targetUnit.type === "Enemy" && bStateRef._defeatedEnemiesThisBattle && !bStateRef._defeatedEnemiesThisBattle.some(e => e.id === targetUnit.id)) {
            const baseExp = bStateRef.units.find(u => u.id === targetUnit.id)?.expValue || 1;
            bStateRef._defeatedEnemiesThisBattle.push({
                id: targetUnit.id,
                tier: targetUnit.tier,
                expValue: baseExp
            });
            scriptLogger(`TRACKING: ${targetUnit.name} (Tier: ${targetUnit.tier}) added to progression list.`);
        }
    }
    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}

/**
 * Generates random SP and adds it to bState.
 * @param {object} bState - battle_state object to be modified.
 * @returns {number} Amount of SP generated.
 */
function generateSPForBasicAttack(bState) {
    let spGain = 0;
    const rand = Math.random();
        
    if (rand < 0.02) spGain = 5;      // 2% chance for 5 SP
    else if (rand < 0.10) spGain = 4; // 8% chance for 4 SP
    else if (rand < 0.27) spGain = 3; // 17% chance for 3 SP
    else if (rand < 0.55) spGain = 2; // 28% chance for 2 SP
    else spGain = 1;                  // 45% chance for 1 SP
    
    // Ensure teamSP and maxTeamSP exist before modifying
    if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
        bState.teamSP = Math.min(bState.teamSP + spGain, bState.maxTeamSP);
        return spGain;
    }
    
    scriptLogger("SP_GEN_WARN: bState.teamSP or bState.maxTeamSP is undefined. Failed to add SP.");
    return 0; // Failed to generate SP if state is invalid
}


// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("BASIC_ATTACK_PROC: Script started.");

    // 1. Validate and Parse Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' is empty.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' is empty.");
    if (typeof target_id !== 'string' || !target_id.trim()) throw new Error("Input 'target_id' is empty.");

    bState = JSON.parse(battle_state);
    // Initialize progression tracking array if not present
    if (!bState._defeatedEnemiesThisBattle) {
        bState._defeatedEnemiesThisBattle = [];
    }

    const attacker = getUnitById(actor_id, bState.units);
    const defender = getUnitById(target_id, bState.units);

    if (!attacker) throw new Error(`Actor with ID ${actor_id} not found.`);
    if (!defender) throw new Error(`Target with ID ${target_id} not found.`);
    if (attacker.status === "Defeated") throw new Error(`Actor ${attacker.name} is already defeated.`);
    if (defender.status === "Defeated") throw new Error(`Target ${defender.name} is already defeated.`);

    scriptLogger(`Actor: ${attacker.name}, Target: ${defender.name}`);

    // 2. Calculate and Apply Damage
    const damageDealt = attacker.stats.atk;
    const damageResult = applyDamage(defender, damageDealt, bState);
    scriptLogger(`DAMAGE: ${attacker.name} dealt ${damageResult.totalDamage} total damage.`);

    if (wasTargetEliminated) {
        scriptLogger(`KILL: ${defender.name} has been defeated!`);
    }
    
    // 3. Generate SP
    const spGained = generateSPForBasicAttack(bState);
    scriptLogger(`SP_GEN: Gained ${spGained} SP. Team SP now: ${bState.teamSP}/${bState.maxTeamSP}.`);
    
    // 4. Update Battle Message and Last Action Details
    bState.battleMessage = `${attacker.name} attacked ${defender.name}, dealing ${damageResult.totalDamage} damage. (+${spGained} SP)`;
    bState.lastActionDetails = {
        actorId: actor_id,
        commandId: "__BASIC_ATTACK__",
        commandName: "Basic Attack",
        targets: [target_id],
        effectsSummary: [`${defender.name} (-${damageResult.totalDamage} HP)`]
    };
    
    // 5. Set actor status to 'EndTurn'
    attacker.status = "EndTurn";
    scriptLogger(`STATUS: ${attacker.name}'s status changed to EndTurn.`);

} catch (e) {
    scriptLogger("BASIC_ATTACK_PROC_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Basic Attack Error: " + e.message;
}

// --- Output for Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;