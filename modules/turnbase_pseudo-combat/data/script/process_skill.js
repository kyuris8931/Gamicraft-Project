// --- script_tasker/process_skill.js (v1.5 - Popup Timing Fix) ---
// Description: Processes all SKILL actions from players.

let taskerLogOutput = "";
let wasTargetEliminated = false;
let skill_sfx = "";

function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\\n`;
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

function updateAllPseudoPositions(bState) {
    if (!bState?._turnOrder || !bState?.units) return;
    const aliveUnitsInOrder = bState._turnOrder.map(id => bState.units.find(u => u.id === id));
    aliveUnitsInOrder.forEach((unit, index) => {
        if (unit) {
            unit.pseudoPos = index;
        }
    });
}

function insertUnitAndReorder(bState, unitIdToInsert, targetIndex) {
    let turnOrder = bState._turnOrder || [];
    turnOrder = turnOrder.filter(id => id !== unitIdToInsert);
    const finalIndex = Math.max(0, Math.min(targetIndex, turnOrder.length));
    turnOrder.splice(finalIndex, 0, unitIdToInsert);
    bState._turnOrder = turnOrder;
    updateAllPseudoPositions(bState);
    return bState;
}

// --- MAIN SCRIPT LOGIC ---
let bState;
try {
    scriptLogger("SKILL_PROC: Script started.");
    bState = JSON.parse(battle_state);

    // --- POPUP TIMING FIX ---
    bState.lastActionDetails = null; // Clear any leftover details from the previous turn.
    // --- END OF FIX ---

    if (typeof actor_id !== 'string' || !actor_id.trim()) throw new Error("Input 'actor_id' is empty.");
    if (typeof command_id !== 'string' || !command_id.trim()) throw new Error("Input 'command_id' is empty.");
    if (typeof affected_target_ids !== 'string') throw new Error("Input 'affected_target_ids' must be a JSON string array.");

    if (!bState._defeatedEnemiesThisBattle) { bState._defeatedEnemiesThisBattle = []; }
    if (!bState.active_effects) { bState.active_effects = []; }

    const affectedTargetIdsFromUI = JSON.parse(affected_target_ids);
    const actor = getUnitById(actor_id, bState.units);
    const commandObject = actor.commands.find(cmd => cmd.commandId === command_id);

    if (!actor) throw new Error(`Actor with ID ${actor_id} not found.`);
    if (!commandObject) throw new Error(`Command with ID ${command_id} not found for Actor ${actor.name}.`);

    scriptLogger(`Actor: ${actor.name} | Skill: ${commandObject.name}`);

    if (commandObject.sfxFilename) {
        skill_sfx = commandObject.sfxFilename;
    }

    if (typeof commandObject.spCost === 'number' && commandObject.spCost > 0) {
        if (bState.teamSP < commandObject.spCost) throw new Error(`Not enough SP for ${commandObject.name}.`);
        bState.teamSP -= commandObject.spCost;
    }
    
    if (commandObject.isUltimate === true) {
        if (actor.stats.gauge < (commandObject.gaugeCost || 100)) throw new Error(`Not enough Gauge for ${commandObject.name}.`);
        actor.stats.gauge = 0;
        scriptLogger(`ULTIMATE_PROC: Gauge reset for ${actor.name}.`);
    }

    if (commandObject.applied_effects && Array.isArray(commandObject.applied_effects)) {
        scriptLogger("EFFECT_FACTORY: Skill has 'applied_effects'. Processing...");
        commandObject.applied_effects.forEach(effectDef => {
            affectedTargetIdsFromUI.forEach(targetId => {
                const chance = effectDef.chance || 1.0;
                if (Math.random() > chance) {
                    scriptLogger(`EFFECT_FACTORY: Effect "${effectDef.effect_id}" failed to apply to ${targetId} (chance fail).`);
                    return;
                }
                const newEffectInstance = JSON.parse(JSON.stringify(effectDef));
                newEffectInstance.source_skill_name = commandObject.name;
                newEffectInstance.source_actor_id = actor.id;
                if (newEffectInstance.target_type === 'individual') {
                    newEffectInstance.target_id = targetId;
                }
                delete newEffectInstance.chance;
                bState.active_effects.push(newEffectInstance);
                scriptLogger(`EFFECT_FACTORY: Adding effect "${newEffectInstance.effect_id}" to queue for target ${targetId}.`);
            });
        });
    }

    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            if (effect.type === "act_again") {
                actorActsAgain = true;
                return;
            }
            
            if (effect.type === "heal_lowest_hp_ally") {
                scriptLogger("EFFECT: Searching for ally with lowest HP.");
                const aliveAllies = bState.units.filter(u => u.type === 'Ally' && u.status !== 'Defeated');
                if (aliveAllies.length > 0) {
                    const sortedAllies = aliveAllies.sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp));
                    let lowestHpAlly = sortedAllies[0];
                    const healBaseStat = (effect.basedOn === "caster_atk") ? actor.stats.atk : lowestHpAlly.stats.maxHp;
                    const healAmount = calculateHeal(actor.stats, effect.multiplier, healBaseStat);
                    applyHeal(lowestHpAlly, healAmount);
                    targetsHitSummary.push(`${lowestHpAlly.name} (+${healAmount} HP)`);
                }
                return;
            }

            let actualEffectTargets = [];
            switch(effect.target) {
                case "caster": actualEffectTargets.push(actor); break;
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
                default: return;
            }
            
            if(actualEffectTargets.length === 0) return;

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
                    case "revive":
                        applyRevive(targetUnit, effect.hpPercentage || 0.50);
                        targetsHitSummary.push(`${targetUnit.name} (Revived)`);
                        bState = insertUnitAndReorder(bState, targetUnit.id, 1);
                        bState._turnOrderModifiedBySkill = true;
                        break;
                    case "status":
                        if (Math.random() >= (effect.chance || 1.0)) {
                            scriptLogger(`Failed to apply ${effect.statusName} to ${targetUnit.name} (chance fail).`);
                            break;
                        }

                        const effectDetails = effect.effectDetails || {};
                        
                        if (!effectDetails.trigger_phase) {
                            if (effect.statusName.toLowerCase() === 'stun') {
                                effectDetails.trigger_phase = 'start_of_turn';
                                scriptLogger(`Defaulting trigger_phase for Stun to 'start_of_turn'.`);
                            } else {
                                effectDetails.trigger_phase = 'end_of_turn';
                                scriptLogger(`Defaulting trigger_phase for ${effect.statusName} to 'end_of_turn'.`);
                            }
                        }

                        const statusEffectObject = {
                            name: effect.statusName,
                            duration: effect.duration || 1,
                            sourceUnitId: actor.id,
                            source_skill_name: commandObject.name,
                            target_id: targetUnit.id,
                            type: effect.statusName.toLowerCase(),
                            ...effectDetails
                        };

                        bState.active_effects.push(statusEffectObject);
                        
                        if (!targetUnit.statusEffects) targetUnit.statusEffects = { buffs: [], debuffs: [] };
                        targetUnit.statusEffects.debuffs.push({ name: effect.statusName, duration: effect.duration || 1 });
                        
                        scriptLogger(`Added effect "${effect.statusName}" to global queue for ${targetUnit.name}.`);
                        targetsHitSummary.push(`${targetUnit.name} (${effect.statusName})`);
                        break;
                }
            });
        });
    }

    let finalActionSummary = `${actor.name} used ${commandObject.name}!`;
    if (targetsHitSummary.length > 0) {
        bState.battleMessage = `${finalActionSummary} ${[...new Set(targetsHitSummary)].join('. ')}.`;
    } else if (actorActsAgain) {
        bState.battleMessage = finalActionSummary;
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

var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;
var was_target_eliminated = wasTargetEliminated;
var skills_sfx = skill_sfx;
var actorActsAgain = actorActsAgain;
