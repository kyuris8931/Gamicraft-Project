/*
 * Gamicraft - Price Escalation Reset Script (v4 - ID-Priority)
 *
 * Description:
 * This script resets the price of all items flagged with "escalation": true
 * back to their base price. It prioritizes using the item's ID for manipulation
 * for maximum accuracy, falling back to its name only when the ID is unavailable.
 *
 * Input Variables from Tasker:
 * 1. %item_data_json -> JSON string of the entire main item list.
 */

const log = (message) => {
    // Helper function for logging feedback in Tasker.
    flash(`JS: ${message}`);
};

try {
    // 1. Retrieve and parse the main item list from Tasker.
    const itemDataJson = item_data_json || '[]';
    const allItems = JSON.parse(itemDataJson);

    if (!Array.isArray(allItems) || allItems.length === 0) {
        log("Main item list is empty or invalid. Exiting.");
        exit();
    }

    // 2. Filter the list to get only items flagged for price escalation.
    const itemsToReset = allItems.filter(item => item.escalation === true);

    if (itemsToReset.length === 0) {
        log("No items flagged for escalation. No prices to reset.");
        exit();
    }

    log(`Found ${itemsToReset.length} escalation items to reset.`);
    let itemsResetCount = 0;

    // 3. Loop through the filtered items and reset their price.
    for (const item of itemsToReset) {
        const basePrice = parseInt(item.price, 10);
        let resetUrl = '';

        // Proceed only if base price is a valid number.
        if (isNaN(basePrice)) {
            log(`Skipping item "${item.name}" due to invalid base price.`);
            continue;
        }

        const itemId = parseInt(item.id, 10);

        // 4. Construct the API URL. Prioritize using the item's ID if valid.
        if (!isNaN(itemId) && itemId > 0) {
            log(`Resetting price for "${item.name}" using ID: ${itemId}`);
            // The API sets the price to an absolute value by default.
            resetUrl = `lifeup://api/item?id=${itemId}&set_price=${basePrice}`;
        } else {
            // Fallback to using the name if the ID is null or invalid.
            log(`Item ID for "${item.name}" is null/invalid. Resetting using NAME.`);
            const encodedName = encodeURIComponent(item.name);
            resetUrl = `lifeup://api/item?name=${encodedName}&set_price=${basePrice}`;
        }

        // 5. Call the URL to execute the action in LifeUp.
        browseURL(resetUrl);
        itemsResetCount++;
    }

    if (itemsResetCount > 0) {
        flash(`Successfully sent reset requests for ${itemsResetCount} item prices.`);
    }

} catch (error) {
    // Handle any potential errors, like invalid JSON format.
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
