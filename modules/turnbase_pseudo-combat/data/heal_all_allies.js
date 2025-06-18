// --- script_tasker/heal_all_allies.js ---
// Description: Restores 30-50% of max HP to all living allies
// and adds a feedback flag for the UI to trigger animations.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.

// Fungsi untuk logging, bisa diabaikan jika tidak perlu
const log = (message) => {
    // Anda bisa mengaktifkan ini untuk debugging di Tasker
    // flash(`JS LOG: ${message}`);
};

try {
    // Ambil dan parse battle_state
    const bState = JSON.parse(battle_state);

    if (!bState.units || !Array.isArray(bState.units)) {
        log("Error: bState.units tidak ditemukan atau bukan array.");
        exit();
    }

    const healedUnitsLog = [];

    // Iterasi melalui semua unit
    bState.units.forEach(unit => {
        // Terapkan hanya pada 'Ally' yang masih hidup
        if (unit.type === "Ally" && unit.status !== "Defeated") {
            const maxHp = unit.stats.maxHp;
            const currentHp = unit.stats.hp;

            // Jangan heal jika HP sudah penuh
            if (currentHp >= maxHp) {
                return; // Lanjut ke unit berikutnya
            }

            // Hasilkan persentase heal acak antara 0.3 dan 0.5
            const healPercentage = Math.random() * (0.5 - 0.3) + 0.3;
            const healAmount = Math.round(maxHp * healPercentage);

            const oldHp = unit.stats.hp;
            // Terapkan heal, pastikan tidak melebihi max HP
            unit.stats.hp = Math.min(maxHp, currentHp + healAmount);
            
            const actualHealReceived = unit.stats.hp - oldHp;

            // Tambahkan ke log untuk pesan dan feedback
            if (actualHealReceived > 0) {
                healedUnitsLog.push({ 
                    unitId: unit.id, 
                    amount: actualHealReceived 
                });
            }
        }
    });

    bState.battleMessage = "Luminous sap surges forth—life blossoms anew across the team!";
    
    // --- Tambahkan 'lastActionDetails' untuk feedback ke UI ---
    if (healedUnitsLog.length > 0) {
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_HEAL", // ID khusus agar UI bisa membedakannya
            commandName: "Mass Heal",
            // Simpan detail setiap unit yang di-heal
            effects: healedUnitsLog 
        };
    }
    // --------------------------------------------------------
    
    // Siapkan output kembali ke Tasker
    battle_state = JSON.stringify(bState);

} catch (e) {
    // Tangani jika terjadi error (misal, JSON tidak valid)
    log(`Error: ${e.message}`);
    setLocal('errmsg', e.message);
}
