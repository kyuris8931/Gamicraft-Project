/*
 * Gamicraft - Process Effects (End of Turn) - v1.4 (Reverted Poison Logic & Flag Added)
 *
 * Description:
 * Processes all active effects flagged to trigger at the END of a unit's turn.
 * This script runs BEFORE turn_manager.js. Handles Poison and other end-of-turn effects.
 */

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += `[END_TURN_FX] ${message}\\n`; }

var battle_state_out = battle_state; // Default output jika tidak ada perubahan
var effect_triggered_end = false;     // <<< VARIABEL BARU: Flag untuk Tasker

try {
    const bState = JSON.parse(battle_state);

    if (!bState.active_effects || bState.active_effects.length === 0 || !bState.activeUnitID) {
        exit(); // Keluar jika tidak ada yang perlu diproses.
    }
    
    // Temukan unit yang BARU SAJA menyelesaikan gilirannya.
    const unitThatJustActed = bState.units.find(u => u.id === bState.activeUnitID);
    if (!unitThatJustActed) {
        exit();
    }

    scriptLogger(`Mengecek efek akhir giliran untuk ${unitThatJustActed.name}`);
    
    // Cari semua efek yang relevan untuk unit ini
    let effectsToProcess = bState.active_effects.filter(effect => 
        effect.trigger_phase === 'end_of_turn' && effect.target_id === unitThatJustActed.id
    );

    if (effectsToProcess.length > 0) {
        effect_triggered_end = true; // <<< Set flag ke true karena ada efek yang akan diproses
        scriptLogger(`Ditemukan ${effectsToProcess.length} efek, 'effect_triggered_end' diatur ke true.`);

        effectsToProcess.forEach(effect => {
            scriptLogger(`Memproses efek: "${effect.type}" dari skill "${effect.source_skill_name}"`);

            switch(effect.type.toLowerCase()) {
                case 'poison':
                    const damage = effect.damage || 5; // Ambil damage dari properti efek
                    const oldHp = unitThatJustActed.stats.hp;
                    
                    // Kurangi HP unit
                    unitThatJustActed.stats.hp = Math.max(0, oldHp - damage);
                    
                    bState.battleMessage = `${unitThatJustActed.name} menerima ${damage} damage dari Poison!`;
                    scriptLogger(`${unitThatJustActed.name} menerima ${damage} damage. HP: ${oldHp} -> ${unitThatJustActed.stats.hp}`);
                    
                    // Set flag untuk UI agar bisa menampilkan pop-up damage
                    bState.lastActionDetails = {
                        actorId: unitThatJustActed.id,
                        effects: [{ type: 'damage', unitId: unitThatJustActed.id, amount: damage }]
                    };

                    if (unitThatJustActed.stats.hp === 0) {
                        unitThatJustActed.status = "Defeated";
                        scriptLogger(`${unitThatJustActed.name} dikalahkan oleh Poison!`);
                    }
                    break;
                
                // Tambahkan case lain di sini untuk efek end-of-turn lainnya,
                // contohnya: 'self_repair', 'burning', dll.
            }
        });

        // Kembalikan state yang sudah dimodifikasi
        battle_state_out = JSON.stringify(bState);
    }

} catch (e) {
    scriptLogger("ERROR: " + e.message + " | Stack: " + e.stack);
}

// Set variabel output untuk Tasker
var js_script_log = taskerLogOutput;
var battle_state = battle_state_out;
// Variabel `effect_triggered_end` akan diekspor secara otomatis