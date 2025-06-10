// --- script_tasker/action_processor.js v1 (Tasker) ---
// Skrip utama untuk memproses aksi pemain (Basic Attack atau Skill).
// Mengkalkulasi damage, heal, shield, status, dan memperbarui battle_state.

// Variabel global untuk logging dalam Tasker
let taskerLogOutput = "";

/**
 * Fungsi logger internal untuk Tasker.
 * @param {string} message - Pesan log.
 */
function scriptLogger(message) {
    taskerLogOutput += message + "\\n"; // Karakter newline untuk Tasker
}

/**
 * Fungsi utama yang akan dipanggil oleh Tasker.
 * @param {string} currentBattleStateJson - String JSON dari battle_state saat ini.
 * @param {string} actorId - ID unit yang melakukan aksi.
 * @param {string} actionIdentifier - ID command (untuk skill) atau identifier khusus (misal, "__BASIC_ATTACK__").
 * @param {string} targetIdsJson - String JSON array berisi ID target yang terpengaruh.
 * @returns {string} String JSON dari battle_state yang sudah diperbarui.
 */
function processPlayerAction(currentBattleStateJson, actorId, actionIdentifier, targetIdsJson) {
    taskerLogOutput = ""; // Reset log untuk setiap pemanggilan
    scriptLogger("ACTION_PROCESSOR_INFO: Script processPlayerAction dimulai.");
    scriptLogger(`ACTION_PROCESSOR_INFO: Inputs - actorId: ${actorId}, actionIdentifier: ${actionIdentifier}, targetIdsJson: ${targetIdsJson}`);

    let bState; // Objek battle_state

    // --- 1. Parsing dan Validasi Input ---
    try {
        if (typeof currentBattleStateJson !== 'string' || currentBattleStateJson.trim() === "") {
            throw new Error("Input 'currentBattleStateJson' kosong atau bukan string.");
        }
        bState = JSON.parse(currentBattleStateJson);
        scriptLogger("ACTION_PROCESSOR_INFO: Berhasil parse battle_state JSON.");

        if (typeof actorId !== 'string' || actorId.trim() === "") {
            throw new Error("Input 'actorId' kosong atau bukan string.");
        }
        if (typeof actionIdentifier !== 'string' || actionIdentifier.trim() === "") {
            throw new Error("Input 'actionIdentifier' kosong atau bukan string.");
        }

        let parsedTargetIds = [];
        if (typeof targetIdsJson === 'string' && targetIdsJson.trim() !== "") {
            parsedTargetIds = JSON.parse(targetIdsJson);
            if (!Array.isArray(parsedTargetIds)) {
                throw new Error("'targetIdsJson' bukan string JSON array yang valid.");
            }
        } else if (actionIdentifier !== "ky_skill_system_reboot") { // Revive mungkin tidak punya target awal jika UI belum memilih
            // Beberapa skill (seperti self-buff atau AoE caster-centric tanpa target awal) mungkin tidak mengirim targetIdsJson
            // Jika actionIdentifier bukan skill yang jelas tidak butuh target, maka targetIdsJson wajib ada.
            const actorUnitForCheck = getUnitById(actorId, bState.units);
            const commandForCheck = actorUnitForCheck ? getCommandById(actorUnitForCheck, actionIdentifier) : null;
            if (commandForCheck && commandForCheck.targetingParams && commandForCheck.targetingParams.selection.pattern.shape !== "Self" && commandForCheck.targetingParams.area.origin !== "Caster" && parsedTargetIds.length === 0) {
                 //throw new Error("Input 'targetIdsJson' kosong untuk aksi yang membutuhkan target.");
                 scriptLogger("ACTION_PROCESSOR_WARN: Input 'targetIdsJson' kosong, namun aksi mungkin tidak memerlukan target awal (misal Self/Caster AoE).");
            } else if (!commandForCheck && actionIdentifier !== "__BASIC_ATTACK__") {
                 throw new Error("Input 'targetIdsJson' kosong dan actionIdentifier bukan basic attack atau skill yang diketahui.");
            }
        }
        bState.currentTargetIds = parsedTargetIds; // Simpan untuk referensi mudah di helper

    } catch (e) {
        scriptLogger("ACTION_PROCESSOR_ERROR: Gagal parsing input atau validasi awal: " + e.message);
        // Mengembalikan state error jika parsing gagal total
        const errorState = {
            battleState: "Error",
            battleMessage: "Action Processor: Input Error. " + e.message.substring(0, 50),
            _scriptErrorLog: taskerLogOutput,
            _originalInput: { currentBattleStateJson, actorId, actionIdentifier, targetIdsJson }
        };
        return JSON.stringify(errorState);
    }

    // --- 2. Dapatkan Aktor dan Command Object (jika skill) ---
    const actor = getUnitById(actorId, bState.units);
    if (!actor) {
        scriptLogger(`ACTION_PROCESSOR_ERROR: Aktor dengan ID ${actorId} tidak ditemukan.`);
        bState.battleState = "Error";
        bState.battleMessage = `Error: Aktor ${actorId} tidak ditemukan.`;
        return JSON.stringify(bState);
    }
    if (actor.status === "Defeated") {
        scriptLogger(`ACTION_PROCESSOR_WARN: Aktor ${actor.name} sudah kalah. Aksi dibatalkan.`);
        bState.battleMessage = `${actor.name} sudah kalah dan tidak bisa beraksi.`;
        // Tidak perlu return error state, cukup batalkan aksi dan biarkan turn manager lanjut.
        // Pastikan turn manager akan skip giliran unit yang defeated.
        return JSON.stringify(bState);
    }

    let commandObject = null;
    let actionName = "Unknown Action";
    let isBasicAttack = (actionIdentifier === "__BASIC_ATTACK__");

    if (isBasicAttack) {
        actionName = "Basic Attack";
        scriptLogger(`ACTION_PROCESSOR_INFO: Memproses Basic Attack oleh ${actor.name}.`);
    } else {
        commandObject = getCommandById(actor, actionIdentifier);
        if (!commandObject) {
            scriptLogger(`ACTION_PROCESSOR_ERROR: Command ${actionIdentifier} tidak ditemukan pada aktor ${actor.name}.`);
            bState.battleState = "Error";
            bState.battleMessage = `Error: Skill ${actionIdentifier} tidak ada.`;
            return JSON.stringify(bState);
        }
        actionName = commandObject.name;
        scriptLogger(`ACTION_PROCESSOR_INFO: Memproses Skill '${actionName}' oleh ${actor.name}.`);

        // Kurangi SP untuk skill
        if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
            if (bState.teamSP >= commandObject.spCost) {
                bState.teamSP -= commandObject.spCost;
                scriptLogger(`ACTION_PROCESSOR_INFO: SP dikurangi ${commandObject.spCost}. SP Tim sekarang: ${bState.teamSP}/${bState.maxTeamSP}.`);
            } else {
                scriptLogger(`ACTION_PROCESSOR_ERROR: SP Tim tidak cukup untuk skill ${actionName}. Dibutuhkan ${commandObject.spCost}, tersedia ${bState.teamSP}.`);
                bState.battleMessage = `SP tidak cukup untuk ${actionName}!`;
                // Aksi gagal karena SP tidak cukup.
                return JSON.stringify(bState);
            }
        }
    }

    // --- 3. Proses Efek ---
    let targetsHitSummary = [];
    let spGainedThisTurn = 0; // Untuk log SP gain dari basic attack
    let actorActsAgain = false;

    if (isBasicAttack) {
        // Logika untuk Basic Attack
        bState.currentTargetIds.forEach(targetId => {
            const target = getUnitById(targetId, bState.units);
            if (target && target.status !== "Defeated") {
                const damage = calculateDamage(actor.stats, target.stats, 1.0, 0); // Basic attack multiplier 1.0, no ignore defense
                const damageResult = applyDamage(target, damage, bState);
                targetsHitSummary.push(`${target.name} (-${damageResult.effectiveDamage} HP${damageResult.shieldDamage > 0 ? ', -' + damageResult.shieldDamage + ' Shield' : ''})`);
                if (target.stats.hp === 0) {
                    scriptLogger(`ACTION_PROCESSOR_INFO: ${target.name} dikalahkan oleh Basic Attack.`);
                }
            }
        });
        spGainedThisTurn = generateSPForBasicAttack(bState);
    } else if (commandObject && commandObject.effects && Array.isArray(commandObject.effects)) {
        // Logika untuk Skill berdasarkan array 'effects'
        commandObject.effects.forEach(effect => {
            // Target untuk efek ini bisa bervariasi: "selected", "caster", "area", "caster_adjacent_enemies", dll.
            // Untuk saat ini, kita asumsikan efek diterapkan pada 'bState.currentTargetIds' atau 'actor'
            // Implementasi yang lebih canggih akan memetakan 'effect.target' ke unit yang sesuai.

            let affectedUnitsForEffect = [];
            if (effect.target === "caster") {
                affectedUnitsForEffect.push(actor);
            } else if (effect.target === "selected" || effect.target === "area" || effect.target === "selected_and_line") { // "area" dan "selected_and_line" akan menggunakan currentTargetIds
                bState.currentTargetIds.forEach(tid => {
                    const unit = getUnitById(tid, bState.units);
                    if (unit) affectedUnitsForEffect.push(unit);
                });
            } else if (effect.target === "caster_adjacent_enemies") {
                // Cari musuh di sebelah caster (perlu info pseudoPos dan tipe unit)
                // Ini contoh, logika targeting yang lebih detail mungkin diperlukan di sini atau di helper
                const adjEnemies = getAdjacentEnemies(actor, bState.units);
                affectedUnitsForEffect.push(...adjEnemies);
            }
            // Tambahkan case lain untuk effect.target jika diperlukan

            affectedUnitsForEffect.forEach(targetUnit => {
                if (!targetUnit || targetUnit.status === "Defeated" && effect.type !== "revive") return;

                switch (effect.type) {
                    case "damage":
                    case "damage_aoe_adjacent": // Anggap saja damage biasa untuk sekarang
                        const damage = calculateDamage(actor.stats, targetUnit.stats, effect.multiplier || 1.0, effect.ignoreDefense || 0);
                        const damageResult = applyDamage(targetUnit, damage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${damageResult.effectiveDamage} HP${damageResult.shieldDamage > 0 ? ', -' + damageResult.shieldDamage + ' Shield' : ''})`);
                        if (targetUnit.stats.hp === 0) {
                            scriptLogger(`ACTION_PROCESSOR_INFO: ${targetUnit.name} dikalahkan oleh skill ${actionName}.`);
                        }
                        // Cek kondisi "target_defeated" untuk "act_again"
                        if (effect.condition === "target_defeated" && targetUnit.stats.hp === 0 && effect.action === "act_again") {
                            actorActsAgain = true; // Flag untuk ditangani nanti
                        }
                        break;
                    case "damage_line_pierce": // Perlu logika khusus
                        // Misal: damage utama ke target, damage lebih kecil ke unit di belakangnya
                        // Ini memerlukan pemahaman posisi yang lebih dalam atau asumsi dari currentTargetIds
                        // Untuk versi awal, kita bisa sederhanakan: semua di currentTargetIds kena multiplier utama
                        const pierceDamage = calculateDamage(actor.stats, targetUnit.stats, effect.mainMultiplier || 1.0, 0);
                        const pierceDamageResult = applyDamage(targetUnit, pierceDamage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${pierceDamageResult.effectiveDamage} HP${pierceDamageResult.shieldDamage > 0 ? ', -' + pierceDamageResult.shieldDamage + ' Shield' : ''})`);
                        // Logika untuk pierceMultiplier ke target lain perlu ditambahkan jika currentTargetIds sudah benar dari client
                        break;
                    case "heal":
                        const healAmount = calculateHeal(actor.stats, effect.multiplier || 1.0, effect.basedOn === "caster_atk" ? actor.stats.atk : targetUnit.stats.maxHp); // Contoh basedOn
                        applyHeal(targetUnit, healAmount);
                        targetsHitSummary.push(`${targetUnit.name} (+${healAmount} HP)`);
                        break;
                    case "shield":
                        const shieldValue = calculateShield(actor.stats, effect.multiplier || 1.0, effect.basedOn === "caster_atk" ? actor.stats.atk : 0); // Contoh basedOn
                        applyShield(targetUnit, shieldValue);
                        targetsHitSummary.push(`${targetUnit.name} (+${shieldValue} Shield)`);
                        break;
                    case "status":
                        if (applyStatus(targetUnit, effect.statusName, effect.chance || 1.0, effect.duration || 1, bState)) {
                            targetsHitSummary.push(`${targetUnit.name} (${effect.statusName})`);
                        }
                        break;
                    case "revive":
                        // Asumsi targetUnit adalah unit yang mau di-revive (sudah dipilih dari AnyDefeatedAlly)
                        if (targetUnit.status === "Defeated") {
                            applyRevive(targetUnit, effect.hpPercentage || 0.3);
                            targetsHitSummary.push(`${targetUnit.name} (Revived)`);
                        }
                        break;
                    case "conditional": // Seperti "act_again"
                        if (effect.condition === "target_defeated" && effect.action === "act_again") {
                            // Kondisi target_defeated sudah dicek di case "damage"
                            // Jika flag actorActsAgain true, akan ditangani setelah loop efek
                        }
                        break;
                    default:
                        scriptLogger(`ACTION_PROCESSOR_WARN: Tipe efek tidak dikenal: ${effect.type}`);
                }
            });
        });
    }

    // --- 4. Update Battle Message dan Last Action Details ---
    let finalActionSummary = `${actor.name} menggunakan ${actionName}!`;
    if (isBasicAttack && spGainedThisTurn > 0) {
        finalActionSummary += ` Mendapatkan ${spGainedThisTurn} SP.`;
    }
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} Target: ${targetsHitSummary.join(', ')}.`;
    } else {
        bState.battleMessage = `${finalActionSummary} ...tapi tidak mengenai siapa pun atau tidak ada efek.`;
    }

    bState.lastActionDetails = {
        actorId: actorId,
        commandId: actionIdentifier, // Bisa ID skill atau "__BASIC_ATTACK__"
        commandName: actionName,
        targets: bState.currentTargetIds, // Target awal yang dipilih
        effectsSummary: targetsHitSummary // Ringkasan apa yang terjadi pada target
    };

    // --- 5. Handle "Act Again" ---
    if (actorActsAgain) {
        scriptLogger(`ACTION_PROCESSOR_INFO: ${actor.name} mendapatkan giliran tambahan!`);
        // Implementasi "act again" di Tasker bisa kompleks.
        // Cara sederhana: set status aktor kembali ke "Active" atau "Idle" (jika turn manager mengharapkan Idle)
        // dan jangan panggil turn_manager.js setelah skrip ini.
        // Atau, set flag khusus di bState yang akan dibaca oleh turn_manager.
        bState._actorShouldActAgain = actorId; // Flag untuk turn_manager
    }


    // --- 6. Kembalikan battle_state yang sudah diupdate ---
    scriptLogger("ACTION_PROCESSOR_INFO: Pemrosesan aksi selesai.");
    return JSON.stringify(bState);

} // Akhir fungsi processPlayerAction

// --- Helper Functions ---

/**
 * Mendapatkan objek unit berdasarkan ID.
 * @param {string} unitId - ID unit yang dicari.
 * @param {Array<object>} unitsArray - Array semua unit.
 * @returns {object|null} Objek unit atau null.
 */
function getUnitById(unitId, unitsArray) {
    if (!unitId || !unitsArray || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

/**
 * Mendapatkan objek command berdasarkan ID dari sebuah unit.
 * @param {object} unit - Objek unit.
 * @param {string} commandId - ID command yang dicari.
 * @returns {object|null} Objek command atau null.
 */
function getCommandById(unit, commandId) {
    if (!unit || !unit.commands || !Array.isArray(unit.commands)) return null;
    return unit.commands.find(cmd => cmd.commandId === commandId);
}

/**
 * Menghitung damage dasar.
 * @param {object} attackerStats - Stats penyerang.
 * @param {object} targetStats - Stats target.
 * @param {number} effectMultiplier - Pengali damage dari efek/skill.
 * @param {number} ignoreDefensePercentage - Persentase defense yang diabaikan (0.0 - 1.0).
 * @returns {number} Jumlah damage.
 */
function calculateDamage(attackerStats, targetStats, effectMultiplier, ignoreDefensePercentage) {
    let damage = attackerStats.atk * (effectMultiplier || 1.0);
    // Saat ini, defense belum diimplementasikan dalam kalkulasi
    // if (targetStats.def) {
    //     const effectiveDef = targetStats.def * (1 - (ignoreDefensePercentage || 0));
    //     damage = Math.max(1, damage - effectiveDef); // Minimal 1 damage
    // }
    scriptLogger(`CALC_DMG_DETAIL: ATK(${attackerStats.atk}) * Multiplier(${effectMultiplier || 1.0}) = ${damage.toFixed(0)}`);
    return Math.round(damage);
}

/**
 * Menerapkan damage ke target, mengurangi shield terlebih dahulu.
 * @param {object} targetUnit - Objek unit target.
 * @param {number} damageAmount - Jumlah damage yang akan diterapkan.
 * @param {object} bStateRef - Referensi ke bState untuk logging jika perlu.
 * @returns {{effectiveDamage: number, shieldDamage: number, hpDamage: number}}
 */
function applyDamage(targetUnit, damageAmount, bStateRef) {
    let remainingDamage = damageAmount;
    let shieldDamageDealt = 0;
    let hpDamageDealt = 0;

    if (targetUnit.stats.shieldHP && targetUnit.stats.shieldHP > 0) {
        if (remainingDamage >= targetUnit.stats.shieldHP) {
            shieldDamageDealt = targetUnit.stats.shieldHP;
            remainingDamage -= targetUnit.stats.shieldHP;
            targetUnit.stats.shieldHP = 0;
        } else {
            shieldDamageDealt = remainingDamage;
            targetUnit.stats.shieldHP -= remainingDamage;
            remainingDamage = 0;
        }
        scriptLogger(`APPLY_DMG_DETAIL: ${targetUnit.name} shield: ${targetUnit.stats.shieldHP + shieldDamageDealt} -> ${targetUnit.stats.shieldHP}. Damage to shield: ${shieldDamageDealt}`);
    }

    if (remainingDamage > 0) {
        hpDamageDealt = Math.min(targetUnit.stats.hp, remainingDamage); // Damage tidak bisa lebih besar dari HP tersisa
        targetUnit.stats.hp -= hpDamageDealt;
        if (targetUnit.stats.hp < 0) targetUnit.stats.hp = 0;
        scriptLogger(`APPLY_DMG_DETAIL: ${targetUnit.name} HP: ${targetUnit.stats.hp + hpDamageDealt} -> ${targetUnit.stats.hp}. Damage to HP: ${hpDamageDealt}`);
    }

    if (targetUnit.stats.hp === 0) {
        targetUnit.status = "Defeated";
        // Log kekalahan bisa ditambahkan di sini atau di pemanggil
    }
    return {
        effectiveDamage: shieldDamageDealt + hpDamageDealt,
        shieldDamage: shieldDamageDealt,
        hpDamage: hpDamageDealt
    };
}

/**
 * Menghitung jumlah heal.
 * @param {object} casterStats - Stats caster (jika heal berbasis stats caster).
 * @param {number} healMultiplier - Pengali heal.
 * @param {number} basedOnStatValue - Nilai stat yang menjadi dasar heal (misal, caster.atk atau target.maxHp).
 * @returns {number} Jumlah heal.
 */
function calculateHeal(casterStats, healMultiplier, basedOnStatValue) {
    const heal = basedOnStatValue * (healMultiplier || 1.0);
    scriptLogger(`CALC_HEAL_DETAIL: Base(${basedOnStatValue}) * Multiplier(${healMultiplier || 1.0}) = ${heal.toFixed(0)}`);
    return Math.round(heal);
}

/**
 * Menerapkan heal ke target.
 * @param {object} targetUnit - Objek unit target.
 * @param {number} healAmount - Jumlah heal.
 */
function applyHeal(targetUnit, healAmount) {
    if (targetUnit.status === "Defeated") {
        scriptLogger(`APPLY_HEAL_WARN: Tidak bisa heal unit ${targetUnit.name} karena sudah kalah.`);
        return;
    }
    const oldHp = targetUnit.stats.hp;
    targetUnit.stats.hp = Math.min(targetUnit.stats.hp + healAmount, targetUnit.stats.maxHp);
    scriptLogger(`APPLY_HEAL_DETAIL: ${targetUnit.name} HP: ${oldHp} -> ${targetUnit.stats.hp}. Healed for ${targetUnit.stats.hp - oldHp}`);
}

/**
 * Menghitung jumlah shield.
 * @param {object} casterStats - Stats caster.
 * @param {number} shieldMultiplier - Pengali shield.
 * @param {number} basedOnStatValue - Nilai stat yang menjadi dasar shield.
 * @returns {number} Jumlah shield.
 */
function calculateShield(casterStats, shieldMultiplier, basedOnStatValue) {
    const shield = basedOnStatValue * (shieldMultiplier || 1.0);
    scriptLogger(`CALC_SHIELD_DETAIL: Base(${basedOnStatValue}) * Multiplier(${shieldMultiplier || 1.0}) = ${shield.toFixed(0)}`);
    return Math.round(shield);
}

/**
 * Menerapkan shield ke target. Shield tidak boleh melebihi MaxHP target.
 * @param {object} targetUnit - Objek unit target.
 * @param {number} shieldAmount - Jumlah shield.
 */
function applyShield(targetUnit, shieldAmount) {
    if (targetUnit.status === "Defeated") {
        scriptLogger(`APPLY_SHIELD_WARN: Tidak bisa memberi shield pada unit ${targetUnit.name} karena sudah kalah.`);
        return;
    }
    const oldShield = targetUnit.stats.shieldHP || 0;
    // Batasan shield tidak boleh melebihi MaxHP unit.
    // Jika shield yang ada + shield baru > maxHP, set shield ke maxHP.
    // Namun, biasanya shield adalah HP tambahan, jadi batasan ini mungkin tidak selalu berlaku
    // tergantung desain. Untuk sekarang, kita tambahkan saja.
    // Logika yang lebih umum adalah shield bisa menumpuk hingga batas tertentu atau tidak ada batas.
    // Untuk "tidak melebihi maxHP" berarti nilai shieldHP itu sendiri tidak boleh > maxHP.
    let newShieldTotal = oldShield + shieldAmount;
    // if (newShieldTotal > targetUnit.stats.maxHp) {
    //     newShieldTotal = targetUnit.stats.maxHp;
    //     scriptLogger(`APPLY_SHIELD_INFO: Shield untuk ${targetUnit.name} dibatasi hingga MaxHP (${targetUnit.stats.maxHp}).`);
    // }
    // Untuk sekarang, kita biarkan shield menumpuk tanpa batas MaxHP, karena itu lebih umum untuk shield.
    // Jika ada batasan spesifik, itu harus dari desain game.
    targetUnit.stats.shieldHP = newShieldTotal;
    scriptLogger(`APPLY_SHIELD_DETAIL: ${targetUnit.name} Shield: ${oldShield} -> ${targetUnit.stats.shieldHP}. Gained ${shieldAmount}`);
}

/**
 * Menerapkan status efek ke target.
 * @param {object} targetUnit - Objek unit target.
 * @param {string} statusName - Nama status (misal, "Stun").
 * @param {number} chance - Peluang penerapan (0.0 - 1.0).
 * @param {number} duration - Durasi status dalam giliran.
 * @param {object} bStateRef - Referensi ke bState untuk menambah status.
 * @returns {boolean} True jika status berhasil diterapkan.
 */
function applyStatus(targetUnit, statusName, chance, duration, bStateRef) {
    if (targetUnit.status === "Defeated") return false;

    if (Math.random() < chance) {
        if (!targetUnit.statusEffects) {
            targetUnit.statusEffects = { buffs: [], debuffs: [], conditions: [] };
        }
        // Cek apakah status sudah ada dan bisa ditumpuk atau diperbarui durasinya
        // Untuk sekarang, kita tambahkan saja (bisa menyebabkan duplikasi jika tidak ditangani)
        // Implementasi yang lebih baik akan memeriksa apakah status sudah ada.
        let statusArray;
        // Asumsi sederhana: Stun adalah debuff. Perlu pemetaan tipe status yang lebih baik.
        if (statusName.toLowerCase().includes("stun") || statusName.toLowerCase().includes("down")) {
            statusArray = targetUnit.statusEffects.debuffs;
        } else if (statusName.toLowerCase().includes("up") || statusName.toLowerCase().includes("shield")) { // Shield bisa juga jadi buff
             statusArray = targetUnit.statusEffects.buffs;
        } else {
            statusArray = targetUnit.statusEffects.conditions; // Default
        }

        // Cek apakah status sudah ada, jika iya, perbarui durasi (ambil yang terpanjang)
        const existingStatus = statusArray.find(s => s.name === statusName);
        if (existingStatus) {
            existingStatus.duration = Math.max(existingStatus.duration, duration);
            scriptLogger(`APPLY_STATUS_DETAIL: Status ${statusName} pada ${targetUnit.name} diperbarui durasinya menjadi ${existingStatus.duration}.`);
        } else {
            statusArray.push({
                effectId: `${statusName}_${new Date().getTime()}`, // ID unik sederhana
                name: statusName,
                displayName: statusName, // Bisa dibuat lebih user-friendly
                type: "Debuff", // Perlu ditentukan berdasarkan statusName
                duration: duration,
                sourceUnitId: bStateRef.activeUnitID, // ID unit yang menerapkan status
                // params: {} // Parameter tambahan jika ada (misal, % stat reduction)
            });
            scriptLogger(`APPLY_STATUS_DETAIL: Status ${statusName} diterapkan pada ${targetUnit.name} selama ${duration} giliran.`);
        }
        // Jika status adalah Stun, unit tidak bisa beraksi. Ini akan dicek oleh turn_manager.
        return true;
    }
    scriptLogger(`APPLY_STATUS_DETAIL: Gagal menerapkan status ${statusName} pada ${targetUnit.name} (chance: ${chance * 100}%).`);
    return false;
}

/**
 * Menghidupkan kembali unit yang kalah.
 * @param {object} targetUnit - Objek unit yang akan dihidupkan.
 * @param {number} hpPercentage - Persentase MaxHP saat hidup kembali.
 */
function applyRevive(targetUnit, hpPercentage) {
    if (targetUnit.status === "Defeated") {
        targetUnit.status = "Idle"; // Atau "Active" jika langsung dapat giliran? Untuk sekarang "Idle".
        targetUnit.stats.hp = Math.round(targetUnit.stats.maxHp * hpPercentage);
        if (targetUnit.stats.hp <= 0) targetUnit.stats.hp = 1; // Minimal 1 HP saat revive
        targetUnit.stats.shieldHP = 0; // Reset shield saat revive
        // Reset status effects? Tergantung desain.
        if (targetUnit.statusEffects) {
            targetUnit.statusEffects.buffs = [];
            targetUnit.statusEffects.debuffs = [];
            targetUnit.statusEffects.conditions = [];
        }
        scriptLogger(`APPLY_REVIVE_DETAIL: ${targetUnit.name} dihidupkan kembali dengan ${targetUnit.stats.hp} HP.`);
    } else {
        scriptLogger(`APPLY_REVIVE_WARN: ${targetUnit.name} tidak sedang kalah, tidak bisa dihidupkan.`);
    }
}

/**
 * Menghasilkan SP untuk Basic Attack pemain.
 * @param {object} bState - Objek battle_state.
 * @returns {number} Jumlah SP yang dihasilkan.
 */
function generateSPForBasicAttack(bState) {
    let spGain = 0;
    const rand = Math.random();
    if (rand < 0.02) spGain = 5;        // 2% untuk 5 SP (Jackpot!)
    else if (rand < 0.10) spGain = 4;   // 8% untuk 4 SP (0.02 + 0.08)
    else if (rand < 0.27) spGain = 3;   // 17% untuk 3 SP (0.10 + 0.17)
    else if (rand < 0.55) spGain = 2;   // 28% untuk 2 SP (0.27 + 0.28)
    else spGain = 1;                    // 45% untuk 1 SP (sisanya)

    if (typeof bState.teamSP === 'number' && typeof bState.maxTeamSP === 'number') {
        bState.teamSP = Math.min(bState.teamSP + spGain, bState.maxTeamSP);
        scriptLogger(`GENERATE_SP_DETAIL: Basic Attack menghasilkan ${spGain} SP. SP Tim: ${bState.teamSP}/${bState.maxTeamSP}`);
    } else {
        scriptLogger("GENERATE_SP_WARN: teamSP atau maxTeamSP tidak terdefinisi. Tidak bisa generate SP.");
        return 0;
    }
    return spGain;
}

/**
 * Mendapatkan musuh yang bersebelahan dengan caster.
 * Implementasi sederhana, bisa dikembangkan.
 * @param {object} caster - Objek unit caster.
 * @param {Array<object>} allUnits - Array semua unit.
 * @returns {Array<object>} Array musuh yang bersebelahan.
 */
function getAdjacentEnemies(caster, allUnits) {
    const adjacentEnemies = [];
    const casterPos = caster.pseudoPos;
    allUnits.forEach(unit => {
        if (unit.type === "Enemy" && unit.status !== "Defeated") {
            if (unit.pseudoPos === casterPos + 1 || unit.pseudoPos === casterPos - 1) {
                adjacentEnemies.push(unit);
            }
        }
    });
    return adjacentEnemies;
}


// --- Variabel yang akan di-ekstrak oleh Tasker ---
// var battle_state; // Akan diisi oleh hasil JSON.stringify(bState) dari fungsi utama
// var js_script_log; // Akan diisi oleh taskerLogOutput
