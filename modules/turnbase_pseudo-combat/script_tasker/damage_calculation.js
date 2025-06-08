// --- damage_calculation.js (Tasker) ---
// Calculates and applies damage to targets based on actor's ATK.
// Handles unit defeat and SP generation for player's basic attacks.
//
// Expected Tasker local variables as input:
// - battle_state: Current battle state JSON string.
// - actor_id: ID of the unit performing the action.
// - command_id: ID of the command being used (e.g., "ky_basic_001").
// - affected_target_ids: JSON string array of target IDs, e.g., '["enemy_id_1", "enemy_id_2"]'

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

function getCommandById(unit, cmdId) {
    if (unit && unit.commands && Array.isArray(unit.commands)) {
        return unit.commands.find(cmd => cmd.commandId === cmdId);
    }
    return null;
}

let bState = null; // Declare bState in a higher scope

try {
    taskerLogOutput = "";
    scriptLogger("DAMAGE_CALC_INFO: Script started.");

    if (typeof battle_state !== 'string' || battle_state.trim() === "") {
        throw new Error("Input 'battle_state' is empty or not a string.");
    }
    bState = JSON.parse(battle_state); // Assign to higher scoped bState
    scriptLogger("DAMAGE_CALC_INFO: Parsed battle_state.");

    if (typeof actor_id !== 'string' || actor_id.trim() === "") {
        throw new Error("Input 'actor_id' is empty or not a string.");
    }
    const actorId = actor_id;

    if (typeof command_id !== 'string' || command_id.trim() === "") {
        throw new Error("Input 'command_id' is empty or not a string.");
    }
    const commandId = command_id;

    let affectedTargetIdsArray = [];
    if (typeof affected_target_ids === 'string' && affected_target_ids.trim() !== "") {
        try {
            affectedTargetIdsArray = JSON.parse(affected_target_ids);
            if (!Array.isArray(affectedTargetIdsArray)) {
                throw new Error("'affected_target_ids' is not a valid JSON array string.");
            }
        } catch (e) {
            throw new Error("Error parsing 'affected_target_ids': " + e.message);
        }
    } else {
        throw new Error("Input 'affected_target_ids' is empty or not a string.");
    }

    scriptLogger(`DAMAGE_CALC_INFO: Actor: ${actorId}, Command: ${commandId}, Targets: ${affectedTargetIdsArray.join(', ')}`);

    const attacker = bState.units.find(u => u.id === actorId);
    if (!attacker) {
        throw new Error(`Attacker with ID ${actorId} not found.`);
    }
    if (attacker.status === "Defeated") {
        scriptLogger(`DAMAGE_CALC_WARN: Attacker ${attacker.name} is already defeated. Action skipped.`);
        bState.battleMessage = `${attacker.name} is defeated and cannot act.`;
    } else if (!attacker.stats || typeof attacker.stats.atk !== 'number') {
        throw new Error(`Attacker ${attacker.name} has invalid stats or ATK value.`);
    } else { // Proceed with action only if attacker is not defeated and stats are valid
        const commandUsed = getCommandById(attacker, commandId);
        if (!commandUsed) {
            throw new Error(`Command ${commandId} not found for attacker ${attacker.name}.`);
        }

        let actionSummary = `${attacker.name} used ${commandUsed.name}!`;
        let targetsHitSummary = [];

        if (affectedTargetIdsArray.length > 0) {
            affectedTargetIdsArray.forEach(targetId => {
                const defender = bState.units.find(u => u.id === targetId);
                if (!defender) {
                    scriptLogger(`DAMAGE_CALC_WARN: Defender with ID ${targetId} not found. Skipping.`);
                    return;
                }
                if (defender.status === "Defeated") {
                    scriptLogger(`DAMAGE_CALC_INFO: Defender ${defender.name} is already defeated. Skipping damage.`);
                    targetsHitSummary.push(`${defender.name} (already defeated)`);
                    return;
                }
                if (!defender.stats || typeof defender.stats.hp !== 'number') {
                    scriptLogger(`DAMAGE_CALC_ERROR: Defender ${defender.name} has invalid stats or HP value. Skipping damage.`);
                    targetsHitSummary.push(`${defender.name} (error)`);
                    return;
                }

                let damageDealt = attacker.stats.atk;
                const oldHp = defender.stats.hp;
                defender.stats.hp -= damageDealt;
                if (defender.stats.hp < 0) defender.stats.hp = 0;
                scriptLogger(`DAMAGE_CALC_INFO: ${attacker.name} dealt ${damageDealt} damage to ${defender.name}. HP: ${oldHp} -> ${defender.stats.hp}`);
                targetsHitSummary.push(`${defender.name} (-${damageDealt} HP)`);

                if (defender.stats.hp === 0) {
                    defender.status = "Defeated";
                    scriptLogger(`DAMAGE_CALC_INFO: ${defender.name} has been defeated!`);
                }
            });

            if (attacker.type === "Ally" && commandUsed.type === "BasicAttack") {
                const spGain = 1;
                if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
                    bState.teamSP = Math.min(bState.teamSP + spGain, bState.maxTeamSP);
                    scriptLogger(`DAMAGE_CALC_INFO: Player ${attacker.name} used Basic Attack. Team SP: ${bState.teamSP}/${bState.maxTeamSP}`);
                    actionSummary += ` Gained ${spGain} SP.`;
                } else {
                    scriptLogger("DAMAGE_CALC_WARN: teamSP or maxTeamSP not properly defined. Cannot generate SP.");
                }
            }
        } else {
            scriptLogger("DAMAGE_CALC_INFO: No targets affected by the action.");
            actionSummary += " ...but it hit nothing!";
        }

        if (targetsHitSummary.length > 0) {
            bState.battleMessage = `${actionSummary} Targets: ${targetsHitSummary.join(', ')}.`;
        } else {
            bState.battleMessage = actionSummary;
        }
        bState.lastActionDetails = {
            actorId: actorId, commandId: commandId, commandName: commandUsed.name,
            targets: affectedTargetIdsArray,
        };
        scriptLogger("DAMAGE_CALC_INFO: Battle message and last action details updated.");
    } // End of main action processing block

} catch (e) {
    scriptLogger("DAMAGE_CALC_GLOBAL_SCRIPT_ERROR: " + e.message + " Stack: " + e.stack);
    if (typeof bState !== 'object' || bState === null) {
        bState = { battleState: "Error", battleMessage: "DC Critical Error: " + e.message.substring(0, 30), _scriptErrorLog: taskerLogOutput };
    } else {
        bState.battleState = "Error";
        bState.battleMessage = "DC Script Error: " + e.message.substring(0, 40);
    }
}

// TAMBAHKAN LOG INI:
scriptLogger(`DAMAGE_CALC_DEBUG: Before final stringify - typeof bState: ${typeof bState}, bState is null: ${bState === null}`);
if (typeof bState === 'object' && bState !== null) {
    scriptLogger(`DAMAGE_CALC_DEBUG: bState content (partial): ${JSON.stringify(bState).substring(0,200)}...`);
}


// F. Stringify JSON to be returned to Tasker
try {
    if (typeof bState !== 'object' || bState === null) {
        scriptLogger("FINAL_STRINGIFY_ERROR_DC: bState is not a valid object at final stage. Creating error object.");
        // Tidak perlu throw error di sini, biarkan blok catch di bawahnya yang membuat errorBStateObject
    }
    // Jika bState bukan objek, JSON.stringify akan error dan ditangkap di bawah
    battle_state = JSON.stringify(bState);
} catch (e) {
    scriptLogger("FINAL_STRINGIFY_ERROR_DC: Could not stringify final bState. Error: " + e.message);
    let errorBStateObject = {
        battleState: "Error",
        battleMessage: "Critical Error DC: Final state not serializable. " + e.message.substring(0, 30),
        _scriptErrorLog: taskerLogOutput,
        _originalActorId: typeof actor_id === 'string' ? actor_id : "Unknown"
        // Ambil _original dari bState jika masih bisa diakses dan merupakan objek
        // Namun, jika bState adalah penyebab error, mungkin lebih aman tidak mengakses propertinya di sini
    };
    battle_state = JSON.stringify(errorBStateObject);
}

var js_script_log = taskerLogOutput;
