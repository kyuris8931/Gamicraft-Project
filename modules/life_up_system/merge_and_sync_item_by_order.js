/*
 * Gamicraft - Merge and Sync by Order
 * Version: 1.3 (Single String Variable Fix)
 *
 * Description:
 * Merges a list of new items into the main item list and updates their
 * null IDs. This version is specifically designed to work with a single,
 * comma-separated string of IDs, which is a reliable method for passing
 * data between different Tasker tasks and profiles.
 *
 * Required Tasker Variables:
 * 1. %item_data_json  -> The main/existing item list JSON string.
 * 2. %new_items_json  -> The original new items JSON string.
 * 3. %received_ids    -> A SINGLE, LOCAL, comma-separated string of item IDs
 * (e.g., "101,102,103").
 *
 * Output Tasker Variable:
 * 1. %final_item_data -> The final, merged, and synced JSON string.
 */

const log = (message) => {
    flash(`JS: ${message}`);
};

try {
    const mainDataJson = item_data_json || '[]';
    const newItemsJson = new_items_json || '[]';
    // This variable is now expected to be a simple string like "101,102,103"
    const receivedIdsStr = received_ids || '';

    let mainItems = JSON.parse(mainDataJson);
    let newItems = JSON.parse(newItemsJson);
    // Split the string into a JavaScript array.
    // The .filter(id => id) removes any potential empty strings if the
    // input string is empty or ends with a comma.
    const receivedIds = receivedIdsStr.split(',').filter(id => id);

    if (newItems.length === 0) {
        log("No new items to process.");
        setLocal('final_item_data', mainDataJson);
        exit();
    }

    // --- Core Logic: Sync IDs by Order ---
    if (newItems.length !== receivedIds.length) {
        log(`Warning: Mismatch! Found ${newItems.length} new items but received ${receivedIds.length} IDs. Sync may be inaccurate.`);
    } else {
        log(`Received ${receivedIds.length} IDs to sync with ${newItems.length} new items.`);
    }

    let updatedCount = 0;
    newItems.forEach((item, index) => {
        // Assign the ID from the received list at the same position.
        if (receivedIds[index]) {
            const newId = parseInt(receivedIds[index], 10);
            if (!isNaN(newId)) {
                item.id = newId;
                updatedCount++;
            }
        }
    });

    log(`Synced IDs for ${updatedCount} items based on sequence.`);

    // --- Merge Logic ---
    const existingNames = new Set(mainItems.map(item => item.name));
    let addedCount = 0;
    
    newItems.forEach(newItem => {
        if (newItem.name && !existingNames.has(newItem.name)) {
            mainItems.push(newItem);
            addedCount++;
        }
    });

    log(`Added ${addedCount} new items to the main list.`);

    const finalJson = JSON.stringify(mainItems, null, 2);
    setLocal('final_item_data', finalJson);

} catch (error) {
    log(`JavaScript Error: ${error.message}`);
    setLocal('errmsg', errorMessage);
}
