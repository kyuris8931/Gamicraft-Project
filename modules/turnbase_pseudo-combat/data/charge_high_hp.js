try {
    const bState = JSON.parse(battle_state);
    if (!bState.units || !Array.isArray(bState.units)) {
        throw new Error("bState.units tidak ditemukan atau bukan array.");
    }
    const finalEffects = [];
    const isHighRoll = Math.random() < 0.5;
    const healPercentage = isHighRoll ? 0.90 : 0.60;

    bState.units.forEach(unit => {
        if (unit.type === "Ally" && unit.status !== "Defeated") {
            const maxHp = unit.stats.maxHp;
            const oldHp = unit.stats.hp;
            if (oldHp < maxHp) {
                const healAmount = Math.round(maxHp * healPercentage);
                unit.stats.hp = Math.min(maxHp, oldHp + healAmount);
                const actualHealReceived = unit.stats.hp - oldHp;
                if (actualHealReceived > 0) {
                    finalEffects.push({
                        unitId: unit.id,
                        type: "heal",
                        amount: actualHealReceived
                    });
                }
            }
        }
    });

    bState.battleMessage = `A wave of healing energy washes over the team!`;
    
    if (finalEffects.length > 0) {
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_HEAL",
            commandName: "Mass Heal",
            effects: finalEffects
        };
    }
    
    battle_state = JSON.stringify(bState);

} catch (e) {
    if (typeof setLocal === 'function') setLocal('errmsg', e.message);
}