// --- script_tasker/enemy_action_processor.js (Perbaikan) ---
// Deskripsi: Skrip ini HANYA memproses giliran musuh.
// AI akan melakukan serangan dasar berdasarkan 'role' (Melee/Ranged).
//
// Variabel Input dari Tasker:
// - battle_state: String JSON dari battle_state saat ini.
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
    }

    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("ENEMY_AI: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong atau tidak valid.");
    bState = JSON.parse(battle_state);

    const activeEnemyId = bState.activeUnitID;
    if (!activeEnemyId) throw new Error("bState.activeUnitID tidak ditemukan.");

    const attacker = getUnitById(activeEnemyId, bState.units);
    if (!attacker) throw new Error(`Musuh dengan ID ${activeEnemyId} tidak ditemukan.`);
    if (attacker.type !== "Enemy") throw new Error(`Unit ${attacker.name} bukan musuh, AI dibatalkan.`);
    if (attacker.status === "Defeated") throw new Error(`Musuh ${attacker.name} sudah kalah.`);
    if (!attacker.role) throw new Error(`Musuh ${attacker.name} tidak memiliki 'role'.`);

    scriptLogger(`ENEMY_AI: Giliran untuk ${attacker.name} (Role: ${attacker.role})`);

    // 2. Tentukan Target Berdasarkan Role
    let validTargetPseudoPositions = [];
    if (attacker.role.toLowerCase() === 'ranged') {
        validTargetPseudoPositions = [-2, 2]; // Contoh: Ranged menyerang posisi 2 di depan/belakang
    } else { // Default ke Melee
        validTargetPseudoPositions = [-1, 1]; // Melee menyerang posisi 1 di depan/belakang
    }
    scriptLogger(`ENEMY_AI: Mencari target di posisi relatif: ${validTargetPseudoPositions.join(', ')}`);
    
    const potentialTargets = bState.units.filter(unit =>
        unit.type === "Ally" &&
        unit.status !== "Defeated" &&
        validTargetPseudoPositions.includes(unit.pseudoPos)
    );

    let chosenTarget = null;
    if (potentialTargets.length > 0) {
        // Pilih target secara acak dari yang valid
        const randomIndex = Math.floor(Math.random() * potentialTargets.length);
        chosenTarget = potentialTargets[randomIndex];
        scriptLogger(`ENEMY_AI: Menemukan ${potentialTargets.length} target valid. Memilih: ${chosenTarget.name}`);
    } else {
        scriptLogger(`ENEMY_AI: Tidak ada target valid dalam jangkauan. Melewatkan giliran.`);
        bState.battleMessage = `${attacker.name} tidak menemukan target dalam jangkauan.`;
    }

    // 3. Lakukan Serangan Jika Ada Target
    if (chosenTarget) {
        const damageDealt = attacker.stats.atk;
        const damageResult = applyDamage(chosenTarget, damageDealt);

        if (chosenTarget.status === "Defeated") {
            wasTargetEliminated = true;
            scriptLogger(`ENEMY_AI: ${chosenTarget.name} telah dikalahkan!`);
        }

        scriptLogger(`ENEMY_AI: ${attacker.name} menyerang ${chosenTarget.name}, damage: ${damageResult.totalDamage}.`);
        if (chosenTarget.status === "Defeated") {
            scriptLogger(`ENEMY_AI: ${chosenTarget.name} telah dikalahkan!`);
        }
        
        bState.battleMessage = `${attacker.name} menyerang ${chosenTarget.name}, memberikan ${damageResult.totalDamage} damage!`;
        bState.lastActionDetails = {
            actorId: activeEnemyId,
            commandId: "__BASIC_ATTACK__",
            commandName: "Basic Attack",
            targets: [chosenTarget.id],
            effectsSummary: [`${chosenTarget.name} (-${damageResult.totalDamage} HP)`]
        };
    } else {
        // --- PERUBAHAN DI SINI ---
        // Kita berikan sinyal ke UI bahwa tidak ada target yang ditemukan
        scriptLogger(`ENEMY_AI: Tidak ada target valid dalam jangkauan. Melewatkan giliran.`);
        bState.battleMessage = `${attacker.name} tidak menemukan target dalam jangkauan.`;

        // TAMBAHKAN INI: Buat "sinyal" untuk UI
        bState.lastActionDetails = {
            actorId: activeEnemyId,
            commandId: "__NO_ACTION__", // Menggunakan commandId yang lebih spesifik
            commandName: "No Target",
            targets: [],
            effectsSummary: [],
            actionOutcome: "NO_TARGET_IN_RANGE" // Ini sinyal penting untuk dibaca UI
        };
    }

    // 4. Akhiri Giliran Musuh
    attacker.status = "EndTurn";
    scriptLogger(`ENEMY_AI: Status ${attacker.name} diubah menjadi EndTurn.`);

} catch (e) {
    scriptLogger("ENEMY_AI_ERROR: " + e.message);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Enemy AI Error: " + e.message;
}

// --- Output untuk Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
