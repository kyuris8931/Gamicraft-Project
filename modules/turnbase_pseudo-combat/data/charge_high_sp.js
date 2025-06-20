// --- script_tasker/add_high_sp.js ---
// Description: Increases the team's SP by a random amount between 7 and 9.
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

    // Pastikan teamSP dan maxTeamSP ada
    if (typeof bState.teamSP !== 'number' || typeof bState.maxTeamSP !== 'number') {
        log("Error: teamSP atau maxTeamSP tidak ditemukan di battle_state.");
        exit();
    }

    const spToAdd = Math.floor(Math.random() * 3) + 7;
    const oldSP = bState.teamSP;

    // Tambahkan SP dan pastikan tidak melebihi batas maksimum
    bState.teamSP = Math.min(bState.teamSP + spToAdd, bState.maxTeamSP);

    const spGained = bState.teamSP - oldSP;

    // Update pesan untuk ditampilkan di UI
    bState.battleMessage = `The Feast ignites their spirits—Aether surges through, restoring ${spGained} SP!`;

    // Ini adalah "flag" yang akan dibaca oleh UI untuk memicu animasi.
    if (spGained > 0) {
        bState.lastActionDetails = {
            actorId: "SYSTEM_ITEM_SP",
            commandName: "SP Charge",
            effects: [
                { type: "sp_gain", amount: spGained }
            ]
        };
    }
    
    // Siapkan output kembali ke Tasker
    battle_state = JSON.stringify(bState);

} catch (e) {
    // Tangani jika terjadi error (misal, JSON tidak valid)
    log(`Error: ${e.message}`);
    setLocal('errmsg', e.message);
}
