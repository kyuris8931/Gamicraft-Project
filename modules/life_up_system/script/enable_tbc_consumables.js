/*
 * Gamicraft - Enable TBC Consumables By Name
 * Version: 2.0 (Dynamic Broadcast Effect Injection)
 *
 * Description:
 * This script enables TBC consumable items by dynamically editing their
 * 'use effect'. Instead of just toggling 'disable_use', it injects a
 * "Web Link" effect (type 9) that points to a unique broadcast URL for
 * each item. This allows Tasker to know exactly which item was used.
 *
 * Required Tasker Variable:
 * 1. %item_data_json -> A JSON string containing the main item list.
 */

// Helper function for logging in Tasker.
const log = (message) => {
    flash(`JS: ${message}`);
};

// Main execution block.
try {
    // 1. Get JSON data from Tasker variable.
    const itemsJson = item_data_json || '[]';
    
    // 2. Parse JSON string into JavaScript array.
    const allItems = JSON.parse(itemsJson);

    // Exit if there is no item data.
    if (!Array.isArray(allItems) || allItems.length === 0) {
        log("Item data is empty or invalid. No items to enable.");
        exit();
    }

    let itemsToEnableCount = 0;

    // 3. Use 'for...of' loop to ensure all items are processed.
    for (const item of allItems) {
        // Check if item meets criteria:
        // category is 'tbc_consumable'
        const isTbcConsumable = item.category === "tbc_consumable";

        if (isTbcConsumable) {
            const itemName = item.name;

            // Make sure item has a name before continuing.
            if (!itemName) {
                log(`Skipping item because it has no name.`);
                continue; // Continue to next item.
            }

            // 4. Create a unique broadcast URL for this item.
            // Format item name to lowercase_with_underscore for consistency.
            const formattedName = itemName.toLowerCase().replace(/ /g, '_');
            const broadcastUrl = `lifeup://api/placeholder?broadcast=app.gamicraft.item.${formattedName}`;

            // 5. Create JSON structure for 'effects' parameter.
            const effectObject = [{
                "type": 9, // Type 9: Web Link
                "info": {
                    "url": broadcastUrl
                }
            }];

            // 6. Convert JSON object to string, then encode for URL safety.
            const effectsJsonString = JSON.stringify(effectObject);
            const effectsParam = `effects=${encodeURIComponent(effectsJsonString)}`;

            // 7. Create API URL to edit item by NAME.
            const nameParam = `name=${encodeURIComponent(itemName)}`;
            const enableUrl = `lifeup://api/item?${nameParam}&${effectsParam}`;

            // 8. Call URL to execute action in LifeUp.
            browseURL(enableUrl);

            itemsToEnableCount++;
        }
    }
} catch (error) {
    // Handle errors, e.g. invalid JSON format.
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
