// --- process_item_heal_all.js (Tasker) ---
// Deskripsi: Script sederhana untuk memproses efek item 'Heal All 25%'.
// Ini adalah implementasi hard-code untuk satu item spesifik.
//
// Input dari Tasker:
// - %battle_state: String JSON dari battle_state saat ini.
// - %item_name: (Opsional) Nama item untuk logging, e.g., "Potion of Valor".
//
// Output untuk Tasker:
// - %battle_state: String JSON dari battle_state yang telah diupdate.
// - %js_script_log: Log eksekusi untuk debugging.

let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += message + "\n";
}

let bState;
try {
    scriptLogger("ITEM_PROC_HEAL_ALL: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) {
        throw new Error("Input 'battle_state' kosong atau tidak valid.");
    }
    bState = JSON.parse(battle_state);

    if (!bState.units || !Array.isArray(bState.units)) {
        throw new Error("Struktur battle_state tidak valid, 'units' tidak ditemukan.");
    }

    // Mengambil nama item dari input atau menggunakan nama default
    const itemName = typeof item_name === 'string' && item_name.trim() ? item_name : "Healing Item";
    const healedUnitsLog = [];

    // 2. Iterasi dan Terapkan Efek Heal ke semua Ally yang hidup
    bState.units.forEach(unit => {
        // Efek hanya berlaku untuk 'Ally' yang statusnya BUKAN 'Defeated'
        if (unit.type === "Ally" && unit.status !== "Defeated") {
            const healAmount = Math.round(unit.stats.maxHp * 0.25);
            const oldHp = unit.stats.hp;
            
            // Jangan menyembuhkan jika HP sudah penuh
            if (oldHp >= unit.stats.maxHp) {
                scriptLogger(`SKIP_HEAL: ${unit.name} sudah memiliki HP penuh.`);
                return; // Lanjut ke unit berikutnya dalam loop
            }

            // Terapkan penyembuhan, pastikan tidak melebihi maxHp
            unit.stats.hp = Math.min(unit.stats.maxHp, oldHp + healAmount);
            
            // Hitung jumlah penyembuhan aktual yang diterima
            const actualHealReceived = unit.stats.hp - oldHp; 

            scriptLogger(`HEAL_APPLIED: ${unit.name} disembuhkan sebesar ${actualHealReceived} HP (dari ${oldHp} menjadi ${unit.stats.hp}).`);
            healedUnitsLog.push(`${unit.name} (+${actualHealReceived} HP)`);
        }
    });

    // 3. Update Battle Message dan Detail Aksi Terakhir
    if (healedUnitsLog.length > 0) {
        bState.battleMessage = `${itemName} was used! ${healedUnitsLog.join('. ')}.`;
    } else {
        bState.battleMessage = `${itemName} was used, but all allies' HP were already full.`;
    }

    // Memberi detail pada lastActionDetails agar bisa di-render oleh UI jika perlu
    bState.lastActionDetails = {
        actorId: "SYSTEM_ITEM",
        commandId: "__ITEM_HEAL_ALL__",
        commandName: itemName,
        targets: [], // Targetnya global, jadi bisa dikosongkan
        effectsSummary: healedUnitsLog
    };

    scriptLogger("ITEM_PROC_HEAL_ALL: Proses selesai.");

} catch (e) {
    scriptLogger("ITEM_PROC_HEAL_ALL_ERROR: " + e.message);
    if (!bState) { 
        bState = { 
            battleState: "Error", 
            battleMessage: "Item Script Error: " + e.message 
        }; 
    }
}

// 4. Siapkan Variabel Output untuk Tasker
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;