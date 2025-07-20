/*
 * Gamicraft - Generate Add Item URLs
 * Version: 3.1 (Robust Array Method)
 *
 * Description:
 * Reads a list of new items and generates a Tasker array of ready-to-use API URLs.
 * This version uses a custom delimiter (_|_) to ensure Tasker can reliably
 * split the output into an array, solving issues with long or complex URLs.
 *
 * Required Tasker Variable:
 * 1. %new_items_json -> JSON string of the new items to be added.
 *
 * Output Tasker Variable:
 * 1. %api_urls_str -> A string with URLs separated by '_|_'. You MUST use
 * the 'Variable Split' action in Tasker on this variable to create the array.
 */

const log = (message) => {
    flash(`JS: ${message}`);
};

try {
    const newItemsJson = new_items_json || '[]';
    const newItems = JSON.parse(newItemsJson);

    if (!Array.isArray(newItems) || newItems.length === 0) {
        log("No new items found to process.");
        exit();
    }

    const urls = [];
    const broadcastAction = 'app.gamicraft.item.created';
    // A custom, safe delimiter that won't appear in the URLs.
    const delimiter = '_|_';

    for (const item of newItems) {
        if (!item.name) {
            log("Skipping an item because it has no name.");
            continue;
        }

        // --- Build the parameter list dynamically ---
        const params = [];

        // Basic Info - ALWAYS ENCODE THESE
        params.push(`name=${encodeURIComponent(item.name)}`);
        params.push(`desc=${encodeURIComponent(item.description || '')}`);
        params.push(`icon=${encodeURIComponent(item.icon || '')}`);
        params.push(`broadcast=${broadcastAction}`);

        // Price
        if (typeof item.price === 'number' && item.price > 0) {
            params.push(`price=${item.price}`);
        } else {
            params.push(`disable_purchase=true`);
        }

        // --- Dynamic Effects ---
        let effectObject;
        if (item.broadcast === true) {
            const formattedName = item.name.toLowerCase().replace(/ /g, '_');
            const broadcastUrl = `lifeup://api/placeholder?broadcast=app.gamicraft.item.use.${formattedName}`;
            effectObject = [{ "type": 9, "info": { "url": broadcastUrl } }];
        } else {
            effectObject = [{ "type": 1, "info": {} }];
        }
        
        const effectsJsonString = JSON.stringify(effectObject);
        params.push(`effects=${encodeURIComponent(effectsJsonString)}`);
        
        // --- Construct the final URL ---
        const finalApiUrl = `lifeup://api/add_item?${params.join('&')}`;
        
        urls.push(finalApiUrl);
    }

    log(`Generated ${urls.length} complete API URLs.`);
    
    // Set the Tasker variable using the custom delimiter.
    setLocal('api_urls_str', urls.join(delimiter));

} catch (error) {
    log(`JavaScript Error: ${error.message}`);
    setLocal('errmsg', errorMessage);
}
