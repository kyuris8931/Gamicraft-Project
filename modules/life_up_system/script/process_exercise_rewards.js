/*
 * Gamicraft - Process Exercise Rewards
 * Version: 1.0
 *
 * Description:
 * This script is executed after exercise EXP has been calculated. It uses the total
 * EXP gained as a number of "rolls" to determine if the user gets post-exercise rewards.
 * Each roll has a fixed chance to succeed. Successful rolls grant an item from a loot table.
 *
 * Input from Tasker:
 * - %total_exp_gained: The total EXP points gained from the exercise.
 * - %loot_table_data: JSON string from 'exercise_loot_table.json'.
 * - %item_data_json: The main item list JSON for ID lookups.
 *
 * Output for Tasker:
 * - %reward_urls_str: A string of all generated reward URLs, separated by '_|_'.
 * - %js_script_log: Execution log for debugging.
 * - %total_rewards_gained: The total number of items won.
 */

let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += message + "\n";
}

try {
    scriptLogger("EXERCISE_REWARDS: Script started.");

    // 1. --- Validate and Parse Inputs ---
    const totalExpGained = parseInt(total_exp_gained, 10) || 0;
    if (totalExpGained === 0) {
        scriptLogger("No EXP gained, no rewards to process. Exiting.");
        exit();
    }
    scriptLogger(`Processing rewards for ${totalExpGained} EXP points.`);

    const lootTableJson = loot_table_data || '[]';
    const lootTable = JSON.parse(lootTableJson);
    if (lootTable.length === 0) {
        throw new Error("Loot table data is empty.");
    }

    const itemDataJson = item_data_json || '[]';
    const allItems = JSON.parse(itemDataJson);
    const itemMap = new Map(allItems.map(item => [item.name, item.id]));

    // --- Configuration ---
    const CHANCE_PER_ROLL = 10; // 10% chance per EXP point

    // 2. --- Simulate Rolls for Each EXP Point ---
    let successfulRolls = 0;
    for (let i = 0; i < totalExpGained; i++) {
        const roll = Math.random() * 100; // Random number between 0 and 99.99...
        if (roll < CHANCE_PER_ROLL) {
            successfulRolls++;
        }
    }
    scriptLogger(`Player had ${totalExpGained} rolls, with ${successfulRolls} successful drops.`);

    if (successfulRolls === 0) {
        scriptLogger("No successful drops. Exiting.");
        exit();
    }

    // 3. --- Determine Rewards from Successful Rolls ---
    const rewardsWon = new Map(); // Use a Map to count each unique item won
    const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);

    for (let i = 0; i < successfulRolls; i++) {
        let randomWeight = Math.random() * totalWeight;
        let chosenItem = null;

        for (const item of lootTable) {
            if (randomWeight < item.weight) {
                chosenItem = item;
                break;
            }
            randomWeight -= item.weight;
        }

        if (chosenItem) {
            // Add the won item to our map, incrementing its count
            rewardsWon.set(chosenItem.item_name, (rewardsWon.get(chosenItem.item_name) || 0) + 1);
        }
    }

    // 4. --- Generate Reward API URLs ---
    const rewardUrls = [];
    let totalRewardsGained = 0;

    for (const [itemName, quantity] of rewardsWon.entries()) {
        const itemId = itemMap.get(itemName);
        if (itemId) {
            const reason = encodeURIComponent(`Post-Exercise Drop`);
            const url = `lifeup://api/reward?type=item&item_id=${itemId}&number=${quantity}&content=${reason}`;
            rewardUrls.push(url);
            totalRewardsGained += quantity;
            scriptLogger(`Generated URL for ${quantity}x "${itemName}" (ID: ${itemId})`);
        } else {
            scriptLogger(`Warning: Could not find ID for item "${itemName}" in main data.`);
        }
    }

    // 5. --- Prepare Output Variables for Tasker ---
    var reward_urls_str = rewardUrls.join('_|_');
    var total_rewards_gained = totalRewardsGained;
    scriptLogger("EXERCISE_REWARDS: Process completed successfully.");

} catch (e) {
    scriptLogger("EXERCISE_REWARDS_ERROR: " + e.message);
}

var js_script_log = taskerLogOutput;
