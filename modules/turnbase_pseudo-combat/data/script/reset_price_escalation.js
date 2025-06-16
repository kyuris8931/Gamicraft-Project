/*
 * Gamicraft - Price Reset Script for Tasker
 *
 * Description:
 * This script resets the price of all items listed in %item_list
 * back to their base cost. This is useful for daily or weekly resets.
 *
 * Input Variables from Tasker (MUST BE SET BEFOREHAND):
 * 1. %item_list -> JSON string containing an array of items whose prices will be reset.
 * Example: '[{"item_id": 123, "base_cost": 50}, {"item_id": 456, "base_cost": 30}]'
 *
 * Actions Performed:
 * - Iterates through each item in the list.
 * - Sets the price of each item in LifeUp back to its base cost.
 */

// --- HELPER FUNCTIONS ---

// Function for logging to Tasker (optional, for debugging)
const log = (message) => {
    // You can use flash() or write to a log file in Tasker
    flash(`JS LOG: ${message}`);
};

// --- MAIN EXECUTION ---

try {
    // 1. Retrieve and validate variables from Tasker
    // These variables are directly available in the JavaScriptlet scope (in lowercase)
    const itemListJson = item_list || '[]';
    
    // 2. Parse JSON
    const itemList = JSON.parse(itemListJson);

    // Ensure itemList is an array and not empty
    if (!Array.isArray(itemList) || itemList.length === 0) {
        log("Item list is empty or invalid. No actions performed.");
        exit();
    }

    let itemsResetCount = 0;

    // 3. Iterate through each item and reset its price
    itemList.forEach(item => {
        const itemId = parseInt(item.item_id, 10);
        const baseCost = parseInt(item.base_cost, 10);

        // Proceed only if ID and base cost are valid
        if (!isNaN(itemId) && itemId > 0 && !isNaN(baseCost)) {
            // Create URL to set the absolute price.
            // Not using set_price_type, as the default is absolute.
            const setPriceUrl = `lifeup://api/item?id=${itemId}&set_price=${baseCost}`;

            // Call the URL to reset the item's price
            browseURL(setPriceUrl);
            itemsResetCount++;
        } else {
            log(`Skipping item due to invalid ID or base_cost: ${JSON.stringify(item)}`);
        }
    });

    // Notify that the process was successful
    if (itemsResetCount > 0) {
        flash(`${itemsResetCount} item prices have been reset.`);
    } else {
        flash("No item prices were reset.");
    }

} catch (error) {
    // Handle errors if they occur (e.g., invalid JSON)
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    // Set local variable %errmsg in Tasker for further handling if needed
    setLocal('errmsg', errorMessage);
}
