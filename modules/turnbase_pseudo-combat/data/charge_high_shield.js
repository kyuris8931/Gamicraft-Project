try {
    const bState = JSON.parse(battle_state);
    if (!bState.units || !Array.isArray(bState.units)) {
        throw new Error("bState.units tidak ditemukan atau bukan array.");
    }
    const finalEffects = [];
    const isHighRoll = Math.random() < 0.5;
    const shieldPercentage = isHighRoll ? 0.90 : 0.60;

    bState.units.forEach(unit => {
        if (unit.type === "Ally" && unit.status !== "Defeated") {
            const maxHp = unit.stats.maxHp;
            const shieldAmount = Math.round(maxHp * shieldPercentage);
            if (shieldAmount > 0) {
                if (typeof unit.stats.shieldHP !== 'number') unit.stats.shieldHP = 0;
                unit.stats.shieldHP += shieldAmount;
                finalEffects.push({
                    unitId: unit.id,
                    type: "shield",
                    amount: shieldAmount
                });
            }
        }
    });

    bState.battleMessage = `A barrier of pure energy forms around the team!`;

    if (finalEffects.length > 0) {
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_SHIELD",
            commandName: "Mass Shield",
            effects: finalEffects
        };
    }
    
    battle_state = JSON.stringify(bState);

} catch (e) {
    if (typeof setLocal === 'function') setLocal('errmsg', e.message);
}