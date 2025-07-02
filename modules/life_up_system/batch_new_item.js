/*
 * Gamicraft - Batch Add New Items Script
 * Version: 2.6 (Duplicate Check)
 *
 * Description:
 * This script reads a JSON array of new item data and programmatically
 * creates each item in LifeUp. It now checks against a main item list
 * to prevent creating items that already exist by name.
 *
 * Required Tasker Variables:
 * 1. %new_items_json    -> JSON string of the new items to be created.
 * 2. %item_data_json -> JSON string of the main/existing item list.
 */

// Helper function for logging to provide feedback in Tasker.
const log = (message) => {
    flash(`JS: ${message}`);
};

// Main execution block.
try {
    // 1. Retrieve the JSON data from Tasker variables.
    const newItemsJson = new_items_json || '[]';
    const mainItemsJson = item_data_json || '[]';
    
    const newItems = JSON.parse(newItemsJson);
    const mainItems = JSON.parse(mainItemsJson);

    if (!Array.isArray(newItems) || newItems.length === 0) {
        log("No new items found to process. Exiting.");
        exit();
    }
    
    // 2. Create a Set of existing item names for efficient lookup.
    // This is much faster than searching the array in every loop iteration.
    const existingItemNames = new Set(mainItems.map(item => item.name));

    log(`Found ${newItems.length} new items. Checking against ${existingItemNames.size} existing items...`);
    let itemsCreatedCount = 0;
    let itemsSkippedCount = 0;

    // 3. Use a standard synchronous 'for' loop.
    for (const item of newItems) {
        if (!item.name) {
            log(`Skipping one item because its 'name' is missing.`);
            itemsSkippedCount++;
            continue;
        }

        // 4. Check if an item with the same name already exists.
        if (existingItemNames.has(item.name)) {
            log(`Skipping "${item.name}" because it already exists.`);
            itemsSkippedCount++;
            continue; // Move to the next item.
        }

        // --- If the item does not exist, proceed with creation ---

        let effectObject;

        if (item.broadcast === true) {
            const formattedName = item.name.toLowerCase().replace(/ /g, '_');
            const broadcastUrl = `lifeup://api/placeholder?broadcast=app.gamicraft.item.${formattedName}`;
            effectObject = [{ "type": 9, "info": { "url": broadcastUrl } }];
        } else {
            effectObject = [{ "type": 1, "info": {} }];
        }

        const params = [
            `name=${item.name || ''}`,
            `desc=${item.description || ''}`,
            `icon=${item.icon || ''}`
        ];

        const effectsJsonString = JSON.stringify(effectObject);
        params.push(`effects=${encodeURIComponent(effectsJsonString)}`);

        if (typeof item.price === 'number' && item.price > 0) {
            params.push(`price=${item.price}`);
        } else {
            params.push(`disable_purchase=true`);
        }

        const finalApiUrl = `lifeup://api/add_item?${params.join('&')}`;

        log(`Creating: ${item.name}`);
        browseURL(finalApiUrl);
        itemsCreatedCount++;
    }
    
    log(`Process complete. Created: ${itemsCreatedCount}. Skipped: ${itemsSkippedCount}.`);


} catch (error) {
    const errorMessage = `An error occurred: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
