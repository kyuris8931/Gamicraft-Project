// --- script_tasker/process_basic_attack.js (Versi Lengkap & Diperbaiki) ---
// Deskripsi: Memproses aksi Basic Attack dari pemain.
// Termasuk: kalkulasi damage, penerapan damage, generasi SP secara acak,
// dan pelacakan musuh yang kalah untuk sistem progresi.
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

// --- FUNGSI HELPER ---

function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

/**
 * Menerapkan damage ke target, dengan memperhitungkan shield dan melacak progresi.
 * @param {object} targetUnit - Objek unit target.
 * @param {number} damageAmount - Jumlah damage.
 * @param {object} bStateRef - Referensi ke battle_state untuk melacak progresi.
 * @returns {{totalDamage: number, shieldDamage: number, hpDamage: number}}
 */
function applyDamage(targetUnit, damageAmount, bStateRef) {
    let remainingDamage = Math.round(damageAmount);
    let shieldDamageDealt = 0;
    let hpDamageDealt = 0;

    if (targetUnit.stats.shieldHP && targetUnit.stats.shieldHP > 0) {
        shieldDamageDealt = Math.min(targetUnit.stats.shieldHP, remainingDamage);
        targetUnit.stats.shieldHP -= shieldDamageDealt;
        remainingDamage -= shieldDamageDealt;
    }

    if (remainingDamage > 0) {
        hpDamageDealt = Math.min(targetUnit.stats.hp, remainingDamage);
        targetUnit.stats.hp -= hpDamageDealt;
    }

    if (targetUnit.stats.hp <= 0) {
        targetUnit.stats.hp = 0;
        targetUnit.status = "Defeated";
        wasTargetEliminated = true;

        // Lacak musuh yang kalah untuk progresi
        if (targetUnit.type === "Enemy" && bStateRef._defeatedEnemiesThisBattle && !bStateRef._defeatedEnemiesThisBattle.some(e => e.id === targetUnit.id)) {
            const baseExp = bStateRef.units.find(u => u.id === targetUnit.id)?.expValue || 1;
            bStateRef._defeatedEnemiesThisBattle.push({
                id: targetUnit.id,
                tier: targetUnit.tier,
                expValue: baseExp
            });
            scriptLogger(`TRACKING: ${targetUnit.name} (Tier: ${targetUnit.tier}) ditambahkan ke daftar progresi.`);
        }
    }
    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}

/**
 * Menghasilkan SP secara acak dan menambahkannya ke bState.
 * @param {object} bState - Objek battle_state yang akan dimodifikasi.
 * @returns {number} Jumlah SP yang dihasilkan.
 */
function generateSPForBasicAttack(bState) {
    let spGain = 0;
    const rand = Math.random();
        
    if (rand < 0.02) spGain = 5;      // 2% untuk 5 SP
    else if (rand < 0.10) spGain = 4; // 8% untuk 4 SP
    else if (rand < 0.27) spGain = 3; // 17% untuk 3 SP
    else if (rand < 0.55) spGain = 2; // 28% untuk 2 SP
    else spGain = 1;                  // 45% untuk 1 SP
    
    // Pastikan teamSP dan maxTeamSP ada sebelum diubah
    if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
        bState.teamSP = Math.min(bState.teamSP + spGain, bState.maxTeamSP);
        return spGain;
    }
    
    scriptLogger("SP_GEN_WARN: bState.teamSP atau bState.maxTeamSP tidak terdefinisi. Gagal menambah SP.");
    return 0; // Gagal menghasilkan SP jika state tidak valid
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("BASIC_ATTACK_PROC: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' kosong.");
    if (typeof target_id !== 'string' || !target_id.trim()) throw new Error("Input 'target_id' kosong.");

    bState = JSON.parse(battle_state);
    // Inisialisasi array pelacak progresi jika belum ada
    if (!bState._defeatedEnemiesThisBattle) {
        bState._defeatedEnemiesThisBattle = [];
    }

    const attacker = getUnitById(actor_id, bState.units);
    const defender = getUnitById(target_id, bState.units);

    if (!attacker) throw new Error(`Aktor dengan ID ${actor_id} tidak ditemukan.`);
    if (!defender) throw new Error(`Target dengan ID ${target_id} tidak ditemukan.`);
    if (attacker.status === "Defeated") throw new Error(`Aktor ${attacker.name} sudah kalah.`);
    if (defender.status === "Defeated") throw new Error(`Target ${defender.name} sudah kalah.`);

    scriptLogger(`Aktor: ${attacker.name}, Target: ${defender.name}`);

    // 2. Kalkulasi dan Terapkan Damage
    const damageDealt = attacker.stats.atk;
    const damageResult = applyDamage(defender, damageDealt, bState);
    scriptLogger(`DAMAGE: ${attacker.name} memberikan ${damageResult.totalDamage} total damage.`);

    if (wasTargetEliminated) {
        scriptLogger(`KILL: ${defender.name} telah dikalahkan!`);
    }
    
    // 3. Generate SP
    const spGained = generateSPForBasicAttack(bState);
    scriptLogger(`SP_GEN: Mendapatkan ${spGained} SP. SP Tim sekarang: ${bState.teamSP}/${bState.maxTeamSP}.`);
    
    // 4. Update Battle Message dan Detail Aksi Terakhir
    bState.battleMessage = `${attacker.name} menyerang ${defender.name}, memberikan ${damageResult.totalDamage} damage. (+${spGained} SP)`;
    bState.lastActionDetails = {
        actorId: actor_id,
        commandId: "__BASIC_ATTACK__",
        commandName: "Basic Attack",
        targets: [target_id],
        effectsSummary: [`${defender.name} (-${damageResult.totalDamage} HP)`]
    };
    
    // 5. Set status aktor menjadi 'EndTurn'
    attacker.status = "EndTurn";
    scriptLogger(`STATUS: Status ${attacker.name} diubah menjadi EndTurn.`);

} catch (e) {
    scriptLogger("BASIC_ATTACK_PROC_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Basic Attack Error: " + e.message;
}

// --- Output untuk Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;