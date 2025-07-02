/*
 * Gamicraft - Dynamic Loot Box Content Generator
 * Version: 2.0
 *
 * Description:
 * This is a flexible script that dynamically populates any specified loot box item.
 * It reads the main item list, filters items based on one or more categories,
 * calculates probabilities based on rarity, and updates the target loot box in LifeUp.
 *
 * Required Tasker Variables:
 * 1. %item_data_json      -> A JSON string of the entire main item list.
 * This list MUST contain valid, non-null IDs for the items to be included.
 * 2. %lootbox_name         -> The name of the loot box item you want to populate.
 * 3. %lootable_categories  -> A comma-separated string of item categories to include
 * in the loot box (e.g., "tbc_consumable" or "hero,ascension_material").
 */

const log = (message) => {
    // Helper function for logging feedback in Tasker.
    flash(`JS: ${message}`);
};

try {
    // --- CONFIGURATION ---
    // Rarity-to-probability weight mapping.
    const rarityWeights = {
        common: 27,
        rare: 9,
        epic: 3,
        legendary: 1
    };
    // --- END CONFIGURATION ---

    // 1. Get and validate the required variables from Tasker.
    const itemDataJson = item_data_json || '[]';
    const lootboxName = lootbox_name;
    const lootableCategoriesStr = lootable_categories;

    if (!lootboxName || !lootableCategoriesStr) {
        log("Error: %lootbox_name or %lootable_categories variable is missing. Exiting.");
        exit();
    }
    
    log(`Starting process for loot box: "${lootboxName}"`);

    // 2. Parse the item data and the categories string.
    const allItems = JSON.parse(itemDataJson);
    const lootableCategories = lootableCategoriesStr.split(',').map(cat => cat.trim());

    if (!Array.isArray(allItems) || allItems.length === 0) {
        log("Main item list is empty or invalid. Exiting.");
        exit();
    }
    
    log(`Filtering for categories: [${lootableCategories.join(', ')}]`);

    // 3. Filter items that match any of the lootable categories.
    const lootableItems = allItems.filter(item => lootableCategories.includes(item.category));

    if (lootableItems.length === 0) {
        log(`No items found matching the specified categories.`);
        exit();
    }
    
    log(`Found ${lootableItems.length} potential items for the loot table.`);

    // 4. Build the loot table array with weighted probabilities.
    const lootTable = [];
    for (const item of lootableItems) {
        const itemId = parseInt(item.id, 10);
        const rarity = item.rarity;

        // Ensure the item has a valid ID and its rarity is defined in the weights.
        if (!isNaN(itemId) && itemId > 0 && rarityWeights[rarity]) {
            lootTable.push({
                "item_id": itemId,
                "amount": 1, // Each item is rewarded in a quantity of 1.
                "probability": rarityWeights[rarity]
            });
        } else {
            log(`Skipping item "${item.name}" due to invalid ID or rarity.`);
        }
    }

    if (lootTable.length === 0) {
        log("Could not build a valid loot table. Check item IDs and rarities.");
        exit();
    }

    // 5. Build the final JSON 'effects' object for the API call.
    // Effect type 7 is for "Open Box".
    const effectObject = [{
        "type": 7,
        "info": {
            "items": lootTable
        }
    }];

    // 6. Convert the effects object to a string and URL-encode it.
    const effectsJsonString = JSON.stringify(effectObject);
    const effectsParam = `effects=${encodeURIComponent(effectsJsonString)}`;

    // 7. Construct the final API URL to edit the loot box by its NAME.
    const nameParam = `name=${lootboxName}`;
    const finalApiUrl = `lifeup://api/item?${nameParam}&${effectsParam}`;

    // 8. Call the URL to execute the update in LifeUp.
    log(`Sending update to LifeUp for "${lootboxName}"...`);
    browseURL(finalApiUrl);

    flash(`Loot box "${lootboxName}" has been successfully updated!`);

} catch (error) {
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
