/*
 * Gamicraft - Daily Item Reset Script (v2 - ID-Priority)
 *
 * Description:
 * This script resets the owned quantity ('own_number') of all items
 * flagged with "reset_daily": true back to 0. It prioritizes using the
 * item's ID for manipulation, falling back to its name if the ID is unavailable.
 *
 * Required Tasker Variable:
 * 1. %item_data_json -> A JSON string containing the main item list.
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

    // 2. Filter the list to find items flagged for a daily reset.
    const itemsToReset = allItems.filter(item => item.reset_daily === true);

    if (itemsToReset.length === 0) {
        log("No items flagged for daily reset. Nothing to do.");
        exit();
    }

    log(`Found ${itemsToReset.length} daily items to reset.`);
    let itemsResetCount = 0;

    // 3. Loop through the filtered items to reset their quantity.
    for (const item of itemsToReset) {
        let resetUrl = '';
        const itemId = parseInt(item.id, 10);

        // 4. Construct the API URL, prioritizing the item's ID.
        if (!isNaN(itemId) && itemId > 0) {
            log(`Resetting quantity for "${item.name}" using ID: ${itemId}`);
            resetUrl = `lifeup://api/item?id=${itemId}&own_number=0&own_number_type=absolute`;
        } else {
            // Fallback to using the name if ID is null or invalid.
            log(`Item ID for "${item.name}" is null/invalid. Resetting using NAME.`);
            const encodedName = encodeURIComponent(item.name);
            resetUrl = `lifeup://api/item?name=${encodedName}&own_number=0&own_number_type=absolute`;
        }

        // 5. Call the URL to execute the action in LifeUp.
        browseURL(resetUrl);
        itemsResetCount++;
    }

    if (itemsResetCount > 0) {
        flash(`Successfully sent reset requests for ${itemsResetCount} daily items.`);
    }

} catch (error) {
    // Handle any potential errors, like invalid JSON format.
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}