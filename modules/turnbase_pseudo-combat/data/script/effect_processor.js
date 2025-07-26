/*
 * Gamicraft - Generic Effect Processor
 * Version: 1.0
 *
 * Description:
 * A unified script that processes all active effects based on a dynamic trigger phase.
 * It handles both individual effects (like Stun, Poison) and group-scoped effects
 * (like SP Over Time from Feast of Will). This script replaces the separate
 * start-of-turn and end-of-turn processors.
 *
 * --- INPUT FROM TASKER ---
 * - battle_state: The JSON string of the current battle_state object.
 * - trigger_phase_to_check: A string defining which phase to process
 * (e.g., "start_of_turn", "end_of_turn", "after_skill_use").
 *
 * --- OUTPUT FOR TASKER ---
 * - battle_state: The MODIFIED JSON string of the battle_state.
 * - effect_processed: "true" if any effect was triggered and processed, otherwise "false".
 * - js_script_log: The execution log for debugging.
 */

// --- Global Variables & Logger ---
let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += `[FX_PROC] ${message}\\n`;
}

// Default output variables
var battle_state_out = battle_state;
var effect_processed = false;

// --- Main Execution Block ---
try {
    // Input validation
    if (typeof trigger_phase_to_check !== 'string' || !trigger_phase_to_check.trim()) {
        throw new Error("Input variable 'trigger_phase_to_check' is missing or empty.");
    }
    
    scriptLogger(`--- Effect Processor Started: Checking for '${trigger_phase_to_check}' phase ---`);

    const bState = JSON.parse(battle_state);

    // Exit early if there's nothing to do
    if (!bState.active_effects || bState.active_effects.length === 0 || !bState.activeUnitID) {
        scriptLogger("No active effects or active unit ID. Exiting.");
        exit();
    }
    
    const activeUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (!activeUnit) {
        scriptLogger(`Active unit with ID ${bState.activeUnitID} not found. Exiting.`);
        exit();
    }

    // --- Unified Effect Finding Logic ---
    // Find all effects that match the current trigger phase
    const effectsToProcess = bState.active_effects.filter(effect => {
        if (effect.trigger_phase !== trigger_phase_to_check) {
            return false;
        }

        // Check if the effect targets the active unit individually
        if (effect.target_id === activeUnit.id) {
            return true;
        }

        // Check if the effect targets the active unit's group
        if (activeUnit.type === 'Ally' && effect.target_scope === 'team_allies') {
            return true;
        }
        if (activeUnit.type === 'Enemy' && effect.target_scope === 'team_enemies') {
            return true;
        }
        
        return false;
    });

    if (effectsToProcess.length > 0) {
        effect_processed = true; // Set the flag because we found matching effects
        scriptLogger(`Found ${effectsToProcess.length} effect(s) for this phase. Flag 'effect_processed' is now true.`);
        
        let hasBeenStunnedThisPhase = false;

        effectsToProcess.forEach(effect => {
            const sourceName = effect.source_item_name || effect.source_skill_name || "Unknown Source";
            scriptLogger(`Processing effect: "${effect.type}" from "${sourceName}" on ${activeUnit.name}`);

            // The master switch-case for all effect actions
            switch(effect.type.toLowerCase()) {
                
                // --- Logic from process_effects_start_of_turn.js ---
                case 'stun':
                    hasBeenStunnedThisPhase = true;
                    bState.battleMessage = `${activeUnit.name} is stunned and cannot move!`;
                    bState.lastActionDetails = {
                        actorId: activeUnit.id,
                        commandId: "__STUNNED__",
                        actionOutcome: "STUNNED"
                    };
                    scriptLogger(`Stun applied. Turn will be skipped.`);
                    break;

                case 'sp_over_time':
                    // This logic won't run if a stun has just been processed in the same phase
                    if (hasBeenStunnedThisPhase) {
                        scriptLogger("Skipping SP gain due to Stun effect in the same phase.");
                        break;
                    }
                    const oldSP = bState.teamSP;
                    const spGained = Math.floor(Math.random() * (effect.max_amount - effect.min_amount + 1)) + effect.min_amount;
                    bState.teamSP = Math.min(bState.teamSP + spGained, bState.maxTeamSP);
                    const actualSPGained = bState.teamSP - oldSP;

                    if (actualSPGained > 0) {
                        bState.battleMessage = `The team feels invigorated by ${sourceName}, gaining ${actualSPGained} SP!`;
                        bState.lastActionDetails = {
                            actorId: "SYSTEM_ITEM_SP_GAIN", // Generic ID for UI processing
                            effects: [{ type: 'sp_gain', amount: actualSPGained }]
                        };
                    }
                    scriptLogger(`Team gained ${actualSPGained} SP from ${sourceName}.`);
                    break;

                // --- Logic from process_effects_end_of_turn.js ---
                case 'poison':
                    const damage = effect.damage || 5;
                    const oldHp = activeUnit.stats.hp;
                    activeUnit.stats.hp = Math.max(0, oldHp - damage);
                    
                    bState.battleMessage = `${activeUnit.name} suffers ${damage} damage from Poison!`;
                    bState.lastActionDetails = {
                        actorId: activeUnit.id, // Important for UI to know who to show the popup on
                        effects: [{ type: 'damage', unitId: activeUnit.id, amount: damage }]
                    };

                    if (activeUnit.stats.hp === 0) {
                        activeUnit.status = "Defeated";
                        scriptLogger(`${activeUnit.name} was defeated by Poison!`);
                    }
                    scriptLogger(`${activeUnit.name} took ${damage} poison damage. HP: ${oldHp} -> ${activeUnit.stats.hp}`);
                    break;

                // You can add more 'case' statements here for future effects like 'bleed', 'regeneration', etc.

                default:
                    scriptLogger(`Warning: Unknown effect type "${effect.type}" encountered.`);
                    break;
            }
        });

        // If a stun was processed, set a global flag for the next script (enemy_action_processor.js) to read
        if (hasBeenStunnedThisPhase) {
            bState._unitIsStunned = true;
        }

        // Serialize the final state
        battle_state_out = JSON.stringify(bState);
    } else {
        scriptLogger("No effects match this trigger phase. No action taken.");
    }

} catch (e) {
    scriptLogger("--- SCRIPT CRASHED ---");
    scriptLogger("ERROR: " + e.message);
    scriptLogger("STACK: " + e.stack);
    // Return original state on error to avoid breaking the Tasker flow
    battle_state_out = battle_state; 
    effect_processed = false;
}

// --- Set Final Tasker Variables ---
var battle_state = battle_state_out;
var js_script_log = taskerLogOutput;
// The variable `effect_processed` will be automatically exported by Tasker.