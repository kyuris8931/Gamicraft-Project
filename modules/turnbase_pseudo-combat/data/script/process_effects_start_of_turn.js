/*
 * Gamicraft - Process Effects (Start of Turn) - v1.5 (Poison Removed & Flag Added)
 *
 * Description:
 * Processes all active effects flagged to trigger at the START of a unit's turn.
 * This script runs AFTER turn_manager.js and BEFORE the unit's action script.
 */

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += `[START_TURN_FX] ${message}\\n`; }

var battle_state_out = battle_state; // Default output if no changes
var effect_triggered_start = false;  // <<< VARIABEL BARU: Flag untuk Tasker

try {
    const bState = JSON.parse(battle_state);

    if (!bState.active_effects || bState.active_effects.length === 0 || !bState.activeUnitID) {
        exit(); // Keluar jika tidak ada yang perlu diproses.
    }
    
    const activeUnit = bState.units.find(u => u.id === bState.activeUnitID);
    if (!activeUnit) {
        exit();
    }

    scriptLogger(`Mengecek efek awal giliran untuk ${activeUnit.name}`);
    
    // Cari semua efek yang relevan untuk unit ini
    let effectsToProcess = bState.active_effects.filter(effect => 
        effect.trigger_phase === 'start_of_turn' && effect.target_id === activeUnit.id
    );

    if (effectsToProcess.length > 0) {
        effect_triggered_start = true; // <<< Set flag ke true karena ada efek yang akan diproses
        scriptLogger(`Ditemukan ${effectsToProcess.length} efek, 'effect_triggered_start' diatur ke true.`);
        
        let hasBeenStunned = false;

        effectsToProcess.forEach(effect => {
            scriptLogger(`Memproses efek: "${effect.type}" dari skill "${effect.source_skill_name}"`);

            switch(effect.type.toLowerCase()) {
                case 'stun':
                    bState._unitIsStunned = true;
                    hasBeenStunned = true;
                    bState.battleMessage = `${activeUnit.name} is stunned and cannot move!`;
                    scriptLogger(`SUCCESS: Stun effect found. Set bState._unitIsStunned to true.`);
                    break;
                
                // KASUS POISON TIDAK ADA DI SINI
                
                case 'gain_gauge_start':
                    if (hasBeenStunned) break;
                    const gaugeToGain = effect.amount || 10;
                    activeUnit.stats.gauge = Math.min((activeUnit.stats.gauge || 0) + gaugeToGain, activeUnit.stats.maxGauge);
                    bState.battleMessage = `${activeUnit.name} gains ${gaugeToGain} gauge from an effect!`;
                    scriptLogger(`${activeUnit.name} gained ${gaugeToGain} gauge. Total: ${activeUnit.stats.gauge}`);
                    break;
                
                // Tambahkan case lain untuk efek start-of-turn lainnya di sini.
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
// Variabel `effect_triggered_start` akan diekspor secara otomatis