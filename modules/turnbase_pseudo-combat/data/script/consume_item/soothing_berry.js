// --- script_tasker/consume_item/soothing_berry.js ---
// Description: Heals AND shields the active unit for 10% to 20% of their Max HP.
// This script is self-contained and only requires the battle_state.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

const log = (message) => {
    // In a real Tasker environment, you might use flash() or another logging function.
    // For this script, we'll keep it silent unless there's an error.
};

try {
    // 1. Parse the battle state
    const bState = JSON.parse(battle_state);

    // 2. Find the active unit using the activeUnitID from the battle state
    const activeUnitId = bState.activeUnitID;
    if (!activeUnitId) {
        throw new Error("Could not find activeUnitID in the battle state.");
    }
    const activeUnit = bState.units.find(unit => unit.id === activeUnitId);

    if (activeUnit && activeUnit.status !== 'Defeated') {
        // 3. Determine if the multiplier is 10% (0.10) or 20% (0.20) at random
        const multiplier = Math.random() < 0.5 ? 0.10 : 0.20;
        const effectLog = [];

        if (activeUnit.stats && typeof activeUnit.stats.hp === 'number' && typeof activeUnit.stats.maxHp === 'number') {
            // 4. Calculate the base amount from Max HP
            const baseAmount = Math.round(activeUnit.stats.maxHp * multiplier);

            // 5. Apply HEAL
            const oldHp = activeUnit.stats.hp;
            activeUnit.stats.hp = Math.min(activeUnit.stats.maxHp, activeUnit.stats.hp + baseAmount);
            const actualHealedAmount = activeUnit.stats.hp - oldHp;

            if (actualHealedAmount > 0) {
                effectLog.push({
                    type: 'heal',
                    unitId: activeUnit.id,
                    amount: actualHealedAmount
                });
            }

            // 6. Apply SHIELD
            if (typeof activeUnit.stats.shieldHP === 'undefined') {
                activeUnit.stats.shieldHP = 0;
            }
            activeUnit.stats.shieldHP += baseAmount;

            effectLog.push({
                type: 'shield',
                unitId: activeUnit.id,
                amount: baseAmount
            });

            // 7. Update the battle message
            bState.battleMessage = `${activeUnit.name} used a Soothing Berry and feels a calming energy!`;

            // 8. Set the lastActionDetails flag for the UI to read and create feedback pop-ups
            bState.lastActionDetails = {
                actorId: `SYSTEM_ITEM_HEAL_SHIELD`, // Generic ID for UI processing, similar to World Tree Fruit
                commandName: "Soothing Berry",
                effects: effectLog
            };
        }

    } else {
        bState.battleMessage = "The Soothing Berry was used, but had no effect...";
    }

    // 9. Stringify the updated state object for the output
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error in soothing_berry.js: ${e.message}`);
    // If an error occurs, it might be useful to set a local Tasker variable
    // setLocal('errmsg', e.message);
}
