// --- script_tasker/process_skill.js (Complete & Fixed Version) ---
// Description: Processes all SKILL actions from players.
// Includes: damage/heal/shield calculation, status effect application, SP reduction,
// tracking defeated enemies for progression system, and determining SFX.
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
    // Initialize progression tracking array if not present
    if (!bState._defeatedEnemiesThisBattle) {
        bState._defeatedEnemiesThisBattle = [];
    }

    const affectedTargetIdsFromUI = JSON.parse(affected_target_ids);
    const actor = getUnitById(actor_id, bState.units);
    const commandObject = getCommandById(actor, command_id);

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

    // 3. Process Each Skill Effect (New Loop Structure)
    let targetsHitSummary = [];
    let actorActsAgain = false;

    if (commandObject.effects && Array.isArray(commandObject.effects)) {
        commandObject.effects.forEach(effect => {
            
            // ==========================================================
            // ===          NEW EFFECT HANDLING STRUCTURE             ===
            // ==========================================================

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