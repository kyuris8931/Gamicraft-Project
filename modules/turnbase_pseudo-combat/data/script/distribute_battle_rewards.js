/*
 * Gamicraft - Distribute Battle Rewards to LifeUp
 * Version: 1.0
 *
 * Description:
 * This script takes the generated rewards from a battle and distributes them to the
 * user via the LifeUp API. It looks up item IDs from the main item list and calls
 * the reward API for each item won using a loop of browseURL(). This script should
 * be run only after rewards have been successfully generated.
 *
 * --- INPUT FROM TASKER ---
 * - %generated_rewards_json: JSON string of the rewards array from the reward generator script.
 * - %item_data_json: The main item list JSON for ID lookups.
 *
 * --- OUTPUT FOR TASKER ---
 * - %js_script_log: Execution log for debugging.
 * - %total_rewards_distributed: The total number of unique reward types distributed.
 */

let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += `[REWARD_DIST] ${message}\n`;
}

// --- MAIN EXECUTION BLOCK ---
try {
    scriptLogger("--- Script Started: Battle Reward Distributor v1.0 ---");

    // 1. --- VALIDATE AND PARSE INPUTS ---
    const rewardsJson = generated_rewards_json || '[]';
    const rewardsToDistribute = JSON.parse(rewardsJson);

    const itemDataJson = item_data_json || '[]';
    const allItems = JSON.parse(itemDataJson);

    if (rewardsToDistribute.length === 0) {
        scriptLogger("No rewards were generated. Nothing to distribute. Exiting.");
        exit();
    }
    if (allItems.length === 0) {
        throw new Error("Main item data (%item_data_json) is empty. Cannot look up IDs.");
    }

    scriptLogger(`Found ${rewardsToDistribute.length} type(s) of rewards to distribute.`);

    // 2. --- CREATE AN EFFICIENT LOOKUP MAP FOR ITEM IDs ---
    const itemMap = new Map(allItems.map(item => [item.name, item.id]));

    let distributedCount = 0;

    // 3. --- LOOP THROUGH EACH REWARD AND CALL THE API ---
    for (const reward of rewardsToDistribute) {
        const itemName = reward.name;
        const quantity = reward.amount || 1;
        const itemId = itemMap.get(itemName);

        // A. Validate that we found an ID for the item
        if (itemId) {
            scriptLogger(`-> Distributing ${quantity}x "${itemName}" (ID: ${itemId}).`);
            
            // B. Construct the LifeUp API URL
            const reason = encodeURIComponent(`Battle Reward Drop`);
            const apiUrl = `lifeup://api/reward?type=item&item_id=${itemId}&number=${quantity}&content=${reason}`;

            // C. Execute the API call immediately
            browseURL(apiUrl);

            distributedCount++;
        } else {
            scriptLogger(`-> WARNING: Could not find an ID for item "${itemName}". Skipping distribution for this item.`);
        }
    }

    scriptLogger(`Process complete. Distributed ${distributedCount} unique reward types.`);
    var total_rewards_distributed = distributedCount;

} catch (e) {
    scriptLogger(`--- SCRIPT CRASHED ---`);
    scriptLogger(`ERROR: ${e.message}`);
    scriptLogger(`STACK: ${e.stack}`);
    var total_rewards_distributed = 0;
}

// --- SET TASKER VARIABLES ---
var js_script_log = taskerLogOutput;