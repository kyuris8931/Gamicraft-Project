/*
 * Gamicraft - Process Effects (Start of Turn) - v2.0 (Group Effect Trigger Logic)
 *
 * Description:
 * Processes all active effects flagged to trigger at the START of a unit's turn.
 * It now handles both individual effects (like Stun) and triggers group effects
 * (like Feast of Will) based on the active unit's team type.
 * This script does NOT manage effect durations.
 */

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += `[START_TURN_FX] ${message}\\n`; }

var battle_state_out = battle_state; // Default output if no changes
var effect_triggered_start = false;  // Flag for Tasker's wait condition

try {
    const bState = JSON.parse(battle_state);

    // Proactively clean up the stun flag from the previous turn to prevent state leaks.
    if (bState.hasOwnProperty('_unitIsStunned')) {
        delete bState._unitIsStunned;
        scriptLogger("Proactively cleaned up leftover '_unitIsStunned' flag.");
    }

    if (!bState.active_effects || bState.active_effects.length === 0 || !bState.activeUnitID) {
        exit(); // Exit if there's nothing to process.
    }
    
    const activeUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (!activeUnit) {
        exit();
    }

    scriptLogger(`Checking for start-of-turn effects for ${activeUnit.name} (Type: ${activeUnit.type})`);
    
    // 1. Find individual effects targeting the active unit specifically.
    let individualEffects = bState.active_effects.filter(effect => 
        effect.trigger_phase === 'start_of_turn' && effect.target_id === activeUnit.id
    );

    // 2. Find group effects that are relevant for the active unit's team.
    let groupEffects = bState.active_effects.filter(effect => {
        if (effect.trigger_phase !== 'start_of_turn' || !effect.target_scope) {
            return false; // Not a start-of-turn group effect
        }
        
        // Check if the unit's team matches the effect's target scope
        if (activeUnit.type === 'Ally' && effect.target_scope === 'team_allies') {
            return true;
        }
        if (activeUnit.type === 'Enemy' && effect.target_scope === 'team_enemies') {
            return true;
        }
        
        return false;
    });

    let effectsToProcess = [...individualEffects, ...groupEffects];

    if (effectsToProcess.length > 0) {
        effect_triggered_start = true;
        scriptLogger(`Found ${effectsToProcess.length} effect(s). Setting 'effect_triggered_start' to true.`);
        
        let hasBeenStunned = false;

        effectsToProcess.forEach(effect => {
            scriptLogger(`Processing effect: "${effect.type}" from source "${effect.source_item_name || effect.source_skill_name}"`);

            switch(effect.type.toLowerCase()) {
                case 'stun':
                    bState._unitIsStunned = true;
                    hasBeenStunned = true;
                    bState.battleMessage = `${activeUnit.name} is stunned and cannot move!`;
                    bState.lastActionDetails = {
                        actorId: activeUnit.id,
                        commandId: "__STUNNED__",
                        commandName: "Stunned",
                        actionOutcome: "STUNNED"
                    };
                    scriptLogger(`SUCCESS: Stun effect found. Set bState._unitIsStunned to true.`);
                    break;

                case 'sp_over_time':
                    // 1. Simpan nilai SP saat ini sebelum diubah.
                    const oldSP = bState.teamSP;
                    
                    // 2. Hitung potensi SP yang akan didapat.
                    const potentialSPGained = Math.floor(Math.random() * (effect.max_amount - effect.min_amount + 1)) + effect.min_amount;
                    
                    // 3. Terapkan SP ke tim.
                    bState.teamSP = Math.min(bState.teamSP + potentialSPGained, bState.maxTeamSP);
                    
                    // 4. Hitung berapa banyak SP yang SEBENARNYA ditambahkan.
                    const actualSPGained = bState.teamSP - oldSP;

                    // 5. Hanya lanjutkan jika ada SP yang benar-benar ditambahkan.
                    if (actualSPGained > 0 && !hasBeenStunned) {
                        // 6. Gunakan nilai AKTUAL untuk pesan dan pop-up.
                        bState.battleMessage = `The team feels invigorated by ${effect.source_item_name}, gaining ${actualSPGained} SP!`;
                        bState.lastActionDetails = {
                            actorId: "SYSTEM_ITEM_SP_GAIN",
                            effects: [{ type: 'sp_gain', amount: actualSPGained }] // Kirim nilai aktual
                        };
                    }
                    scriptLogger(`Team gained ${actualSPGained} SP from ${effect.source_item_name}. (Potential: ${potentialSPGained})`);
                    break;
            }
        });

        battle_state_out = JSON.stringify(bState);
    }

} catch (e) {
    scriptLogger("ERROR: " + e.message + " | Stack: " + e.stack);
}

// Set the output variables for Tasker
var js_script_log = taskerLogOutput;
var battle_state = battle_state_out;
// The variable `effect_triggered_start` will be automatically exported by Tasker.
