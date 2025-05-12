document.addEventListener('DOMContentLoaded', () => {
    // --- DATA AWAL (Hardcoded, nantinya dari Tasker) ---
    let battleData = {
        BattleState: "Ongoing", // Ongoing, Win, Lose
        Round: 1,
        Turn: 1,
        Units: [
            {
                id: "riou", // ID unik untuk DOM
                Name: "Riou",
                Type: "Ally",
                Status: "Active", // Active, Idle, Defeated
                TurnOrder: 1, // Akan di-assign ulang saat battle start
                Stats: { Level: 1, HP: 75, ATK: 15, MaxHP: 75 },
                Img: "assets/heroes/Riou.png"
            },
            {
                id: "kyuris",
                Name: "Kyuris",
                Type: "Ally",
                Status: "Idle",
                TurnOrder: 2,
                Stats: { Level: 1, HP: 100, ATK: 12, MaxHP: 100 },
                Img: "assets/heroes/Kyuris.png"
            },
            {
                id: "highland_soldier_a",
                Name: "Highland Soldier A",
                Type: "Enemy",
                Status: "Idle",
                TurnOrder: 3,
                Stats: { Level: 1, HP: 60, ATK: 20, MaxHP: 60 },
                Img: "assets/enemies/Highland_Soldier.png"
            },
            {
                id: "highland_soldier_b",
                Name: "Highland Soldier B",
                Type: "Enemy",
                Status: "Idle",
                TurnOrder: 4,
                Stats: { Level: 1, HP: 60, ATK: 20, MaxHP: 60 },
                Img: "assets/enemies/Highland_Soldier_2.png"
            }
        ],
        currentTurnIndex: 0, // Indeks unit yang aktif di array battleData.Units
        selectedTargetId: null
    };

    // --- ELEMEN DOM ---
    const roundNumberEl = document.getElementById('round-number');
    const turnNumberEl = document.getElementById('turn-number');
    const battleStatusEl = document.getElementById('battle-status');
    const allyAreaEl = document.getElementById('ally-area');
    const enemyAreaEl = document.getElementById('enemy-area');
    const activeUnitNameEl = document.getElementById('active-unit-name');
    const attackButton = document.getElementById('attack-button');
    const selectedTargetNameEl = document.getElementById('selected-target-name');
    const battleLogEl = document.getElementById('battle-log');

    // --- FUNGSI LOGIKA GAME ---

    function addLog(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        battleLogEl.prepend(logEntry); // Pesan baru di atas
    }

    function renderUnits() {
        allyAreaEl.innerHTML = '<h2>Allies</h2>'; // Clear area
        enemyAreaEl.innerHTML = '<h2>Enemies</h2>'; // Clear area

        battleData.Units.forEach(unit => {
            if (unit.Status === "Defeated") return; // Jangan render unit yang kalah

            const unitCard = document.createElement('div');
            unitCard.classList.add('unit-card');
            unitCard.id = `unit-${unit.id}`; // Untuk targeting via DOM
            if (unit.Status === "Active") {
                unitCard.classList.add('active');
            }

            const hpPercentage = (unit.Stats.HP / unit.Stats.MaxHP) * 100;
            const hpBarClass = hpPercentage < 30 ? 'low' : hpPercentage < 60 ? 'medium' : 'high';

            unitCard.innerHTML = `
                <h4>${unit.Name} (${unit.Type})</h4>
                <div class="unit-stats">
                    HP: ${unit.Stats.HP} / ${unit.Stats.MaxHP} | ATK: ${unit.Stats.ATK}
                </div>
                <div class="hp-bar-container">
                    <div class="hp-bar ${hpBarClass}" style="width: ${hpPercentage}%;"></div>
                </div>
            `;

            if (unit.Type === "Ally") {
                allyAreaEl.appendChild(unitCard);
            } else {
                enemyAreaEl.appendChild(unitCard);
                // Jika unit aktif adalah Ally, buat Enemy targetable
                const activeUnit = battleData.Units[battleData.currentTurnIndex];
                if (activeUnit.Type === "Ally") {
                    unitCard.classList.add('targetable');
                    unitCard.addEventListener('click', () => selectTarget(unit));
                }
            }
            // Highlight jika unit ini adalah target yang dipilih
            if (battleData.selectedTargetId === unit.id) {
                unitCard.classList.add('selected-target');
            }
        });
        updateBattleInfo();
    }

    function updateBattleInfo() {
        roundNumberEl.textContent = battleData.Round;
        turnNumberEl.textContent = battleData.Turn;
        battleStatusEl.textContent = battleData.BattleState;

        if (battleData.BattleState !== "Ongoing") {
            activeUnitNameEl.textContent = "Battle Over";
            attackButton.disabled = true;
            return;
        }

        const activeUnit = battleData.Units[battleData.currentTurnIndex];
        activeUnitNameEl.textContent = `Active: ${activeUnit.Name}`;

        if (activeUnit.Type === "Ally") {
            attackButton.disabled = battleData.selectedTargetId === null;
        } else {
            attackButton.disabled = true; // Musuh menyerang otomatis
        }
    }

    function selectTarget(targetUnit) {
        const activeUnit = battleData.Units[battleData.currentTurnIndex];
        if (activeUnit.Type !== "Ally" || targetUnit.Type !== "Enemy" || targetUnit.Status === "Defeated") {
            return;
        }

        // Hapus highlight dari target sebelumnya jika ada
        if (battleData.selectedTargetId) {
            const prevTargetEl = document.getElementById(`unit-${battleData.selectedTargetId}`);
            if (prevTargetEl) prevTargetEl.classList.remove('selected-target');
        }
        
        battleData.selectedTargetId = targetUnit.id;
        selectedTargetNameEl.textContent = targetUnit.Name;
        
        // Highlight target baru
        const currentTargetEl = document.getElementById(`unit-${targetUnit.id}`);
        if (currentTargetEl) currentTargetEl.classList.add('selected-target');
        
        renderUnits(); // Re-render untuk update highlight dan status tombol
    }
    
    function deselectTarget() {
        if (battleData.selectedTargetId) {
            const prevTargetEl = document.getElementById(`unit-${battleData.selectedTargetId}`);
            if (prevTargetEl) prevTargetEl.classList.remove('selected-target');
        }
        battleData.selectedTargetId = null;
        selectedTargetNameEl.textContent = "-";
        renderUnits();
    }


    function basicAttack() {
        if (battleData.BattleState !== "Ongoing") return;
        const attacker = battleData.Units[battleData.currentTurnIndex];
        
        if (attacker.Type !== "Ally" || !battleData.selectedTargetId) {
            addLog("Cannot attack: Not Ally's turn or no target selected.");
            return;
        }

        const targetIndex = battleData.Units.findIndex(u => u.id === battleData.selectedTargetId);
        if (targetIndex === -1) {
            addLog("Error: Selected target not found.");
            deselectTarget();
            return;
        }
        const defender = battleData.Units[targetIndex];

        if (defender.Status === "Defeated") {
            addLog(`${defender.Name} is already defeated.`);
            deselectTarget();
            return;
        }

        const damage = attacker.Stats.ATK; // Simple ATK = Damage
        defender.Stats.HP -= damage;
        addLog(`${attacker.Name} attacks ${defender.Name} for ${damage} damage.`);

        if (defender.Stats.HP <= 0) {
            defender.Stats.HP = 0;
            defender.Status = "Defeated";
            addLog(`${defender.Name} has been defeated!`);
        }
        
        deselectTarget(); // Deselect target setelah menyerang
        checkWinLoseCondition();
        if (battleData.BattleState === "Ongoing") {
            nextTurn();
        } else {
            renderUnits(); // Update tampilan terakhir sebelum battle over
        }
    }

    function enemyTurn() {
        if (battleData.BattleState !== "Ongoing") return;
        const attacker = battleData.Units[battleData.currentTurnIndex];
        if (attacker.Type !== "Enemy" || attacker.Status === "Defeated") {
            nextTurn(); // Lewati jika musuh sudah kalah atau bukan giliran musuh
            return;
        }

        // AI Musuh Sederhana: Serang Ally yang masih hidup secara acak
        const aliveAllies = battleData.Units.filter(u => u.Type === "Ally" && u.Status !== "Defeated");
        if (aliveAllies.length > 0) {
            const randomTargetIndex = Math.floor(Math.random() * aliveAllies.length);
            const defender = aliveAllies[randomTargetIndex];
            
            const damage = attacker.Stats.ATK;
            defender.Stats.HP -= damage;
            addLog(`Enemy ${attacker.Name} attacks ${defender.Name} for ${damage} damage.`);

            if (defender.Stats.HP <= 0) {
                defender.Stats.HP = 0;
                defender.Status = "Defeated";
                addLog(`${defender.Name} has been defeated!`);
            }
        } else {
            addLog(`Enemy ${attacker.Name} has no targets.`); // Seharusnya tidak terjadi jika ada pengecekan menang/kalah
        }

        checkWinLoseCondition();
        if (battleData.BattleState === "Ongoing") {
            nextTurn();
        } else {
            renderUnits(); // Update tampilan terakhir sebelum battle over
        }
    }

    function checkWinLoseCondition() {
        const aliveAllies = battleData.Units.filter(u => u.Type === "Ally" && u.Status !== "Defeated").length;
        const aliveEnemies = battleData.Units.filter(u => u.Type === "Enemy" && u.Status !== "Defeated").length;

        if (aliveEnemies === 0 && aliveAllies > 0) {
            battleData.BattleState = "Win";
            addLog("All enemies defeated! You Win!");
        } else if (aliveAllies === 0) {
            battleData.BattleState = "Lose";
            addLog("All allies defeated! You Lose!");
        }
        // Jika kedua kondisi tidak terpenuhi, BattleState tetap "Ongoing"
    }
    
    function sortUnitsForTurn() {
        // Untuk versi sederhana, kita asumsikan urutan di array adalah urutan giliran.
        // Nantinya bisa diimplementasikan TurnOrder yang lebih kompleks atau shuffle.
        // Untuk saat ini, pastikan unit "Active" ada di currentTurnIndex.
        // Jika semua sudah "Idle" (awal ronde baru), set unit pertama yang hidup sebagai "Active".
    }

    function nextTurn() {
        if (battleData.BattleState !== "Ongoing") return;

        // Tandai unit saat ini sudah selesai (jika masih hidup)
        const currentUnit = battleData.Units[battleData.currentTurnIndex];
        if (currentUnit.Status === "Active") {
            // currentUnit.Status = "Idle"; // Untuk sementara tidak diubah agar 'active' tetap
        }
        
        let nextActiveFound = false;
        let attempts = 0; // Untuk mencegah infinite loop jika semua unit defeated tapi battle state belum update
        
        do {
            battleData.currentTurnIndex = (battleData.currentTurnIndex + 1) % battleData.Units.length;
            const nextUnit = battleData.Units[battleData.currentTurnIndex];
            
            if (nextUnit.Status !== "Defeated") {
                nextActiveFound = true;
                // Hapus status 'active' dari semua unit lain dulu (jika ada)
                battleData.Units.forEach(u => { 
                    if (u.Status === "Active" && u.id !== nextUnit.id) u.Status = "Idle"; 
                });
                nextUnit.Status = "Active";
                battleData.Turn++;

                // Cek apakah satu ronde sudah selesai
                if (battleData.currentTurnIndex === 0) { // Atau logika lain untuk deteksi akhir ronde
                    battleData.Round++;
                    battleData.Turn = 1; // Reset turn untuk ronde baru
                    addLog(`--- Round ${battleData.Round} Begins ---`);
                }

            }
            attempts++;
        } while (!nextActiveFound && attempts < battleData.Units.length * 2); // Batasi loop

        if (!nextActiveFound) { // Jika tidak ada unit aktif ditemukan (semua defeated?)
            checkWinLoseCondition(); // Periksa ulang kondisi menang/kalah
        }

        deselectTarget(); // Hapus target terpilih di giliran baru
        renderUnits();

        // Jika giliran musuh, panggil aksi musuh setelah delay singkat
        const newActiveUnit = battleData.Units[battleData.currentTurnIndex];
        if (newActiveUnit.Type === "Enemy" && battleData.BattleState === "Ongoing" && newActiveUnit.Status !== "Defeated") {
            setTimeout(enemyTurn, 1000); // Delay 1 detik untuk aksi musuh
        }
    }
    
    function initializeBattle() {
        // Sortir unit berdasarkan TurnOrder awal (jika ada, untuk saat ini kita pakai urutan array)
        // Atau bisa juga di-shuffle di sini untuk ronde pertama
        battleData.Units.sort((a, b) => a.TurnOrder - b.TurnOrder);
        
        // Set unit pertama yang aktif
        battleData.currentTurnIndex = 0;
        battleData.Units.forEach((unit, index) => {
            unit.Status = (index === 0) ? "Active" : (unit.Status === "Defeated" ? "Defeated" : "Idle");
        });

        addLog("Battle Started!");
        renderUnits();

        // Jika unit pertama adalah musuh, langsung mulai gilirannya
        const firstUnit = battleData.Units[battleData.currentTurnIndex];
        if (firstUnit.Type === "Enemy" && firstUnit.Status !== "Defeated") {
            setTimeout(enemyTurn, 1000);
        }
    }

    // --- EVENT LISTENERS ---
    attackButton.addEventListener('click', basicAttack);

    // --- INISIALISASI GAME ---
    initializeBattle();
});