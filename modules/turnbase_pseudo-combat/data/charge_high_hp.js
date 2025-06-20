// --- script_tasker/charge_high_heal.js ---
// Description: Heals all living allies for a random high amount (40% to 60% of their Max HP).
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
    // 1. Ambil dan parse battle_state
    const bState = JSON.parse(battle_state);

    // 2. Temukan semua unit "Ally" yang masih hidup
    const livingAllies = bState.units.filter(unit => unit.type === 'Ally' && unit.status !== 'Defeated');

    if (livingAllies.length > 0) {
        // --- DIUBAH: Nama variabel agar lebih jelas ---
        const healEffectsLog = [];

        // 3. Loop melalui setiap ally yang hidup dan sembuhkan mereka
        livingAllies.forEach(ally => {
            if (ally.stats && typeof ally.stats.hp === 'number' && typeof ally.stats.maxHp === 'number') {
                const healPercentage = Math.random() * 0.20 + 0.40;
                const healAmount = Math.round(ally.stats.maxHp * healPercentage);
                const oldHp = ally.stats.hp;

                ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + healAmount);

                const actualHealedAmount = ally.stats.hp - oldHp;

                if (actualHealedAmount > 0) {
                     // --- DIUBAH: Push objek terstruktur, bukan string ---
                     healEffectsLog.push({
                         type: 'heal', // Tambahkan tipe agar mudah dibaca UI
                         unitId: ally.id,
                         amount: actualHealedAmount
                     });
                }
            }
        });

        // 4. Update pesan untuk ditampilkan di UI
        bState.battleMessage = "A wave of soothing energy washes over the party, restoring health!";

        // 5. Set "flag" lastActionDetails dengan struktur data yang BENAR
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_HEAL", // ID khusus untuk item heal
            commandName: "Mass Heal",
            // --- DIUBAH: Gunakan properti `effects` dengan log terstruktur ---
            effects: healEffectsLog
        };
        
    } else {
        bState.battleMessage = "A healing energy was released, but no one was there to receive it...";
    }
    
    // 6. Siapkan output kembali ke Tasker
    battle_state = JSON.stringify(bState);

} catch (e) {
    log(`Error: ${e.message}`);
    setLocal('errmsg', e.message);
}