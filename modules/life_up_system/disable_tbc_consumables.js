/*
 * Gamicraft - Disable TBC Consumables By Name
 * Version: 1.0
 *
 * Description:
 * This script disables all LifeUp items that are categorized as 
 * 'tbc_consumable'. It identifies the items to disable by their NAME,
 * which is crucial when item IDs are not yet assigned.
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
        log("Item data is empty or invalid. No items to disable.");
        exit();
    }

    let itemsToDisableCount = 0;

    // 3. Loop through each item in the data.
    allItems.forEach(item => {
        // Check if item meets criteria:
        // category is 'tbc_consumable'
        const isTbcConsumable = item.category === "tbc_consumable";

        if (isTbcConsumable) {
            const itemName = item.name;

            // Make sure item name exists before proceeding.
            if (!itemName) {
                log(`Skipping item because it has no name.`);
                return; // Continue to next item.
            }
            

            // 4. Build API URL to disable item by NAME.
            // Item name needs to be encoded to handle spaces or special characters.
            const nameParam = `name=${encodeURIComponent(itemName)}`;
            const disableUrl = `lifeup://api/item?${nameParam}&disable_use=true`;

            // 5. Call URL to execute action in LifeUp.
            browseURL(disableUrl);

            itemsToDisableCount++;
        }
    });
    
} catch (error) {
    // Handle errors, e.g., invalid JSON format.
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
