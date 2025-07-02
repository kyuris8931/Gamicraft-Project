/*
 * Gamicraft - Merge and Sync New Items
 * Version: 1.0
 *
 * Description:
 * Merges a list of new items into the main item list and updates their
 * null IDs using a JSON array of results gathered from broadcasts.
 *
 * Required Tasker Variables:
 * 1. %item_data_json      -> The main/existing item list JSON string.
 * 2. %new_items_json      -> The original new items JSON string.
 * 3. %sync_results_json   -> A JSON array of {'name': '...', 'id': ...} objects
 * gathered by the broadcast receiver task.
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
    const syncResultsJson = sync_results_json || '[]';

    let mainItems = JSON.parse(mainDataJson);
    let newItems = JSON.parse(newItemsJson);
    const syncResults = JSON.parse(syncResultsJson);

    // Create a Map of Name -> ID for efficient lookup.
    const idMap = new Map(syncResults.map(result => [result.name, result.id]));
    
    // Update IDs in the newItems array first.
    let updatedCount = 0;
    newItems.forEach(item => {
        if (idMap.has(item.name)) {
            item.id = idMap.get(item.name);
            updatedCount++;
        }
    });
    
    log(`Synced ${updatedCount} new item IDs.`);

    // Now, merge the updated new items into the main list.
    // Create a Set of existing names for duplicate checking.
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
