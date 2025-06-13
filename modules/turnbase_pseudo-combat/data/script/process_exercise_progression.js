// --- process_exercise_progression.js (Tasker) ---
// Deskripsi: Memproses penambahan EXP untuk progresi statistik olahraga.
// Input dari Tasker:
// - %progression_data: String JSON dari gamicraft_progression_data.json.
// - %exercise_id: ID dari exercise yang mendapat EXP (e.g., "push_up").
// - %amount: Jumlah EXP yang ditambahkan.
//
// Output untuk Tasker:
// - %new_progression_data: String JSON dari data progresi yang sudah diupdate.
// - %js_script_log: Log eksekusi untuk debugging.
// - %did_level_up: "true" jika terjadi kenaikan level, "false" jika tidak.

let taskerLogOutput = "";
function scriptLogger(message) {
    // Logger sederhana untuk debugging di Tasker
    taskerLogOutput += message + "\n";
}

let progressionData;
let levelUpOccurred = false;

try {
    scriptLogger("EXERCISE_PROC: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof progression_data !== 'string' || !progression_data.trim()) {
        throw new Error("Input 'progression_data' kosong atau tidak valid.");
    }
    progressionData = JSON.parse(progression_data);

    if (typeof exercise_id !== 'string' || !exercise_id.trim()) {
        throw new Error("Input 'exercise_id' kosong atau tidak valid.");
    }

    const expToAdd = parseInt(amount, 10);
    if (isNaN(expToAdd)) {
        throw new Error(`Input 'amount' (${amount}) bukan angka yang valid.`);
    }

    scriptLogger(`Mencari exercise dengan ID: ${exercise_id}`);
    const exerciseToUpdate = progressionData.exerciseStatsProgression.find(ex => ex.id === exercise_id);

    if (!exerciseToUpdate) {
        throw new Error(`Exercise dengan ID '${exercise_id}' tidak ditemukan dalam data progresi.`);
    }

    // 2. Tambahkan EXP
    scriptLogger(`Data awal: Level ${exerciseToUpdate.level}, EXP ${exerciseToUpdate.exp}. Menambahkan ${expToAdd} EXP.`);
    exerciseToUpdate.exp += expToAdd;
    scriptLogger(`Data setelah ditambah: Level ${exerciseToUpdate.level}, EXP ${exerciseToUpdate.exp}.`);

    // 3. Proses Level Up (bisa terjadi berkali-kali dalam satu pemanggilan)
    let canLevelUp = true;
    while (canLevelUp) {
        const currentLevel = exerciseToUpdate.level;
        
        // Formula Kebutuhan EXP: 10 * (Level * (Level + 1) / 2)
        const expForNextLevel = 10 * (currentLevel * (currentLevel + 1) / 2);
        scriptLogger(`Cek Level Up: Butuh ${expForNextLevel} EXP untuk naik dari Lv. ${currentLevel}. Punya ${exerciseToUpdate.exp} EXP.`);

        if (exerciseToUpdate.exp >= expForNextLevel) {
            exerciseToUpdate.level++;
            exerciseToUpdate.exp -= expForNextLevel;
            levelUpOccurred = true;
            scriptLogger(`LEVEL UP! Naik ke Level ${exerciseToUpdate.level}. Sisa EXP: ${exerciseToUpdate.exp}.`);
        } else {
            // Jika EXP tidak cukup, hentikan loop pengecekan
            canLevelUp = false;
        }
    }

    scriptLogger("EXERCISE_PROC: Proses selesai.");

} catch (e) {
    scriptLogger("EXERCISE_PROC_ERROR: " + e.message);
    // Set progressionData ke null agar Tasker tahu ada masalah
    progressionData = null;
}

// 4. Siapkan Variabel Output untuk Tasker
// Hanya kirim data baru kembali jika tidak ada error
var new_progression_data = progressionData ? JSON.stringify(progressionData) : "";
var js_script_log = taskerLogOutput;
var did_level_up = levelUpOccurred; // Akan menjadi 'true' atau 'false'