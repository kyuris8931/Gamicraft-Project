// --- process_battle_results.js (Tasker - Versi Formula) ---
// Deskripsi: Menghitung dan menyimpan progresi EXP/Level menggunakan formula matematika.
//
// Variabel Input dari Tasker:
// - progression_data: String JSON dari gamicraft_progression_data.json
// - battle_outcome: String "Win" atau "Lose"
// - defeated_enemies_json: String JSON array dari musuh yang dikalahkan.
//
// Variabel Output untuk Tasker:
// - new_progression_data: String JSON dari data progresi yang sudah diupdate.
// - js_script_log: Log eksekusi untuk debugging.

let taskerLogOutput = "";
function scriptLogger(message) { taskerLogOutput += message + "\\n"; }

scriptLogger("BATTLE_RESULTS_PROC (Formula): Script dimulai.");

let progressionData;
try {
    // 1. Parsing Input
    if (typeof progression_data !== 'string' || !progression_data.trim()) throw new Error("Input 'progression_data' kosong.");
    if (typeof battle_outcome !== 'string' || !battle_outcome.trim()) throw new Error("Input 'battle_outcome' kosong.");
    if (typeof defeated_enemies_json !== 'string' || !defeated_enemies_json.trim()) throw new Error("Input 'defeated_enemies_json' kosong.");

    progressionData = JSON.parse(progression_data);
    const defeatedEnemies = JSON.parse(defeated_enemies_json);
    const isWin = battle_outcome === "Win";

    scriptLogger(`Hasil: ${battle_outcome}. Musuh dikalahkan: ${defeatedEnemies.length}`);

    // 2. Kalkulasi EXP untuk Hero
    const enemyGlobalLevel = progressionData.enemyProgression.globalLevel;
    let totalBaseExpGained = 0;
    defeatedEnemies.forEach(enemy => {
        // Ambil base EXP dari musuh, kalikan dengan level global musuh
        totalBaseExpGained += (enemy.expValue || 0) * enemyGlobalLevel;
    });

    const finalHeroExpGained = isWin ? totalBaseExpGained * 2 : totalBaseExpGained;
    scriptLogger(`Total EXP didapat untuk Hero: ${finalHeroExpGained}`);

    progressionData.heroes.forEach(hero => {
        // Tambahkan EXP ke hero. Ini juga akan berfungsi untuk item seperti EXP Potion.
        hero.exp += finalHeroExpGained;
        scriptLogger(`Hero ${hero.id}: EXP baru ${hero.exp}`);

        // Cek Kenaikan Level Hero dengan Formula Triangular
        let canLevelUp = true;
        while (canLevelUp) {
            // Hitung kebutuhan EXP dengan formula final (Triangular Number)
            const currentLevel = hero.level;
            const expForNextLevel = 50 * (currentLevel * (currentLevel + 1) / 2);
            
            if (hero.exp >= expForNextLevel) {
                hero.level++;
                hero.exp -= expForNextLevel;
                scriptLogger(`LEVEL UP! Hero ${hero.id} sekarang Level ${hero.level}! Sisa EXP: ${hero.exp}`);
            } else {
                canLevelUp = false; // Berhenti jika EXP tidak cukup
            }
        }
    });

    // 3. Kalkulasi EXP untuk Musuh Global
    const enemyProg = progressionData.enemyProgression;
    const enemyExpChange = isWin ? 25 : -50; // <-- Perubahan poin EXP
    enemyProg.exp += enemyExpChange;
    scriptLogger(`EXP Musuh Global berubah ${enemyExpChange}. EXP sekarang: ${enemyProg.exp}`);

    // --- LOGIKA BARU: Penurunan Level Musuh ---
    // Loop ini berjalan jika EXP menjadi negatif dan level masih di atas 1
    while (enemyProg.exp < 0 && enemyProg.globalLevel > 1) {
        // Ambil total EXP dari level sebelumnya untuk "dikembalikan"
        const expOfPreviousLevel = 50 * (enemyProg.globalLevel - 1);
        
        // Turunkan level musuh
        enemyProg.globalLevel--;
        
        // Tambahkan sisa EXP dengan basis EXP level yang baru
        enemyProg.exp += expOfPreviousLevel;
        
        scriptLogger(`LEVEL DOWN! Musuh global sekarang turun ke Level ${enemyProg.globalLevel}! Sisa EXP: ${enemyProg.exp}`);
    }

    // Jika setelah de-leveling EXP masih negatif (misal dari Lv 2 ke 1), reset ke 0.
    if (enemyProg.exp < 0) {
        enemyProg.exp = 0;
    }
    // --- AKHIR LOGIKA BARU ---


    // Cek Kenaikan Level Musuh Global (Logika ini tetap sama)
    let enemyCanLevelUp = true;
    while(enemyCanLevelUp) {
        const expForNextEnemyLevel = 50 * enemyProg.globalLevel; // Formula: 50 * Level Saat Ini

        if (enemyProg.exp >= expForNextEnemyLevel) {
            enemyProg.globalLevel++;
            enemyProg.exp -= expForNextEnemyLevel;
            scriptLogger(`ENEMY LEVEL UP! Musuh global sekarang naik ke Level ${enemyProg.globalLevel}! Sisa EXP: ${enemyProg.exp}`);
        } else {
            enemyCanLevelUp = false; // Berhenti jika EXP tidak cukup
        }
    }

} catch (e) {
    scriptLogger("BATTLE_RESULTS_PROC_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!progressionData) progressionData = { "error": e.message };
}

var new_progression_data = JSON.stringify(progressionData);
var js_script_log = taskerLogOutput;