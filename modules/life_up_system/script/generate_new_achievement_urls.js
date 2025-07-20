/*
 * Gamicraft - Generate Achievement URLs
 * Version: 1.0
 *
 * Description:
 * This script reads a JSON file containing definitions for new achievements
 * and their corresponding synthesis formula rewards. It dynamically constructs
 * the 'lifeup://api/achievement' URL for each entry, ready to be executed by Tasker.
 * It intelligently finds the required item IDs from the main item data file.
 *
 * Required Tasker Variables:
 * 1. %add_achievement_data -> JSON string from your configuration file (e.g., add_achievement_event.json).
 * 2. %item_data_json       -> JSON string of the entire main item list, used for ID lookups.
 *
 * Output Tasker Variable:
 * 1. %api_urls_str -> A single string containing all generated URLs, separated by '_|_'.
 */

const log = (message) => {
    // Helper function for logging feedback in Tasker.
    flash(`JS: ${message}`);
};

try {
    // 1. --- Get and parse input data ---
    const addAchievementJson = add_achievement_data || '[]';
    const itemDataJson = item_data_json || '[]';

    const achievementsToCreate = JSON.parse(addAchievementJson);
    const allItems = JSON.parse(itemDataJson);

    if (!Array.isArray(achievementsToCreate) || achievementsToCreate.length === 0) {
        log("No new achievements to process. Exiting.");
        exit();
    }

    if (!Array.isArray(allItems) || allItems.length === 0) {
        log("Error: Main item list is empty. Cannot look up item IDs. Exiting.");
        exit();
    }

    // 2. --- Create a Map for efficient name-to-ID lookups ---
    const itemMap = new Map(allItems.map(item => [item.name, item.id]));
    log(`Created item map with ${itemMap.size} entries for quick ID lookup.`);

    const urls = [];
    const broadcastAction = 'app.gamicraft.achievement.created';
    const delimiter = '_|_';

    // 3. --- Loop through each achievement definition ---
    for (const achievement of achievementsToCreate) {
        const params = [];

        // --- Basic Info ---
        if (!achievement.achievement_name) {
            log("Skipping an entry because 'achievement_name' is missing.");
            continue;
        }
        params.push(`name=${encodeURIComponent(achievement.achievement_name)}`);
        params.push(`desc=${encodeURIComponent(achievement.achievement_desc || '')}`);
        params.push(`secret=${achievement.is_secret || false}`);

        // --- Rewards ---
        // Dynamically add any rewards defined in the 'rewards' object (e.g., coin, exp).
        if (achievement.rewards && typeof achievement.rewards === 'object') {
            for (const key in achievement.rewards) {
                params.push(`${key}=${achievement.rewards[key]}`);
            }
        }

        // --- Unlock Condition ---
        const condition = achievement.unlock_condition;
        if (condition && condition.track_item_name) {
            const trackItemId = itemMap.get(condition.track_item_name);

            if (!trackItemId) {
                log(`Error: Could not find item ID for "${condition.track_item_name}". Skipping this achievement.`);
                continue;
            }

            const conditions_obj = [{
                type: condition.type,
                related_id: trackItemId,
                target: condition.target
            }];

            const conditions_json_str = JSON.stringify(conditions_obj);
            params.push(`conditions_json=${encodeURIComponent(conditions_json_str)}`);
        } else {
            log(`Warning: Achievement "${achievement.achievement_name}" has no valid unlock condition.`);
        }

        // --- Add Broadcast for ID Receiver ---
        params.push(`broadcast=${broadcastAction}`);

        // --- Add category_id if provided ---
        params.push(`category_id=${achievement.category_id || 1}`);

        // --- Construct the final URL ---
        const finalApiUrl = `lifeup://api/achievement?${params.join('&')}`;
        urls.push(finalApiUrl);
    }

    // 4. --- Set the final output variable for Tasker ---
    if (urls.length > 0) {
        log(`Generated ${urls.length} complete API URLs.`);
        setLocal('api_urls_str', urls.join(delimiter));
    } else {
        log("Process finished, but no valid URLs were generated.");
    }

} catch (error) {
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
