// --- script_tasker/consume_item/restorative_broth.js ---
// Description: Heals AND shields the active unit and nearby allies (within a 2-unit radius)
// for 30% to 50% of their Max HP.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

const log = (message) => {
    // In a real Tasker environment, you might use flash() or another logging function.
};

/**
 * Calculates the shortest circular distance between two positions in an array.
 * @param {number} pos1 - The first position (index).
 * @param {number} pos2 - The second position (index).
 * @param {number} arrayLength - The total length of the circular array.
 * @returns {number} The shortest distance.
 */
function getCircularDistance(pos1, pos2, arrayLength) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, arrayLength - diff);
}


try {
    // 1. Parse the battle state
    const bState = JSON.parse(battle_state);
    const effectLog = [];

    // 2. Find the active unit (the caster)
    const activeUnit = bState.units.find(unit => unit.id === bState.activeUnitID);
    if (!activeUnit || activeUnit.status === 'Defeated') {
        throw new Error("Active unit not found or is defeated.");
    }

    // 3. Determine the targets within the area of effect
    const targets = [];
    const aliveAllies = bState.units.filter(u => u.type === 'Ally' && u.status !== 'Defeated');
    const casterPosition = activeUnit.pseudoPos;
    const totalAliveUnits = bState._turnOrder.length; // Use turn order for accurate distance

    aliveAllies.forEach(ally => {
        const distance = getCircularDistance(casterPosition, ally.pseudoPos, totalAliveUnits);
        if (distance <= 2) { // Affects units within a 2-block radius
            targets.push(ally);
        }
    });

    if (targets.length > 0) {
        // 4. Apply effects to all targets
        targets.forEach(targetUnit => {
            // Calculate a random multiplier between 30% (0.30) and 50% (0.50)
            const multiplier = Math.random() < 0.5 ? 0.30 : 0.50;

            if (targetUnit.stats && typeof targetUnit.stats.hp === 'number' && typeof targetUnit.stats.maxHp === 'number') {
                const baseAmount = Math.round(targetUnit.stats.maxHp * multiplier);

                // Apply HEAL
                const oldHp = targetUnit.stats.hp;
                targetUnit.stats.hp = Math.min(targetUnit.stats.maxHp, targetUnit.stats.hp + baseAmount);
                const actualHealedAmount = targetUnit.stats.hp - oldHp;

                if (actualHealedAmount > 0) {
                    effectLog.push({
                        type: 'heal',
                        unitId: targetUnit.id,
                        amount: actualHealedAmount
                    });
                }

                // Apply SHIELD
                if (typeof targetUnit.stats.shieldHP === 'undefined') {
                    targetUnit.stats.shieldHP = 0;
                }
                targetUnit.stats.shieldHP += baseAmount;

                effectLog.push({
                    type: 'shield',
                    unitId: targetUnit.id,
                    amount: baseAmount
                });
            }
        });

        // 5. Update battle message and set UI flag
        bState.battleMessage = `${activeUnit.name} used a Restorative Broth, revitalizing nearby allies!`;
        bState.lastActionDetails = {
            actorId: `SYSTEM_ITEM_HEAL_SHIELD`, // Use the same generic ID for the UI
            commandName: "Restorative Broth",
            effects: effectLog
        };

    } else {
        bState.battleMessage = "The Restorative Broth was used, but no one was nearby to receive its effects...";
    }

    // 6. Stringify the updated state object for the output
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error in restorative_broth.js: ${e.message}`);
    // setLocal('errmsg', e.message);
}
