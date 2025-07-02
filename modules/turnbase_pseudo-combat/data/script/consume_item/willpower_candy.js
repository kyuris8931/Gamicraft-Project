// --- script_tasker/consume_item/willpower_candy.js ---
// Description: Grants the entire team a small boost of 1 to 2 SP.
// This script is self-contained and only requires the battle_state.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

const log = (message) => {
    // In a real Tasker environment, you might use flash() or another logging function.
};

try {
    // 1. Parse the battle state
    const bState = JSON.parse(battle_state);

    // 2. Determine the amount of SP to restore (randomly 1 or 2)
    const spGained = Math.floor(Math.random() * 2) + 1;
    const effectLog = [];

    // 3. Safely add SP to the team
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
        
        // 4. Update the battle message
        const activeUnit = bState.units.find(unit => unit.id === bState.activeUnitID);
        const userName = activeUnit ? activeUnit.name : "The team";
        bState.battleMessage = `${userName} used a Willpower Candy. The team gained ${actualSPGained} SP!`;

        // 5. Set the lastActionDetails flag for the UI to process the SP gain pop-up
        bState.lastActionDetails = {
            actorId: `SYSTEM_ITEM_SP_GAIN`, // Generic ID for UI processing
            commandName: "Willpower Candy",
            effects: effectLog
        };

    } else {
        bState.battleMessage = "The Willpower Candy was used, but had no effect...";
    }

    // 6. Stringify the updated state object for the output
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error in willpower_candy.js: ${e.message}`);
    // setLocal('errmsg', e.message);
}
