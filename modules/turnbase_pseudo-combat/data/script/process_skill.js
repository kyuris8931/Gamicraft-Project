// --- script_tasker/process_skill.js (Version with Revive Logic) ---
// Description: Processes all SKILL actions from players.
// Includes: damage/heal/shield calculation, status effect application, SP reduction,
// tracking defeated enemies, and advanced revive logic.
//
// Input Variables from Tasker:
// - battle_state: JSON string of the current battle_state.
// - actor_id: ID of the unit performing the action.
// - command_id: ID of the skill being used.
// - affected_target_ids: JSON string array containing IDs of units affected by AoE effects from the UI.
//
// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle_state.
// - js_script_log: Execution log for debugging.
// - was_target_eliminated: Boolean, true if any target was successfully defeated.
// - skills_sfx: Name of the sound effect file to be played.
// - actorActsAgain: Boolean, true if the actor should act again after this skill.

let taskerLogOutput = "";
let wasTargetEliminated = false;
let skill_sfx = ""; // Variable to store the SFX filename

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}


// --- HELPER FUNCTIONS COLLECTION ---

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
    // For now, damage = ATK * multiplier. Can be made more complex later.
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

        // Track defeated enemies for progression
        if (targetUnit.type === "Enemy" && bStateRef._defeatedEnemiesThisBattle && !bStateRef._defeatedEnemiesThisBattle.some(e => e.id === targetUnit.id)) {
            const baseExp = bStateRef.units.find(u => u.id === targetUnit.id)?.expValue || 1;
            bStateRef._defeatedEnemiesThisBattle.push({
                id: targetUnit.id,
                tier: targetUnit.tier,
                expValue: baseExp
            });
            scriptLogger(`TRACKING: ${targetUnit.name} (Tier: ${targetUnit.tier}) added to progression list.`);
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
        scriptLogger(`APPLY_STATUS: Failed to apply ${statusName} to ${targetUnit.name} (chance: ${chance * 100}%).`);
        return false;
    }
    if (!targetUnit.statusEffects) {
        targetUnit.statusEffects = { buffs: [], debuffs: [] };
    }
    // Assume all statuses from player skills are debuffs for now. Can be expanded later.
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
    scriptLogger(`APPLY_STATUS: ${statusName} applied to ${targetUnit.name} for ${duration} turns.`);
    return true;
}

/**
 * version 1.0
 * created on 20-06-2025
 * Synchronize pseudoPos values of all units based on their order in bState._turnOrder.
 * This ensures visual positions on the pseudomap always match the turn order.
 * @param {object} bState - The battle_state object to be modified.
 */
function updateAllPseudoPositions(bState) {
    if (!bState?._turnOrder || !bState?.units) return;
    
    // Get only units that exist in _turnOrder (alive units)
    const aliveUnitsInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id));

    aliveUnitsInOrder.forEach((unit, index) => {
        if (unit) {
            unit.pseudoPos = index;
            scriptLogger(`SYNC_POS: Unit ${unit.name} (ID: ${unit.id}) set to pseudoPos: ${index}.`);
        }
    });
}

/**
 * version 1.0
 * created on 20-06-2025
 * Insert a unit into the _turnOrder array at a specific position, 
 * shift other units backward, and update all pseudoPos.
 * @param {object} bState - The battle_state object to be modified.
 * @param {string} unitIdToInsert - ID of the unit to be inserted.
 * @param {number} targetIndex - Position (array index) where the unit will be inserted.
 * @returns {object} Updated bState object.
 */
function insertUnitAndReorder(bState, unitIdToInsert, targetIndex) {
    scriptLogger(`REORDER_LOGIC: Starting process to insert ${unitIdToInsert} at index ${targetIndex}.`);

    let turnOrder = bState._turnOrder || [];
    
    // Ensure the unit to be inserted is not already in the turn order
    turnOrder = turnOrder.filter(id => id !== unitIdToInsert);
    
    // Ensure targetIndex is valid
    const finalIndex = Math.max(0, Math.min(targetIndex, turnOrder.length));
    
    // Insert unit using splice
    turnOrder.splice(finalIndex, 0, unitIdToInsert);
    
    scriptLogger(`REORDER_LOGIC: New turn order (before synchronization): ${turnOrder.join(', ')}`);
    
    // Update bState with the new turn order
    bState._turnOrder = turnOrder;
    
    // VERY IMPORTANT: Call synchronization function after modifying _turnOrder
    updateAllPseudoPositions(bState);
    
    scriptLogger(`REORDER_LOGIC: Insertion and synchronization process completed.`);
    return bState;
}

// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    scriptLogger("SKILL_PROC: Script started.");

    // 1. Validate and Parse Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' is empty.");
    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' is empty.");
    if (typeof command_id !== 'string' || !command_id.trim()) throw new Error("Input 'command_id' is empty.");
    if (typeof affected_target_ids !== 'string') throw new Error("Input 'affected_target_ids' must be a JSON string array.");

    bState = JSON.parse(battle_state);
    if (!bState._defeatedEnemiesThisBattle) { bState._defeatedEnemiesThisBattle = []; }
    if (!bState.active_effects) { bState.active_effects = []; } // Inisialisasi jika belum ada

    const affectedTargetIdsFromUI = JSON.parse(affected_target_ids);
    const actor = getUnitById(actor_id, bState.units);
    const commandObject = actor.commands.find(cmd => cmd.commandId === command_id);

    if (!actor) throw new Error(`Actor with ID ${actor_id} not found.`);
    if (!commandObject) throw new Error(`Command with ID ${command_id} not found for Actor ${actor.name}.`);

    scriptLogger(`Actor: ${actor.name} | Skill: ${commandObject.name}`);

    // 2. Retrieve SFX & Reduce SP
    if (commandObject.sfxFilename) {
        skill_sfx = commandObject.sfxFilename;
        scriptLogger(`SKILL_PROC: SFX found: ${skill_sfx}`);
    }

    if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
        if (bState.teamSP >= commandObject.spCost) {
            bState.teamSP -= commandObject.spCost;
        } else {
            throw new Error(`Not enough SP for ${commandObject.name}. Required: ${commandObject.spCost}, Available: ${bState.teamSP}.`);
        }
    }

    if (commandObject.isUltimate === true) {
        if (actor.stats && typeof actor.stats.gauge === 'number') {
            const gaugeCost = commandObject.gaugeCost || 100; // Ambil dari command atau default 100
            if (actor.stats.gauge >= gaugeCost) {
                actor.stats.gauge = 0; // Reset gauge ke 0
                scriptLogger(`ULTIMATE_PROC: Gauge reset for ${actor.name}.`);
            } else {
                 throw new Error(`Not enough Gauge for ${commandObject.name}. Required: ${gaugeCost}, Available: ${actor.stats.gauge}.`);
            }
        }
    }

    if (commandObject.applied_effects && Array.isArray(commandObject.applied_effects)) {
        scriptLogger("EFFECT_FACTORY: Skill memiliki 'applied_effects'. Memproses...");

        // Loop melalui setiap definisi efek di dalam skill
        commandObject.applied_effects.forEach(effectDef => {
            
            // Loop melalui setiap target yang terkena skill dari UI
            affectedTargetIdsFromUI.forEach(targetId => {
                
                // Cek chance (jika ada), default 100%
                const chance = effectDef.chance || 1.0;
                if (Math.random() > chance) {
                    scriptLogger(`EFFECT_FACTORY: Efek "${effectDef.effect_id}" gagal diterapkan ke ${targetId} (chance fail).`);
                    return; // Lanjut ke target berikutnya
                }

                // Buat salinan dari definisi efek untuk dimodifikasi
                const newEffectInstance = JSON.parse(JSON.stringify(effectDef));

                // Tambahkan informasi spesifik ke instance efek ini
                newEffectInstance.source_skill_name = commandObject.name;
                newEffectInstance.source_actor_id = actor.id;

                // Jika efeknya individual, catat siapa targetnya
                if (newEffectInstance.target_type === 'individual') {
                    newEffectInstance.target_id = targetId;
                }
                
                // Hapus properti 'chance' karena sudah diproses
                delete newEffectInstance.chance;

                // Masukkan efek yang sudah lengkap ke antrian `active_effects`
                bState.active_effects.push(newEffectInstance);
                scriptLogger(`EFFECT_FACTORY: Menambahkan efek "${newEffectInstance.effect_id}" ke antrian untuk target ${targetId}.`);
            });
        });
    }

    // 3. Process Each Skill Effect (New Loop Structure)
    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            
            // A. First check if this is a "global" effect that doesn't require UI targets
            if (effect.type === "act_again") {
                actorActsAgain = true;
                scriptLogger(`EFFECT: Actor ${actor.name} will act again.`);
                return; // Continue to the next effect in the forEach
            }
            
            if (effect.type === "heal_lowest_hp_ally") {
                scriptLogger("EFFECT: Searching for ally with lowest HP.");
                const aliveAllies = bState.units.filter(u => u.type === 'Ally' && u.status !== 'Defeated');
                if (aliveAllies.length > 0) {
                    // Safety check for sort, if maxHp is 0, assume percentage is 1 (full)
                    const sortedAllies = aliveAllies.sort((a, b) => {
                        const percentA = a.stats.maxHp > 0 ? (a.stats.hp / a.stats.maxHp) : 1;
                        const percentB = b.stats.maxHp > 0 ? (b.stats.hp / b.stats.maxHp) : 1;
                        return percentA - percentB;
                    });
                    let lowestHpAlly = sortedAllies[0];
                    
                    const healBaseStat = (effect.basedOn === "caster_atk") ? actor.stats.atk : lowestHpAlly.stats.maxHp;
                    const healAmount = calculateHeal(actor.stats, effect.multiplier, healBaseStat);
                    applyHeal(lowestHpAlly, healAmount);
                    targetsHitSummary.push(`${lowestHpAlly.name} (+${healAmount} HP)`);
                    scriptLogger(`EFFECT: ${lowestHpAlly.name} healed by ${healAmount}.`);
                } else {
                    scriptLogger("EFFECT: No living allies to heal.");
                }
                return; // Continue to the next effect in the forEach
            }

            // B. If not a global effect, it requires UI targets
            let actualEffectTargets = [];
            switch(effect.target) {
                case "caster": 
                    actualEffectTargets.push(actor); 
                    break;
                case "selected": 
                case "area":
                    affectedTargetIdsFromUI.forEach(tid => {
                        const unit = getUnitById(tid, bState.units); 
                        if (unit) actualEffectTargets.push(unit);
                    });
                    break;
                case "caster_adjacent_enemies":
                    actualEffectTargets.push(...getAdjacentEnemies(actor, bState.units));
                    break;
                default:
                    scriptLogger(`EFFECT_WARN: Unknown target type: '${effect.target}'`);
                    return; // Skip this effect
            }
            
            if(actualEffectTargets.length === 0) {
                 scriptLogger(`EFFECT_WARN: No valid targets found for effect '${effect.type}'`);
                 return; // Skip if no valid targets
            }
            scriptLogger(`EFFECT: Applying '${effect.type}' to: ${actualEffectTargets.map(u => u.name).join(', ')}`);

            // Apply effect to each valid target
            actualEffectTargets.forEach(targetUnit => {
                if (!targetUnit || (targetUnit.status === "Defeated" && effect.type !== "revive")) return;
                
                switch (effect.type) {
                    case "damage":
                    case "damage_aoe_adjacent":
                        const damage = calculateDamage(actor.stats, effect.multiplier);
                        const damageResult = applyDamage(targetUnit, damage, bState);
                        targetsHitSummary.push(`${targetUnit.name} (-${damageResult.totalDamage} HP)`);
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
                    // case revive update on 20-06-2025
                    case "revive":
                        // Step 1: Apply revive status (HP, status, etc.) as usual.
                        applyRevive(targetUnit, effect.hpPercentage || 0.50); // You can adjust the HP percentage here
                        targetsHitSummary.push(`${targetUnit.name} (Revived)`);
                        scriptLogger(`SKILL_REVIVE: ${targetUnit.name} has been revived.`);
                        
                        // Step 2: Call a helper to insert this unit into _turnOrder
                        // We want it at pseudoPos 1, which means at index 1 of the _turnOrder array.
                        bState = insertUnitAndReorder(bState, targetUnit.id, 1);
                        
                        // Step 3: Set a flag so the turn manager knows the next turn needs to be updated
                        // specifically after the revive.
                        bState._turnOrderModifiedBySkill = true;
                        
                        break;
                    case "status":
                    // Cek chance terlebih dahulu
                        if (Math.random() >= (effect.chance || 1.0)) {
                            scriptLogger(`APPLY_STATUS: Gagal menerapkan ${effect.statusName} ke ${targetUnit.name} (chance fail).`);
                            break; // Lanjut ke target/efek berikutnya
                        }

                        const effectDetails = effect.effectDetails || {};

                        const statusEffectObject = {
                            name: effect.statusName,
                            duration: effect.duration || 1,
                            sourceUnitId: actor.id,
                            source_skill_name: commandObject.name,
                            target_id: targetUnit.id,
                            type: effect.statusName.toLowerCase(), // e.g., "poison", "stun"
                            ...effectDetails // <-- KUNCI: Salin semua detail seperti damage, trigger_phase, dll.
                        };

                        if (!bState.active_effects) { bState.active_effects = []; }
                        bState.active_effects.push(statusEffectObject);
                        
                        // Tambahkan juga ke daftar debuff unit untuk referensi cepat (opsional tapi bagus)
                        if (!targetUnit.statusEffects) { targetUnit.statusEffects = { buffs: [], debuffs: [] }; }
                        targetUnit.statusEffects.debuffs.push({ name: effect.statusName, duration: effect.duration || 1 });
                        
                        scriptLogger(`EFFECT_FACTORY: Menambahkan efek "${effect.statusName}" ke antrian global untuk target ${targetUnit.name}.`);
                        targetsHitSummary.push(`${targetUnit.name} (${effect.statusName})`);
                        break;
                }
            });

        });
    }

    // 4. Finalize Action
    let finalActionSummary = `${actor.name} used ${commandObject.name}!`;
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} ${[...new Set(targetsHitSummary)].join('. ')}.`;
    } else if (actorActsAgain) {
        bState.battleMessage = `${finalActionSummary}`;
    } else {
        bState.battleMessage = `${finalActionSummary} ...but no valid targets were found.`;
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

// --- Output for Tasker ---
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
var skills_sfx = skill_sfx;
var actorActsAgain = actorActsAgain;