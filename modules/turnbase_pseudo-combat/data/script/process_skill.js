// --- script_tasker/process_skill.js (Versi Lengkap & Diperbaiki) ---
// Deskripsi: Memproses semua aksi SKILL dari pemain.
// Termasuk: kalkulasi damage/heal/shield, penerapan status efek, pengurangan SP,
// pelacakan musuh yang kalah untuk sistem progresi, dan penentuan SFX.
//
// Variabel Input dari Tasker:
// - battle_state: String JSON dari battle_state saat ini.
// - actor_id: ID unit yang melakukan aksi.
// - command_id: ID dari skill yang digunakan.
// - affected_target_ids: String JSON array berisi ID unit yang terkena efek AoE dari UI.
//
// Variabel Output untuk Tasker:
// - battle_state: String JSON dari battle_state yang telah diupdate.
// - js_script_log: Log eksekusi untuk debugging.
// - was_target_eliminated: Boolean, true jika ada target yang berhasil dikalahkan.
// - skills_sfx: Nama file sound effect yang akan dimainkan.

let taskerLogOutput = "";
let wasTargetEliminated = false;
let skill_sfx = ""; // Variabel untuk menyimpan nama file SFX

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}


// --- KUMPULAN FUNGSI HELPER ---

function getUnitById(unitId, unitsArray) {
    if (!unitId || !Array.isArray(unitsArray)) return null;
    return unitsArray.find(u => u.id === unitId);
}

function getCommandById(unit, commandId) {
    if (!unit || !unit.commands || !Array.isArray(unit.commands)) return null;
    return unit.commands.find(cmd => cmd.commandId === commandId);
}

function getAdjacentEnemies(caster, allUnits) {
    if (!caster || !Array.isArray(allUnits)) return [];
    const adjacentEnemies = [];
    const casterPos = caster.pseudoPos;
    allUnits.forEach(unit => {
        if (unit.type === "Enemy" && unit.status !== "Defeated") {
            if (Math.abs(unit.pseudoPos - casterPos) === 1) {
                adjacentEnemies.push(unit);
            }
        }
    });
    return adjacentEnemies;
}

function calculateDamage(attackerStats, effectMultiplier = 1.0) {
    // Untuk saat ini, damage = ATK * multiplier. Bisa dibuat lebih kompleks nantinya.
    return Math.round(attackerStats.atk * effectMultiplier);
}

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

function calculateHeal(casterStats, healMultiplier, basedOnStatValue) {
    return Math.round(basedOnStatValue * (healMultiplier || 1.0));
}

function applyHeal(targetUnit, healAmount) {
    if (targetUnit.status === "Defeated") return;
    targetUnit.stats.hp = Math.min(targetUnit.stats.hp + healAmount, targetUnit.stats.maxHp);
}

function calculateShield(casterStats, shieldMultiplier, basedOnStatValue) {
    return Math.round(basedOnStatValue * (shieldMultiplier || 1.0));
}

function applyShield(targetUnit, shieldAmount) {
    if (targetUnit.status === "Defeated") return;
    targetUnit.stats.shieldHP = (targetUnit.stats.shieldHP || 0) + shieldAmount;
}

function applyRevive(targetUnit, hpPercentage) {
    if (targetUnit.status !== "Defeated") return;
    targetUnit.status = "Idle";
    targetUnit.stats.hp = Math.max(1, Math.round(targetUnit.stats.maxHp * hpPercentage));
    targetUnit.stats.shieldHP = 0;
    if (targetUnit.statusEffects) {
        targetUnit.statusEffects.buffs = [];
        targetUnit.statusEffects.debuffs = [];
    }
}

function applyStatus(targetUnit, statusName, chance, duration, sourceUnitId) {
    if (targetUnit.status === "Defeated") return false;
    if (Math.random() >= chance) {
        scriptLogger(`APPLY_STATUS: Gagal menerapkan ${statusName} pada ${targetUnit.name} (chance: ${chance * 100}%).`);
        return false;
    }
    if (!targetUnit.statusEffects) {
        targetUnit.statusEffects = { buffs: [], debuffs: [] };
    }
    // Asumsi semua status dari skill pemain saat ini adalah debuff. Bisa dikembangkan lagi.
    const statusArray = targetUnit.statusEffects.debuffs;
    const existingStatus = statusArray.find(s => s.name === statusName);

    if (existingStatus) {
        existingStatus.duration = Math.max(existingStatus.duration, duration);
    } else {
        statusArray.push({
            name: statusName,
            duration: duration,
            sourceUnitId: sourceUnitId,
        });
    }
    scriptLogger(`APPLY_STATUS: ${statusName} diterapkan pada ${targetUnit.name} selama ${duration} giliran.`);
    return true;
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    scriptLogger("SKILL_PROC: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' kosong.");
    if (typeof command_id !== 'string' || !command_id.trim()) throw new Error("Input 'command_id' kosong.");
    if (typeof affected_target_ids !== 'string') throw new Error("Input 'affected_target_ids' harus berupa string JSON array.");

    bState = JSON.parse(battle_state);
    // Inisialisasi array pelacak progresi jika belum ada
    if (!bState._defeatedEnemiesThisBattle) {
        bState._defeatedEnemiesThisBattle = [];
    }

    const affectedTargetIdsFromUI = JSON.parse(affected_target_ids);
    const actor = getUnitById(actor_id, bState.units);
    const commandObject = getCommandById(actor, command_id);

    if (!actor) throw new Error(`Aktor dengan ID ${actor_id} tidak ditemukan.`);
    if (!commandObject) throw new Error(`Command dengan ID ${command_id} tidak ditemukan untuk Aktor ${actor.name}.`);

    scriptLogger(`Aktor: ${actor.name} | Skill: ${commandObject.name}`);

    // 2. Ambil SFX & Kurangi SP
    if (commandObject.sfxFilename) {
        skill_sfx = commandObject.sfxFilename;
        scriptLogger(`SKILL_PROC: SFX ditemukan: ${skill_sfx}`);
    }

    if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
        if (bState.teamSP >= commandObject.spCost) {
            bState.teamSP -= commandObject.spCost;
        } else {
            throw new Error(`SP tidak cukup untuk ${commandObject.name}. Butuh: ${commandObject.spCost}, Tersedia: ${bState.teamSP}.`);
        }
    }

    // 3. Proses Setiap Efek dari Skill
    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            
            // Efek yang tidak butuh target spesifik (misal: act_again)
            if (effect.type === "act_again") {
                actorActsAgain = true;
                scriptLogger(`SKILL_PROC: Aktor ${actor.name} akan mendapatkan giliran lagi.`);
                return; // Lanjut ke efek berikutnya
            }

            // Tentukan target untuk efek ini
            let actualEffectTargets = [];
            switch(effect.target) {
                case "caster": 
                    actualEffectTargets.push(actor); 
                    break;
                case "selected": 
                case "area":
                    // Semua ID dari UI dianggap sebagai target untuk efek tipe 'area' atau 'selected'
                    affectedTargetIdsFromUI.forEach(tid => {
                        const unit = getUnitById(tid, bState.units); 
                        if (unit) actualEffectTargets.push(unit);
                    });
                    break;
                case "caster_adjacent_enemies":
                    actualEffectTargets.push(...getAdjacentEnemies(actor, bState.units));
                    break;
                default:
                    scriptLogger(`SKILL_PROC_WARN: Tipe target tidak dikenal: '${effect.target}'`);
                    return; // Lanjut ke efek berikutnya
            }
            
            scriptLogger(`Efek '${effect.type}' menargetkan: ${actualEffectTargets.map(u => u.name).join(', ')}`);

            // Terapkan efek ke setiap target yang valid
            actualEffectTargets.forEach(targetUnit => {
                if (!targetUnit || (targetUnit.status === "Defeated" && effect.type !== "revive")) return;
                
                switch (effect.type) {
                    case "damage":
                    case "damage_aoe_adjacent": // Keduanya memanggil fungsi damage yang sama
                        const damage = calculateDamage(actor.stats, effect.multiplier);
                        const damageResult = applyDamage(targetUnit, damage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${damageResult.totalDamage} HP)`);
                        break;
                    case "heal":
                    case "heal_lowest_hp_ally": // Logika heal
                        const healBaseStat = (effect.basedOn === "caster_atk") ? actor.stats.atk : targetUnit.stats.maxHp;
                        const healAmount = calculateHeal(actor.stats, effect.multiplier, healBaseStat);
                        applyHeal(targetUnit, healAmount);
                        targetsHitSummary.push(`${targetUnit.name} (+${healAmount} HP)`);
                        break;
                    case "shield":
                        const shieldBaseStat = (effect.basedOn === "caster_atk") ? actor.stats.atk : 0;
                        const shieldAmount = calculateShield(actor.stats, effect.multiplier, shieldBaseStat);
                        applyShield(targetUnit, shieldAmount);
                        targetsHitSummary.push(`${targetUnit.name} (+${shieldAmount} Shield)`);
                        break;
                    case "revive":
                        applyRevive(targetUnit, effect.hpPercentage || 0.3);
                        targetsHitSummary.push(`${targetUnit.name} (Revived)`);
                        break;
                    case "status":
                        if (applyStatus(targetUnit, effect.statusName, effect.chance || 1.0, effect.duration || 1, actor.id)) {
                            targetsHitSummary.push(`${targetUnit.name} (${effect.statusName})`);
                        }
                        break;
                }
            });
        });
    }

    // 4. Finalisasi Aksi
    let finalActionSummary = `${actor.name} menggunakan ${commandObject.name}!`;
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} ${[...new Set(targetsHitSummary)].join('. ')}.`;
    } else if (actorActsAgain) {
        bState.battleMessage = `${finalActionSummary}`;
    } else {
        bState.battleMessage = `${finalActionSummary} ...tapi tidak ada target yang valid.`;
    }

    bState.lastActionDetails = { 
        actorId: actor_id, 
        commandId: command_id, 
        commandName: commandObject.name, 
        targets: affectedTargetIdsFromUI, 
        effectsSummary: targetsHitSummary 
    };

    if (actorActsAgain) {
        bState._actorShouldActAgain = actor_id;
    } else {
        actor.status = "EndTurn";
    }

} catch (e) {
    scriptLogger("SKILL_PROC_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleState = "Error";
    bState.battleMessage = "Skill Error: " + e.message;
}

// --- Output untuk Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
var skills_sfx = skill_sfx;