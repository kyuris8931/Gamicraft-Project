// --- script_tasker/charge_high_hp_and_shield.js ---
// Description: Heals AND shields all living allies for 60% or 90% of their Max HP.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

const log = (message) => {
    // flash(`JS LOG: ${message}`);
};

try {
    const bState = JSON.parse(battle_state);

    const livingAllies = bState.units.filter(unit => unit.type === 'Ally' && unit.status !== 'Defeated');

    if (livingAllies.length > 0) {
        // --- BARU: Pilih multiplier secara acak antara 60% atau 90% ---
        const multiplier = Math.random() < 0.5 ? 0.60 : 0.90;
        const effectLog = [];

        livingAllies.forEach(ally => {
            if (ally.stats && typeof ally.stats.hp === 'number' && typeof ally.stats.maxHp === 'number') {
                // Hitung nilai dasar berdasarkan Max HP
                const baseAmount = Math.round(ally.stats.maxHp * multiplier);

                // 1. Terapkan HEAL
                const oldHp = ally.stats.hp;
                ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + baseAmount);
                const actualHealedAmount = ally.stats.hp - oldHp;
                
                if (actualHealedAmount > 0) {
                    effectLog.push({
                        type: 'heal',
                        unitId: ally.id,
                        amount: actualHealedAmount
                    });
                }

                // 2. Terapkan SHIELD
                // Pastikan properti shieldHP ada, jika tidak, inisialisasi ke 0
                if (typeof ally.stats.shieldHP === 'undefined') {
                    ally.stats.shieldHP = 0;
                }
                ally.stats.shieldHP += baseAmount;
                
                effectLog.push({
                    type: 'shield',
                    unitId: ally.id,
                    amount: baseAmount
                });
            }
        });

        // Update pesan pertempuran
        bState.battleMessage = "A wave of protective energy washes over the party, restoring health and creating a barrier!";

        // Set "flag" lastActionDetails dengan SEMUA efek
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_HEAL_SHIELD", // ID baru agar lebih deskriptif
            commandName: "Mass Fortification",
            effects: effectLog
        };
        
    } else {
        bState.battleMessage = "A powerful energy was released, but no one was there to receive it...";
    }
    
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error: ${e.message}`);
    setLocal('errmsg', e.message);
}