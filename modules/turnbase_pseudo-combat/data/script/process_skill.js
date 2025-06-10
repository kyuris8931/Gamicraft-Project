// --- script_tasker/process_skill.js ---
// Deskripsi: Skrip ini HANYA memproses aksi SKILL dari pemain.
// Bertindak sebagai "mesin" yang membaca definisi skill dari JSON dan menjalankannya.
//
// Variabel Input dari Tasker:
// - battle_state: String JSON dari battle_state saat ini.
// - actor_id: ID unit yang menggunakan skill.
// - command_id: ID skill yang digunakan.
// - affected_target_ids: String JSON array berisi ID target yang dipilih/terkena efek di UI.
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

function calculateDamage(attackerStats, targetStats, effectMultiplier = 1.0, ignoreDefensePercentage = 0) {
    let damage = attackerStats.atk * effectMultiplier;
    // Logika pertahanan bisa ditambahkan di sini jika ada stat 'def'
    // const effectiveDef = (targetStats.def || 0) * (1 - ignoreDefensePercentage);
    // damage = Math.max(1, damage - effectiveDef);
    return Math.round(damage);
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
    }
    return { totalDamage: shieldDamageDealt + hpDamageDealt, shieldDamage: shieldDamageDealt, hpDamage: hpDamageDealt };
}

function calculateHeal(casterStats, healMultiplier, basedOnStatValue) {
    const heal = basedOnStatValue * (healMultiplier || 1.0);
    return Math.round(heal);
}

function applyHeal(targetUnit, healAmount) {
    if (targetUnit.status === "Defeated") return;
    const oldHp = targetUnit.stats.hp;
    targetUnit.stats.hp = Math.min(targetUnit.stats.hp + healAmount, targetUnit.stats.maxHp);
    scriptLogger(`APPLY_HEAL: ${targetUnit.name} HP: ${oldHp} -> ${targetUnit.stats.hp}.`);
}

function calculateShield(casterStats, shieldMultiplier, basedOnStatValue) {
    const shield = basedOnStatValue * (shieldMultiplier || 1.0);
    return Math.round(shield);
}

function applyShield(targetUnit, shieldAmount) {
    if (targetUnit.status === "Defeated") return;
    const oldShield = targetUnit.stats.shieldHP || 0;
    targetUnit.stats.shieldHP = oldShield + shieldAmount;
    scriptLogger(`APPLY_SHIELD: ${targetUnit.name} Shield: ${oldShield} -> ${targetUnit.stats.shieldHP}.`);
}

function applyRevive(targetUnit, hpPercentage) {
    if (targetUnit.status !== "Defeated") return;
    targetUnit.status = "Idle";
    targetUnit.stats.hp = Math.max(1, Math.round(targetUnit.stats.maxHp * hpPercentage));
    targetUnit.stats.shieldHP = 0;
    if (targetUnit.statusEffects) {
        targetUnit.statusEffects.buffs = [];
        targetUnit.statusEffects.debuffs = [];
        targetUnit.statusEffects.conditions = [];
    }
    scriptLogger(`APPLY_REVIVE: ${targetUnit.name} dihidupkan kembali dengan ${targetUnit.stats.hp} HP.`);
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("SKILL_PROC: Script dimulai.");

    // 1. Validasi dan Parsing Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' kosong.");
    if (typeof command_id !== 'string' || !command_id.trim()) throw new Error("Input 'command_id' kosong.");
    if (typeof affected_target_ids !== 'string') throw new Error("Input 'affected_target_ids' harus berupa string JSON array.");
    
    bState = JSON.parse(battle_state);
    bState.uiSelectedTargetIds = JSON.parse(affected_target_ids); // Target dari UI, untuk efek "area" atau "selected"

    const actor = getUnitById(actor_id, bState.units);
    if (!actor) throw new Error(`Aktor ID ${actor_id} tidak ditemukan.`);
    if (actor.status === "Defeated") throw new Error(`Aktor ${actor.name} sudah kalah.`);
    
    const commandObject = getCommandById(actor, command_id);
    if (!commandObject) throw new Error(`Skill ID ${command_id} tidak ditemukan pada ${actor.name}.`);
    
    scriptLogger(`SKILL_PROC: Memproses Skill '${commandObject.name}' oleh ${actor.name}.`);

    // 2. Kurangi SP jika diperlukan
    if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
        if (bState.teamSP >= commandObject.spCost) {
            bState.teamSP -= commandObject.spCost;
            scriptLogger(`SKILL_PROC: SP dikurangi ${commandObject.spCost}. Sisa: ${bState.teamSP}.`);
        } else {
            throw new Error(`SP tidak cukup untuk ${commandObject.name}.`);
        }
    }

    // 3. Proses setiap efek dari skill
    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            let actualEffectTargets = [];

            // Tentukan target yang sebenarnya berdasarkan definisi 'effect.target'
            switch(effect.target) {
                case "caster":
                    actualEffectTargets.push(actor);
                    break;
                case "selected":
                case "area":
                case "selected_and_line":
                    bState.uiSelectedTargetIds.forEach(tid => {
                        const unit = getUnitById(tid, bState.units);
                        if (unit) actualEffectTargets.push(unit);
                    });
                    break;
                case "caster_adjacent_enemies":
                    actualEffectTargets.push(...getAdjacentEnemies(actor, bState.units));
                    break;
                default:
                    scriptLogger(`SKILL_PROC_WARN: Tipe target efek tidak dikenal: '${effect.target}'`);
            }

            // Terapkan efek ke setiap target yang sudah ditentukan
            actualEffectTargets.forEach(targetUnit => {
                if (!targetUnit || (targetUnit.status === "Defeated" && effect.type !== "revive")) return;
                
                switch (effect.type) {
                    case "damage":
                    case "damage_aoe_adjacent": // Dianggap sama untuk saat ini
                        const damage = calculateDamage(actor.stats, targetUnit.stats, effect.multiplier, effect.ignoreDefense);
                        const damageResult = applyDamage(targetUnit, damage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${damageResult.totalDamage} HP)`);
                        // Cek apakah target unit kalah
                        if (targetUnit.status === "Defeated") {
                            wasTargetEliminated = true; // <-- TAMBAHKAN INI
                        }
                        // Cek kondisi "act_again"
                        if (targetUnit.status === "Defeated" && effect.condition === "target_defeated" && effect.action === "act_again") {
                            actorActsAgain = true;
                        }
                        break;
                    
                    case "heal":
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
                        // Logika untuk menerapkan status (seperti Stun, Burn, dll.) akan ditambahkan di sini.
                        // applyStatus(targetUnit, effect.statusName, ...);
                        scriptLogger(`SKILL_PROC: Efek status '${effect.statusName}' akan diterapkan pada ${targetUnit.name}. (Logika belum diimplementasikan)`);
                        break;

                    case "conditional":
                        // Hanya untuk 'act_again' yang sudah ditangani di case 'damage'
                        break;
                        
                    default:
                        scriptLogger(`SKILL_PROC_WARN: Tipe efek tidak dikenal: '${effect.type}'`);
                }
            });
        });
    }

    // 4. Update Battle Message dan Detail Aksi Terakhir
    let finalActionSummary = `${actor.name} menggunakan ${commandObject.name}!`;
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} ${targetsHitSummary.join('. ')}.`;
    } else {
        bState.battleMessage = `${finalActionSummary} ...tapi tidak ada efek yang terjadi.`;
    }

    bState.lastActionDetails = {
        actorId: actor_id,
        commandId: command_id,
        commandName: commandObject.name,
        targets: bState.uiSelectedTargetIds,
        effectsSummary: targetsHitSummary
    };
    
    // Handle kondisi 'act again'
    if (actorActsAgain) {
        bState._actorShouldActAgain = actor_id; // Flag untuk dibaca oleh turn_manager
        scriptLogger(`SKILL_PROC: ${actor.name} mendapatkan giliran tambahan!`);
    } else {
        // Jika tidak act again, set status aktor menjadi 'EndTurn'
        actor.status = "EndTurn";
        scriptLogger(`SKILL_PROC: Status ${actor.name} diubah menjadi EndTurn.`);
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
