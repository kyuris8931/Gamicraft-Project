/*
 * Gamicraft - Process Effects (Start of Turn)
 * Version: 1.0
 *
 * Description:
 * Processes all active effects that are flagged to trigger at the START of a unit's turn.
 * This script should be run AFTER turn_manager.js.
 */

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

try {
    const bState = JSON.parse(battle_state);

    if (!bState.active_effects || bState.active_effects.length === 0) {
        exit();
    }
    
    // The active unit is now the one who just received the turn.
    const newActiveUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (!newActiveUnit) exit();

    scriptLogger("EFFECT_PROCESSOR (Start): Checking for start-of-turn effects for " + newActiveUnit.name);
    
    bState.active_effects.forEach(effect => {
        // Only process effects with the correct trigger phase and target.
        if (effect.trigger_phase === 'start_of_turn' && effect.target_id === newActiveUnit.id) {
            scriptLogger(`EFFECT_PROCESSOR (Start): Applying effect "${effect.effect_id}".`);

            // --- Hardcoded logic for each effect type ---
            if (effect.type === 'damage_over_time') { // Example: Poison
                const damage = effect.damage || 0;
                newActiveUnit.stats.hp = Math.max(0, newActiveUnit.stats.hp - damage);
                bState.battleMessage = `${newActiveUnit.name} menerima ${damage} damage dari ${effect.source_skill_name}!`;
                if(newActiveUnit.stats.hp === 0) newActiveUnit.status = "Defeated";
            }
            // Add other start-of-turn effects here (e.g., a "Regeneration" heal).
        }
    });

    // Return the modified state to Tasker.
    var battle_state = JSON.stringify(bState);

} catch (e) {
    scriptLogger("EFFECT_PROCESSOR (Start) ERROR: " + e.message);
}
var js_script_log = taskerLogOutput;

