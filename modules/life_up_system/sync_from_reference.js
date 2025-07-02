/*
 * Gamicraft - ID Sync From Reference
 * Version: 1.0
 *
 * Description:
 * This script synchronizes the main item data file using a manually
 * maintained ID reference file. It's a robust and reliable way to
 * ensure all items have the correct ID without complex API queries.
 *
 * Required Tasker Variables:
 * 1. %item_data_json      -> The main, comprehensive item list string.
 * 2. %id_reference_json   -> The simple, manually updated JSON string
 * with name-to-ID mappings.
 *
 * Output Tasker Variable:
 * 1. %synced_item_data -> The final, updated JSON string to be saved.
 */

const log = (message) => {
    flash(`JS: ${message}`);
};

try {
    const mainDataJson = item_data_json || '[]';
    const referenceJson = id_reference_json || '[]';

    const allItems = JSON.parse(mainDataJson);
    const idReferences = JSON.parse(referenceJson);

    if (idReferences.length === 0) {
        log("ID reference file is empty. No sync performed.");
        setLocal('synced_item_data', mainDataJson);
        exit();
    }

    // Create a Map for highly efficient lookups (Name -> ID).
    const idMap = new Map(idReferences.map(ref => [ref.name, ref.id]));
    let updatedCount = 0;

    // Iterate over the main item list and update IDs.
    allItems.forEach(item => {
        if (item.name && idMap.has(item.name)) {
            const correctId = idMap.get(item.name);
            // Only update if the ID is actually different.
            if (item.id !== correctId) {
                item.id = correctId;
                updatedCount++;
            }
        }
    });

    if (updatedCount > 0) {
        log(`Sync complete. Updated ${updatedCount} item IDs.`);
    } else {
        log("Sync check complete. No new IDs to update.");
    }

    // Convert the updated array back to a nicely formatted JSON string.
    const finalJson = JSON.stringify(allItems, null, 2);
    setLocal('synced_item_data', finalJson);

} catch (error) {
    log(`JavaScript Error: ${error.message}`);
    setLocal('errmsg', errorMessage);
}
