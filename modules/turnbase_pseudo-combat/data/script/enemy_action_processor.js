// --- script_tasker/enemy_action_processor.js ---
// Description: This script ONLY processes enemy turns.
// This version adds a Stun check at the beginning as the main gate.

let taskerLogOutput = "";
let wasTargetEliminated = false;
function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}

function getUnitById(unitId, unitsArray) { if (!unitId || !Array.isArray(unitsArray)) return null; return unitsArray.find(u => u.id === unitId); }
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
    } 
    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt }; 
}

// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("ENEMY_AI: Script started.");

    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' is empty.");
    bState = JSON.parse(battle_state);
    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) throw new Error("bState.activeUnitID not found.");
    const attacker = getUnitById(activeEnemyId, bState.units);
    if (!attacker) throw new Error(`Enemy with ID ${activeEnemyId} not found.`);

    // --- MAIN CHANGE: STUN CHECK GATE ---
    // Check if there is a "Stun" debuff with a duration greater than 0.
    // Duration has already been reduced by turn_manager previously.
    const isStunned = attacker.statusEffects?.debuffs?.some(e => e.name === "Stun" && e.duration > 0);

    if (isStunned) {
        scriptLogger(`ENEMY_AI: ${attacker.name} is Stunned. Skipping action.`);
        
        // Create special message and flag for UI/Tasker
        bState.battleMessage = `${attacker.name} is Stunned!`;
        bState.lastActionDetails = {
            actorId: activeEnemyId,
            commandId: "__STUNNED__",
            commandName: "Stunned",
            targets: [],
            effectsSummary: [],
            actionOutcome: "STUNNED" // New flag for UI to read
        };
        
    } else {
        // --- IF NOT STUNNED, CONTINUE AI LOGIC AS USUAL ---
        scriptLogger(`ENEMY_AI: Turn for ${attacker.name} (Role: ${attacker.role})`);
        let validTargetPseudoPositions = (attacker.role.toLowerCase() === 'ranged') ? [-2, 2] : [-1, 1];
        const potentialTargets = bState.units.filter(unit =>
            unit.type === "Ally" &&
            unit.status !== "Defeated" &&
            validTargetPseudoPositions.includes(unit.pseudoPos)
        );

        if (potentialTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * potentialTargets.length);
            const chosenTarget = potentialTargets[randomIndex];
            const damageDealt = attacker.stats.atk;
            const damageResult = applyDamage(chosenTarget, damageDealt);
            if (chosenTarget.status === "Defeated") { wasTargetEliminated = true; }
            bState.battleMessage = `${attacker.name} attacks ${chosenTarget.name} for ${damageResult.totalDamage} damage!`;
            bState.lastActionDetails = { actorId: activeEnemyId, commandId: "__BASIC_ATTACK__", commandName: "Basic Attack", targets: [chosenTarget.id], effectsSummary: [`${chosenTarget.name} (-${damageResult.totalDamage} HP)`] };
        } else {
            bState.battleMessage = `${attacker.name} has no target in range.`;
            bState.lastActionDetails = { actorId: activeEnemyId, commandId: "__NO_ACTION__", commandName: "No Target", targets: [], effectsSummary: [], actionOutcome: "NO_TARGET_IN_RANGE" };
        }
    }

} catch (e) {
    scriptLogger("ENEMY_AI_ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Enemy AI Error: " + e.message;
}

// --- Output for Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
