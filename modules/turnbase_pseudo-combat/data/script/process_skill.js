// --- script_tasker/process_skill.js ---
// Deskripsi: Skrip ini HANYA memproses aksi SKILL dari pemain.
// Perannya adalah sebagai PEMBERI efek, termasuk status efek seperti Stun.
// Skrip ini TIDAK mengelola durasi status.

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
}

function calculateShield(casterStats, shieldMultiplier, basedOnStatValue) {
    const shield = basedOnStatValue * (shieldMultiplier || 1.0);
    return Math.round(shield);
}

function applyShield(targetUnit, shieldAmount) {
    if (targetUnit.status === "Defeated") return;
    const oldShield = targetUnit.stats.shieldHP || 0;
    targetUnit.stats.shieldHP = oldShield + shieldAmount;
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
}

/**
 * FUNGSI PEMBERI STATUS: Menambahkan status efek ke target.
 * TIDAK mengurangi durasi.
 */
function applyStatus(targetUnit, statusName, chance, duration, sourceUnitId) {
    if (targetUnit.status === "Defeated") return false;

    if (Math.random() >= chance) {
        scriptLogger(`APPLY_STATUS: Gagal menerapkan ${statusName} pada ${targetUnit.name} (chance: ${chance * 100}%).`);
        return false;
    }

    if (!targetUnit.statusEffects) {
        targetUnit.statusEffects = { buffs: [], debuffs: [], conditions: [] };
    }

    const statusArray = targetUnit.statusEffects.debuffs; // Asumsi Stun adalah debuff
    const existingStatus = statusArray.find(s => s.name === statusName);

    if (existingStatus) {
        existingStatus.duration = Math.max(existingStatus.duration, duration);
        scriptLogger(`APPLY_STATUS: Status ${statusName} pada ${targetUnit.name} durasinya diperbarui menjadi ${existingStatus.duration}.`);
    } else {
        statusArray.push({
            effectId: `${statusName}_${new Date().getTime()}`,
            name: statusName,
            displayName: statusName,
            type: "Debuff",
            duration: duration,
            sourceUnitId: sourceUnitId,
        });
        scriptLogger(`APPLY_STATUS: Status ${statusName} diterapkan pada ${targetUnit.name} selama ${duration} giliran.`);
    }
    return true;
}


// --- LOGIKA UTAMA SKRIP ---
let bState;
try {
    taskerLogOutput = "";
    scriptLogger("SKILL_PROC: Script dimulai.");

    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' kosong.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' kosong.");
    if (typeof command_id !== 'string' || !command_id.trim()) throw new Error("Input 'command_id' kosong.");
    if (typeof affected_target_ids !== 'string') throw new Error("Input 'affected_target_ids' harus berupa string JSON array.");

    bState = JSON.parse(battle_state);
    bState.uiSelectedTargetIds = JSON.parse(affected_target_ids);
    const actor = getUnitById(actor_id, bState.units);
    const commandObject = getCommandById(actor, command_id);

    if (!actor || !commandObject) {
        throw new Error("Aktor atau Command tidak ditemukan.");
    }

    if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
        if (bState.teamSP >= commandObject.spCost) {
            bState.teamSP -= commandObject.spCost;
        } else {
            throw new Error(`SP tidak cukup untuk ${commandObject.name}.`);
        }
    }

    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            
            // 1. Tangani efek yang tidak butuh target spesifik
            if (effect.type === "act_again") {
                actorActsAgain = true;
                return;
            }
            if (effect.type === "heal_lowest_hp_ally") {
                const aliveAllies = bState.units.filter(u => u.type === 'Ally' && u.status !== 'Defeated');
                if (aliveAllies.length > 0) {
                    let lowestHpAlly = aliveAllies.sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0];
                    const healBaseStat = (effect.basedOn === "caster_atk") ? actor.stats.atk : lowestHpAlly.stats.maxHp;
                    const healAmount = calculateHeal(actor.stats, effect.multiplier, healBaseStat);
                    applyHeal(lowestHpAlly, healAmount);
                    targetsHitSummary.push(`${lowestHpAlly.name} (+${healAmount} HP)`);
                }
                return;
            }

            // 2. Jika bukan efek di atas, tentukan targetnya
            let actualEffectTargets = [];
            switch(effect.target) {
                case "caster": actualEffectTargets.push(actor); break;
                case "selected": case "area": case "selected_and_line":
                    bState.uiSelectedTargetIds.forEach(tid => { const unit = getUnitById(tid, bState.units); if (unit) actualEffectTargets.push(unit); });
                    break;
                case "caster_adjacent_enemies":
                    actualEffectTargets.push(...getAdjacentEnemies(actor, bState.units));
                    break;
                default:
                    scriptLogger(`SKILL_PROC_WARN: Tipe target tidak dikenal: '${effect.target}' untuk efek '${effect.type}'`);
                    return;
            }

            // 3. Terapkan efek ke setiap target
            actualEffectTargets.forEach(targetUnit => {
                if (!targetUnit || (targetUnit.status === "Defeated" && effect.type !== "revive")) return;
                
                switch (effect.type) {
                    case "damage": case "damage_aoe_adjacent":
                        const damage = calculateDamage(actor.stats, targetUnit.stats, effect.multiplier, effect.ignoreDefense);
                        const damageResult = applyDamage(targetUnit, damage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${damageResult.totalDamage} HP)`);
                        if (targetUnit.status === "Defeated") wasTargetEliminated = true;
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
                        if (applyStatus(targetUnit, effect.statusName, effect.chance || 1.0, effect.duration || 1, actor.id)) {
                            targetsHitSummary.push(`${targetUnit.name} (Stunned)`);
                        }
                        break;
                }
            });
        });
    }

    let finalActionSummary = `${actor.name} menggunakan ${commandObject.name}!`;
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} ${targetsHitSummary.join('. ')}.`;
    } else if (actorActsAgain) {
        bState.battleMessage = `${finalActionSummary}`;
    } else {
        bState.battleMessage = `${finalActionSummary} ...tapi tidak ada efek yang terjadi.`;
    }
    bState.lastActionDetails = { actorId: actor_id, commandId: command_id, commandName: commandObject.name, targets: bState.uiSelectedTargetIds, effectsSummary: targetsHitSummary };

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

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;