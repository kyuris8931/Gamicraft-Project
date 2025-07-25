/*
 * Gamicraft - Edit Item Rarity Colors Script
 * Version: 1.0
 *
 * Description:
 * This script reads a JSON array of item data and edits each corresponding
 * item in LifeUp to set its title color based on its rarity. This should
 * be run AFTER the items have been created.
 *
 * Required Tasker Variable:
 * 1. %new_items_json -> A local variable in Tasker containing the JSON string
 * of the items to be updated.
 */

// Helper function for logging to provide feedback in Tasker.
const log = (message) => {
    flash(`JS: ${message}`);
};

// Main execution block.
try {
    // 1. Define the color mapping for each rarity.
    const rarityColors = {
    common: '#95a5a6',     // Muted Gray 
    uncommon: '#2ecc71',  // Vibrant Green
    rare: '#3498db',       // Bright Blue
    epic: '#9b59b6',       // Majestic Purple
    legendary: '#f1c40f',  // Legendary Gold
    mythic: '#e67e22',     // Fiery Orange (Mythic Flame)
    ethereal: '#e74c3c'    // Ethereal Red
    };

    // 2. Retrieve the JSON data from the Tasker variable.
    const itemsJsonString = new_items_json || '[]';
    const itemsToColor = JSON.parse(itemsJsonString);

    if (!Array.isArray(itemsToColor) || itemsToColor.length === 0) {
        log("No items found to color. Exiting.");
        exit();
    }

    log(`Found ${itemsToColor.length} items to color. Starting process...`);
    let itemsColoredCount = 0;

    // 3. Use a standard synchronous 'for' loop to process each item.
    for (const item of itemsToColor) {

        if (!item.name || !item.rarity) {
            log(`Skipping one item because its 'name' or 'rarity' is missing.`);
            continue; // Move to the next item in the loop.
        }

        // 4. Get the color code based on the item's rarity.
        const colorCode = rarityColors[item.rarity.toLowerCase()];

        // If the rarity doesn't match any defined color, skip this item.
        if (!colorCode) {
            log(`No color defined for rarity "${item.rarity}" on item "${item.name}". Skipping.`);
            continue;
        }

        // 5. Build the API URL to edit the item.
        // We use the item's name to find it and set its title_color_string.
        // The color code's '#' symbol must be URL-encoded to '%23'.
        const nameParam = `name=${encodeURIComponent(item.name)}`;
        const colorParam = `title_color_string=${encodeURIComponent(colorCode)}`;

        const finalApiUrl = `lifeup://api/item?${nameParam}&${colorParam}`;

        log(`Setting color for ${item.name} (${item.rarity})`);
        
        // Execute the API call.
        browseURL(finalApiUrl);
        itemsColoredCount++;
    }
    
    log(`Process complete. Sent color update requests for ${itemsColoredCount} items.`);


} catch (error) {
    // Catch any errors, such as invalid JSON format.
    const errorMessage = `An error occurred: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
