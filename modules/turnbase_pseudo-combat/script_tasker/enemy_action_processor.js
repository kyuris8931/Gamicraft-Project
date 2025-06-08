// --- enemy_action_processor.js (Tasker) ---
// Handles an enemy's turn: uses Basic Attack based on role (Melee: +/-1, Ranged: +/-2),
// chooses a target, calculates damage, and updates unit status if defeated.
// If no target in defined range, the enemy does nothing.
//
// Expected Tasker local variables as input:
// - battle_state: Current battle state JSON string.
//
// Output JS variables for Tasker:
// - battle_state: Updated battle state JSON string after enemy's action.
// - js_ai_action_log: Log messages from this script.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

let bState = null; // Declare bState at a higher scope

try {
    taskerLogOutput = ""; // Initialize log for this run
    scriptLogger("ENEMY_ACTION_PROC_INFO: Script started (Role-Based Basic Attack).");

    if (typeof battle_state !== 'string' || battle_state.trim() === "") {
        throw new Error("Input 'battle_state' is empty or not a string.");
    }
    bState = JSON.parse(battle_state);
    scriptLogger("ENEMY_ACTION_PROC_INFO: Parsed battle_state.");

    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) {
        throw new Error("bState.activeUnitID is missing. Cannot determine active enemy.");
    }
    scriptLogger(`ENEMY_ACTION_PROC_INFO: Active Enemy ID from bState: ${activeEnemyId}`);

    const attacker = bState.units.find(u => u.id === activeEnemyId);

    if (!attacker) {
        throw new Error(`Attacker (Enemy) with ID ${activeEnemyId} not found.`);
    }
    if (attacker.type !== "Enemy") {
        scriptLogger(`ENEMY_ACTION_PROC_WARN: Unit ${attacker.name} (ID: ${activeEnemyId}) is not an Enemy (type: ${attacker.type}). No action.`);
        bState.battleMessage = `${attacker.name} is not an enemy; AI turn skipped.`;
    } else if (attacker.status === "Defeated") {
        scriptLogger(`ENEMY_ACTION_PROC_WARN: Enemy ${attacker.name} is already defeated. No action.`);
        bState.battleMessage = `${attacker.name} is defeated and cannot act.`;
    } else if (!attacker.role) { // Check if role is defined
        scriptLogger(`ENEMY_ACTION_PROC_ERROR: Enemy ${attacker.name} has no 'role' defined. Cannot determine attack type. No action.`);
        bState.battleMessage = `${attacker.name} has no role defined.`;
    } else if (!attacker.stats || typeof attacker.stats.atk !== 'number') {
        scriptLogger(`ENEMY_ACTION_PROC_ERROR: Enemy ${attacker.name} has invalid stats or ATK value. No action.`);
        bState.battleMessage = `${attacker.name} has invalid stats.`;
    } else {
        // Attacker is valid and can act
        const enemyRole = attacker.role; // "Melee" or "Ranged"
        const commandNameForLog = `Basic Attack (${enemyRole})`;
        const commandIdForLog = `BASIC_ATTACK_${enemyRole.toUpperCase()}`; // e.g., BASIC_ATTACK_MELEE

        scriptLogger(`ENEMY_ACTION_PROC_INFO: Enemy ${attacker.name} (Role: ${enemyRole}) will perform a Basic Attack.`);

        let chosenTarget = null;
        let enemyTargetIdsArray = [];
        let validTargetPseudoPositions = [];

        if (enemyRole === "Ranged") {
            validTargetPseudoPositions = [2, -2]; // Only specific positions 2 and -2
            scriptLogger(`ENEMY_ACTION_PROC_INFO: ${attacker.name} (Ranged) looking for targets at pseudoPos: ${validTargetPseudoPositions.join(' or ')}.`);
        } else { // Melee or if role is something else, default to Melee
            validTargetPseudoPositions = [1, -1];
            scriptLogger(`ENEMY_ACTION_PROC_INFO: ${attacker.name} (Melee) looking for targets at pseudoPos: ${validTargetPseudoPositions.join(' or ')}.`);
        }

        const potentialTargets = bState.units.filter(unit =>
            unit.type === "Ally" &&
            unit.status !== "Defeated" &&
            validTargetPseudoPositions.includes(unit.pseudoPos)
        );

        if (potentialTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * potentialTargets.length);
            chosenTarget = potentialTargets[randomIndex];
            scriptLogger(`ENEMY_ACTION_PROC_INFO: Found ${potentialTargets.length} valid targets in range. Randomly chose: ${chosenTarget.name} (ID: ${chosenTarget.id}) at pseudoPos ${chosenTarget.pseudoPos}`);
        } else {
            scriptLogger(`ENEMY_ACTION_PROC_INFO: No Ally targets found in defined range (${validTargetPseudoPositions.join(', ')}) for ${attacker.name} (${enemyRole}). Enemy takes no action.`);
            bState.battleMessage = `${attacker.name} (${enemyRole}) finds no targets in range.`;
        }

        if (chosenTarget) {
            enemyTargetIdsArray.push(chosenTarget.id);
            if (!chosenTarget.stats || typeof chosenTarget.stats.hp !== 'number') {
                scriptLogger(`ENEMY_ACTION_PROC_ERROR: Target ${chosenTarget.name} has invalid stats or HP. Cannot apply damage.`);
                bState.battleMessage = `${attacker.name} targets ${chosenTarget.name}, but target has stat issues.`;
            } else {
                let damageDealt = attacker.stats.atk; // Basic Attack damage = ATK
                const oldHp = chosenTarget.stats.hp;
                chosenTarget.stats.hp -= damageDealt;
                if (chosenTarget.stats.hp < 0) chosenTarget.stats.hp = 0;
                scriptLogger(`ENEMY_ACTION_PROC_INFO: ${attacker.name} dealt ${damageDealt} damage to ${chosenTarget.name}. HP: ${oldHp} -> ${chosenTarget.stats.hp}`);

                if (chosenTarget.stats.hp === 0) {
                    chosenTarget.status = "Defeated";
                    scriptLogger(`ENEMY_ACTION_PROC_INFO: ${chosenTarget.name} has been defeated!`);
                }
                bState.battleMessage = `${attacker.name} (${enemyRole}) attacked ${chosenTarget.name}, dealing ${damageDealt} damage!`;
            }
            bState.lastActionDetails = {
                actorId: activeEnemyId,
                commandId: commandIdForLog, // Use generated commandId
                commandName: commandNameForLog, // Use generated commandName
                targets: enemyTargetIdsArray,
            };
        } else {
            // No target was chosen
            bState.lastActionDetails = {
                actorId: activeEnemyId,
                commandId: commandIdForLog,
                commandName: commandNameForLog,
                targets: [],
                actionOutcome: "No valid target in range"
            };
            scriptLogger("ENEMY_ACTION_PROC_INFO: No target engaged. lastActionDetails updated.");
        }
    }
} catch (e) {
    scriptLogger("ENEMY_ACTION_PROC_GLOBAL_SCRIPT_ERROR: " + e.message + " Stack: " + e.stack);
    if (typeof bState !== 'object' || bState === null) {
        bState = { battleState: "Error", battleMessage: "EnemyAI Critical Error: " + e.message.substring(0, 30), _scriptErrorLog: taskerLogOutput };
    } else {
        bState.battleState = "Error";
        bState.battleMessage = "EnemyAI Script Error: " + e.message.substring(0, 40);
    }
}

// Final stringify and log output (same as before)
try {
    if (typeof bState !== 'object' || bState === null) {
        scriptLogger("FINAL_STRINGIFY_ERROR_ENEMY_AI: bState is not valid object before final stringify. Creating error object.");
        throw new Error("bState became null or not an object in EnemyAI before final stringify.");
    }
    battle_state = JSON.stringify(bState);
} catch (e) {
    scriptLogger("FINAL_STRINGIFY_ERROR_ENEMY_AI: Could not stringify final bState. Error: " + e.message);
    let errorBStateObject = {
        battleState: "Error",
        battleMessage: "Critical Error EnemyAI: Final state not serializable. " + e.message.substring(0, 30),
        _scriptErrorLog: taskerLogOutput,
        _originalActiveUnitID: (typeof bState === 'object' && bState !== null && bState.activeUnitID) ? bState.activeUnitID : "Unknown"
    };
    battle_state = JSON.stringify(errorBStateObject);
}

var js_ai_action_log = taskerLogOutput;
