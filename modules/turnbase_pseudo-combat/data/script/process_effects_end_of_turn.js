/*
 * Gamicraft - Process Effects (End of Turn)
 * Version: 1.0
 *
 * Description:
 * Processes all active effects that are flagged to trigger at the END of a unit's turn.
 * This script should be run BEFORE turn_manager.js.
 */

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

try {
    const bState = JSON.parse(battle_state);

    if (!bState.active_effects || bState.active_effects.length === 0) {
        // No active effects, nothing to do.
        exit();
    }

    const unitThatJustActed = bState.units.find(u => u.id === bState.activeUnitID);
    if (!unitThatJustActed) exit();
    
    scriptLogger("EFFECT_PROCESSOR (End): Checking for end-of-turn effects.");

    bState.active_effects.forEach(effect => {
        // Only process effects with the correct trigger phase.
        if (effect.trigger_phase !== 'end_of_turn') return;
        
        let applyEffect = false;
        // Check if the effect should apply on this turn.
        if (effect.target_type === 'team' && unitThatJustActed.type === 'Ally') {
            applyEffect = true;
        } else if (effect.target_type === 'individual' && effect.target_id === unitThatJustActed.id) {
            applyEffect = true;
        }

        if (applyEffect) {
            scriptLogger(`EFFECT_PROCESSOR (End): Applying effect "${effect.effect_id}".`);
            
            // --- Hardcoded logic for each effect type ---
            if (effect.type === 'sp_over_time') {
                const spGained = Math.floor(Math.random() * (effect.max_amount - effect.min_amount + 1)) + effect.min_amount;
                bState.teamSP = Math.min(bState.teamSP + spGained, bState.maxTeamSP);
                bState.battleMessage = `Efek berangsur dari ${effect.source_item_name} memberikan ${spGained} SP!`;
            }
            // Add other end-of-turn effects here (e.g., a self-repair buff).
        }
    });

    // Return the modified state to Tasker.
    var battle_state = JSON.stringify(bState);

} catch (e) {
    scriptLogger("EFFECT_PROCESSOR (End) ERROR: " + e.message);
}
var js_script_log = taskerLogOutput;

