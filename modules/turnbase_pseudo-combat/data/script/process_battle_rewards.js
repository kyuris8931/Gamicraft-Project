/*
 * Gamicraft - Dynamic Battle Reward Generator
 * Version: 2.4 (Dual Output)
 *
 * Description:
 * Modifies an existing battle_state by injecting rewards into the battleResultSummary.
 * It also outputs a separate, simplified list of the generated rewards for other
 * Tasker processes.
 *
 * --- INPUT FROM TASKER ---
 * - battle_state: The JSON string of the battle_state object from the previous script.
 * - total_exp_gained: The total EXP points gained from the battle.
 * - enemy_global_level: The current global level of the enemies.
 * - item_data_json: JSON string of the entire main item list.
 * - reward_pool_categories: Comma-separated string of item categories for the loot pool.
 * - reward_config_json: JSON string containing all balance configurations.
 * - custom_rewards_json (Optional): JSON for event/custom items to inject.
 *
 * --- OUTPUT FOR TASKER ---
 * - battle_state: The MODIFIED JSON string of the battle_state, now including rewards.
 * - generated_rewards_json: A SIMPLIFIED JSON string of rewards (name and amount only).
 * - js_script_log: The execution log for debugging purposes.
 */

// --- GLOBAL VARIABLES & LOGGER ---
let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += `[REWARD_GEN] ${message}\n`;
}

// --- MAIN EXECUTION BLOCK ---
try {
    scriptLogger("--- Script Started: Dynamic Battle Reward Generator v2.3 ---");

    // 1. --- VALIDATE & PARSE TASKER INPUTS ---
    scriptLogger("Step 1: Parsing inputs from Tasker...");

    const bState = JSON.parse(battle_state);
    const totalExpGained = parseInt(total_exp_gained, 10) || 0;
    const enemyGlobalLevel = parseInt(enemy_global_level, 10) || 1;
    
    const itemDataJson = item_data_json || '[]';
    const allItems = JSON.parse(itemDataJson);

    const rewardPoolCategories = (reward_pool_categories || "").split(',').map(c => c.trim()).filter(c => c);
    const rewardConfigJson = reward_config_json || '{}';
    const rewardConfig = JSON.parse(rewardConfigJson);

    const customRewardsJson = (typeof custom_rewards_json !== 'undefined' && custom_rewards_json.trim()) ? custom_rewards_json : '[]';
    const customRewards = JSON.parse(customRewardsJson);

    // Critical validation
    if (!bState.battleResultSummary) throw new Error("battleResultSummary not found in the input battle_state.");
    if (allItems.length === 0) throw new Error("item_data_json is empty or invalid.");
    if (rewardPoolCategories.length === 0) throw new Error("reward_pool_categories is empty.");
    if (Object.keys(rewardConfig).length === 0) throw new Error("reward_config_json is empty or invalid.");
    
    scriptLogger(`-> EXP Gained: ${totalExpGained}, Enemy Level: ${enemyGlobalLevel}`);

    // --- PREPARATION: CREATE MASTER REWARD POOL ---
    scriptLogger("Step 2: Building the master reward pool...");
    
    let rewardPool = allItems.filter(item => rewardPoolCategories.includes(item.category));
    scriptLogger(`-> Found ${rewardPool.length} items in categories: [${rewardPoolCategories.join(', ')}]`);

    if (customRewards.length > 0) {
        scriptLogger(`-> Processing ${customRewards.length} custom/event rewards...`);
        customRewards.forEach(customItem => {
            const baseItem = allItems.find(item => item.name === customItem.name);
            if (baseItem) {
                rewardPool = rewardPool.filter(item => item.name !== customItem.name);
                const eventItem = { ...baseItem, custom_weight: customItem.weight };
                rewardPool.push(eventItem);
                scriptLogger(`   - Injected "${customItem.name}" with custom weight: ${customItem.weight}`);
            } else {
                scriptLogger(`   - WARNING: Custom reward "${customItem.name}" not found in main item list. Skipping.`);
            }
        });
    }

    // --- LAYER 1: CALCULATE INITIAL ROLLS (Kunci Peti) ---
    scriptLogger("Step 3: Calculating initial roll count (Layer 1)...");
    const rollFormula = rewardConfig.roll_formula || { base: 1, sqrt_multiplier: 0.3 };
    const initialRolls = Math.floor(rollFormula.base + rollFormula.sqrt_multiplier * Math.sqrt(totalExpGained));
    scriptLogger(`-> Formula: floor(${rollFormula.base} + ${rollFormula.sqrt_multiplier} * sqrt(${totalExpGained})) = ${initialRolls} initial rolls.`);

    // --- LAYER 2: APPLY SUCCESS FILTER (Filter Keberhasilan) ---
    scriptLogger("Step 4: Applying success filter to rolls (Layer 2)...");
    const successChance = rewardConfig.success_filter_chance || 0.5;
    let finalItemCount = 0;
    for (let i = 0; i < initialRolls; i++) {
        if (Math.random() < successChance) {
            finalItemCount++;
        }
    }
    scriptLogger(`-> ${initialRolls} rolls with ${successChance * 100}% success chance resulted in ${finalItemCount} final items.`);
    
    if (finalItemCount === 0) {
        scriptLogger("No successful rolls. Exiting with no rewards.");
        // Output the original battle_state if no rewards are generated
        var battle_state = JSON.stringify(bState);
        var js_script_log = taskerLogOutput;
        exit();
    }

    // --- LAYER 3: ADJUST RARITY WEIGHTS (Kualitas Undian) ---
    scriptLogger("Step 5: Adjusting rarity weights based on level (Layer 3)...");
    const weightsConfig = rewardConfig.rarity_weights;
    const adjustedWeights = { ...weightsConfig.base };
    
    for (const rarity in weightsConfig.level_modifier) {
        if (adjustedWeights.hasOwnProperty(rarity)) {
            const modifier = weightsConfig.level_modifier[rarity];
            const levelBonus = (enemyGlobalLevel - 1) * modifier;
            adjustedWeights[rarity] += levelBonus;
        }
    }
    let weightsLog = Object.entries(adjustedWeights).map(([key, value]) => `${key}=${value.toFixed(2)}`).join(', ');
    scriptLogger(`-> Adjusted weights for Lv.${enemyGlobalLevel}: ${weightsLog}`);

    // --- LAYER 4: PERFORM WEIGHTED DRAW (Isi Peti) ---
    scriptLogger(`Step 6: Performing ${finalItemCount} weighted draws (Layer 4)...`);
    const aggregatedResults = new Map();

    // 1. Hitung total bobot untuk RARITY satu kali saja
    const totalRarityWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);

    if (totalRarityWeight > 0) {
        for (let i = 0; i < finalItemCount; i++) {
            // --- Langkah 1: Lakukan Undian untuk Menentukan Rarity ---
            let randomRarity = Math.random() * totalRarityWeight;
            let chosenRarity = null;
            for (const rarity in adjustedWeights) {
                randomRarity -= adjustedWeights[rarity];
                if (randomRarity <= 0) {
                    chosenRarity = rarity;
                    break;
                }
            }

            if (chosenRarity) {
                // --- Langkah 2: Kumpulkan semua item dari rarity yang terpilih ---
                const itemsInChosenRarity = rewardPool.filter(item => item.rarity === chosenRarity);

                if (itemsInChosenRarity.length > 0) {
                    // --- Langkah 3: Lakukan undian biasa (tanpa bobot) di antara item-item tersebut ---
                    const randomIndex = Math.floor(Math.random() * itemsInChosenRarity.length);
                    const chosenItem = itemsInChosenRarity[randomIndex];

                    if (chosenItem) {
                        scriptLogger(`   - Roll #${i+1}: Rarity roll got "${chosenRarity}". Item roll got "${chosenItem.name}".`);
                        const currentQuantity = aggregatedResults.get(chosenItem.name)?.quantity || 0;
                        aggregatedResults.set(chosenItem.name, {
                            name: chosenItem.name,
                            quantity: currentQuantity + 1,
                            rarity: chosenItem.rarity
                        });
                    }
                } else {
                    scriptLogger(`   - WARNING: Rarity "${chosenRarity}" was chosen, but no items with this rarity were found in the pool.`);
                }
            }
        }
    } else {
        scriptLogger("   - WARNING: Total rarity weight is zero, cannot perform any draws.");
    }


    // --- FINAL STEP: INJECT RESULTS & FORMAT OUTPUT ---
    scriptLogger("Step 7: Injecting rewards into battle_state and formatting output...");
    const finalRewardsArray = Array.from(aggregatedResults.values());
    
    // A. Inject hasil lengkap ke dalam battle_state untuk UI
    bState.battleResultSummary.rewards = finalRewardsArray;
    scriptLogger(`-> Injected ${finalRewardsArray.length} reward type(s) into battleResultSummary.`);

    // B. Buat array ringkas untuk output terpisah
    const simplifiedRewards = finalRewardsArray.map(reward => ({
        name: reward.name,
        amount: reward.quantity
    }));
    scriptLogger("-> Created simplified reward list for separate output.");

    var battle_state = JSON.stringify(bState);
    var generated_rewards_json = JSON.stringify(simplifiedRewards, null, 2);

} catch (e) {
    scriptLogger(`--- SCRIPT CRASHED ---`);
    scriptLogger(`ERROR: ${e.message}`);
    scriptLogger(`STACK: ${e.stack}`);
    // On error, return the original battle_state to avoid breaking the Tasker flow
    var battle_state = (typeof battle_state === 'string' && battle_state.trim()) ? battle_state : '{}';
    var generated_rewards_json = "[]";
}

// --- SET TASKER VARIABLES ---
var js_script_log = taskerLogOutput;