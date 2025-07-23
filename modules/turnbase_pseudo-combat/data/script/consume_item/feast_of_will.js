// --- script_tasker/consume_item/feast_of_will.js ---
// Description: Grants an immediate burst of 6-9 SP to the team, and applies a lingering
// effect that grants the same amount of SP at the start of the next 3 ally turns.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

const log = (message) => {
    // This function can be used for debugging in a Tasker environment, e.g., using flash().
};

try {
    // 1. Parse the battle state
    const bState = JSON.parse(battle_state);
    const effectLog = [];

    // --- PART A: IMMEDIATE EFFECT ---

    // 2. Calculate the random amount of SP to be granted
    const spGained = Math.floor(Math.random() * (9 - 6 + 1)) + 1; // Randomly between 6 and 9 SP

    // 3. Safely apply the SP to the team
    if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
        const oldSP = bState.teamSP;
        bState.teamSP = Math.min(bState.maxTeamSP, bState.teamSP + spGained);
        const actualSPGained = bState.teamSP - oldSP;

        if (actualSPGained > 0) {
            effectLog.push({
                type: 'sp_gain',
                amount: actualSPGained
            });
        }
        
        // 4. Update the battle message for the immediate effect
        bState.battleMessage = `The team enjoys a Feast of Will, gaining ${actualSPGained} SP! Its effect lingers...`;

        // 5. Set the lastActionDetails flag for the immediate UI pop-up
        bState.lastActionDetails = {
            actorId: `SYSTEM_ITEM_SP_GAIN`, // Generic ID for UI processing
            commandName: "Feast of Will",
            effects: effectLog
        };

    } else {
        // Fallback message if SP stats are not found
        bState.battleMessage = "The Feast of Will was used, but had no initial effect...";
    }

    // --- PART B: CREATE LINGERING EFFECT ---

    // 6. Define the lingering effect object to be added to the active effects queue
    const lingeringEffect = {
        effect_id: `feast_of_will}`, // Unique ID for easier debugging
        type: "sp_over_time",
        trigger_phase: "start_of_turn", // Triggers at the start of an ally's turn
        target_scope: "team_allies",     // Affects the whole ally team
        duration: 2,                       // Has 2 stacks remaining after the initial burst
        source_item_name: "Feast of Will",
        min_amount: 6,
        max_amount: 9
    };

    // 7. Add the lingering effect to the global active_effects array
    if (!bState.active_effects) {
        bState.active_effects = [];
    }
    bState.active_effects.push(lingeringEffect);


    // 8. Stringify the updated state object for the output
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error in feast_of_will.js: ${e.message}`);
    // In case of an error, it might be useful to set a local Tasker variable
    // setLocal('errmsg', e.message);
}
