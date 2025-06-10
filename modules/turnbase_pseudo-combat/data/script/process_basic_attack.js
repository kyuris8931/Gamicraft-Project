// --- script_tasker/process_basic_attack.js ---
// Deskripsi: Skrip ini HANYA memproses aksi Basic Attack dari pemain.
// Versi ini menyertakan logika SP gain yang diacak.
//
// Variabel Input dari Tasker:
// - battle_state: String JSON dari battle_state saat ini.
// - actor_id: ID unit yang melakukan Basic Attack.
// - target_id: ID unit yang menjadi target Basic Attack.
//
// Variabel Output untuk Tasker:
// - battle_state: String JSON dari battle_state yang telah diupdate.
// - js_script_log: Log eksekusi untuk debugging.
// - was_target_eliminated: Boolean, true jika target berhasil dikalahkan.

let taskerLogOutput = "";
let wasTargetEliminated = false;
function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}

/**
 * Helper function untuk mendapatkan objek unit dari state berdasarkan ID.
 * @param {string} unitId - ID unit yang dicari.
 * @param {Array<object>} unitsArray - Array semua unit dari bState.units.
 * @returns {object|null} Objek unit jika ditemukan, jika tidak null.
 */
function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

/**
 * Helper function untuk menerapkan damage ke target, dengan memperhitungkan shield.
 * @param {object} targetUnit - Objek unit target yang akan menerima damage.
 * @param {number} damageAmount - Jumlah damage yang akan diterapkan.
 * @returns {{totalDamage: number, shieldDamage: number, hpDamage: number}} Objek berisi detail damage.
 */
function applyDamage(targetUnit, damageAmount) {
    let remainingDamage = Math.round(damageAmount);
    let shieldDamageDealt = 0;
    let hpDamageDealt = 0;

    // Kurangi shield terlebih dahulu jika ada
    if (targetUnit.stats.shieldHP && targetUnit.stats.shieldHP > 0) {
        shieldDamageDealt = Math.min(targetUnit.stats.shieldHP, remainingDamage);
        targetUnit.stats.shieldHP -= shieldDamageDealt;
        remainingDamage -= shieldDamageDealt;
        scriptLogger(`APPLY_DMG: Shield target ${targetUnit.name} menyerap ${shieldDamageDealt} damage. Sisa shield: ${targetUnit.stats.shieldHP}.`);
    }

    // Terapkan sisa damage ke HP
    if (remainingDamage > 0) {
        hpDamageDealt = Math.min(targetUnit.stats.hp, remainingDamage);
        targetUnit.stats.hp -= hpDamageDealt;
        scriptLogger(`APPLY_DMG: HP target ${targetUnit.name} menerima ${hpDamageDealt} damage. HP sekarang: ${targetUnit.stats.hp}.`);
    }
    
    // Periksa apakah unit kalah
    if (targetUnit.stats.hp <= 0) {
        targetUnit.stats.hp = 0; // Pastikan HP tidak negatif
        targetUnit.status = "Defeated";
        scriptLogger(`APPLY_DMG: Unit ${targetUnit.name} telah dikalahkan!`);
    }

    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}

/**
 * Helper function untuk menghasilkan SP secara acak setelah Basic Attack.
 * @param {object} bState - Objek battle_state.
 * @returns {number} Jumlah SP yang dihasilkan.
 */
function generateSPForBasicAttack(bState) {
    // --- PERUBAHAN: Logika SP Gain sekarang diacak ---
    let spGain = 0;
    const rand = Math.random();
    if (rand < 0.02) spGain = 5;        // 2% untuk 5 SP (Jackpot!)
    else if (rand < 0.10) spGain = 4;   // 8% untuk 4 SP
    else if (rand < 0.27) spGain = 3;   // 17% untuk 3 SP
    else if (rand < 0.55) spGain = 2;   // 28% untuk 2 SP
    else spGain = 1;                    // 45% untuk 1 SP
    
    if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
        bState.teamSP = Math.min(bState.teamSP + spGain, bState.maxTeamSP);
        return spGain;
    }
    return 0;
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("BASIC_ATTACK_PROC: Script dimulai.");

    // 1. Validasi dan Parsing Input dari Tasker
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong atau tidak valid.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' kosong.");
    if (typeof target_id !== 'string' || !target_id.trim()) throw new Error("Input 'target_id' kosong.");

    bState = JSON.parse(battle_state);
    const attacker = getUnitById(actor_id, bState.units);
    const defender = getUnitById(target_id, bState.units);

    if (!attacker) throw new Error(`Aktor dengan ID ${actor_id} tidak ditemukan.`);
    if (!defender) throw new Error(`Target dengan ID ${target_id} tidak ditemukan.`);
    if (attacker.status === "Defeated") throw new Error(`Aktor ${attacker.name} sudah kalah.`);
    if (defender.status === "Defeated") throw new Error(`Target ${defender.name} sudah kalah.`);

    scriptLogger(`BASIC_ATTACK_PROC: Aktor: ${attacker.name}, Target: ${defender.name}`);

    // 2. Kalkulasi dan Terapkan Damage
    const damageDealt = attacker.stats.atk; // Damage Basic Attack = ATK Aktor
    const damageResult = applyDamage(defender, damageDealt);

    if (defender.status === "Defeated") {
        wasTargetEliminated = true; // <-- TAMBAHKAN BARIS INI
        scriptLogger(`BASIC_ATTACK_PROC: ${defender.name} telah dikalahkan!`);
    }
    
    // 3. Generate SP
    const spGained = generateSPForBasicAttack(bState);
    scriptLogger(`BASIC_ATTACK_PROC: Mendapatkan ${spGained} SP. SP Tim sekarang: ${bState.teamSP}.`);
    
    // 4. Update Battle Message dan Detail Aksi Terakhir
    bState.battleMessage = `${attacker.name} menyerang ${defender.name}, memberikan ${damageResult.totalDamage} damage. (+${spGained} SP)`;
    bState.lastActionDetails = {
        actorId: actor_id,
        commandId: "__BASIC_ATTACK__",
        commandName: "Basic Attack",
        targets: [target_id],
        effectsSummary: [`${defender.name} (-${damageResult.totalDamage} HP)`]
    };
    
    // Set status aktor menjadi 'EndTurn'
    attacker.status = "EndTurn";
    scriptLogger(`BASIC_ATTACK_PROC: Status ${attacker.name} diubah menjadi EndTurn.`);


} catch (e) {
    scriptLogger("BASIC_ATTACK_PROC_ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Basic Attack Error: " + e.message;
}

// --- Output untuk Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
