/*
 * Gamicraft - Price Escalation Script for Tasker (v2)
 *
 * Description:
 * This script handles the price escalation mechanism for items purchased in LifeUp.
 * Each time an item is purchased, its price increases by its base cost.
 * If the item is purchased in bulk (>1), the remaining cost that would have been paid
 * if purchased one by one will be applied as a penalty.
 *
 * Input Variables from Tasker (MUST BE SET BEFOREHAND):
 * 1. %item_list -> JSON string containing an array of items to be affected.
 * Example: '[{"item_id": 123, "item_name": "My Item", "base_cost": 50}]'
 * 2. %amount     -> Number of items purchased.
 * 3. %item_id    -> ID of the purchased item.
 *
 * Actions Performed:
 * - Check if the purchased item exists in the list.
 * - Increase the item's price in LifeUp based on the total purchase amount.
 * - Apply a coin penalty calculated from the escalation price difference.
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
    // Ensure these variables are not empty in Tasker to avoid errors
    const itemListJson = item_list || '[]';
    const amountBought = parseInt(amount, 10) || 0;
    const purchasedItemId = parseInt(item_id, 10) || 0;

    if (purchasedItemId === 0) {
        log("Error: %item_id is invalid or empty.");
        exit();
    }

    // 2. Parse JSON and find the purchased item
    const itemList = JSON.parse(itemListJson);
    const targetItem = itemList.find(item => item.item_id === purchasedItemId);

    // 3. If the item is not in the escalation list, exit the script
    if (!targetItem) {
        log(`Item ID ${purchasedItemId} is not in the escalation list. Exiting.`);
        exit();
    }

    // Retrieve item details from the search result
    const baseCost = parseInt(targetItem.base_cost, 10);
    const itemName = targetItem.item_name;

    if (isNaN(baseCost) || baseCost <= 0) {
        log(`Error: base_cost for item '${itemName}' is invalid.`);
        exit();
    }

    // 4. Calculate total price escalation and prepare URL for LifeUp
    // Item price increases by (amount purchased * base cost)
    const totalEscalation = baseCost * amountBought;
    const setPriceUrl = `lifeup://api/item?id=${purchasedItemId}&set_price=${totalEscalation}&set_price_type=relative`;

    // Call URL to increase the item's price
    log(`Increasing price of '${itemName}' by ${totalEscalation} (total for ${amountBought} items).`);
    browseURL(setPriceUrl);

    // 5. Calculate and handle penalty cost for bulk purchases
    if (amountBought > 1) {
        // Calculate penalty cost based on arithmetic series.
        // Formula: penalty = base_cost * (amount * (amount - 1) / 2)
        const penaltyCost = baseCost * (amountBought * (amountBought - 1) / 2);
        const penaltyContent = `Escalation cost penalty for purchasing ${amountBought}x '${itemName}'`;

        if (penaltyCost > 0) {
            const setPenaltyUrl = `lifeup://api/penalty?type=coin&content=${encodeURIComponent(penaltyContent)}&number=${penaltyCost}`;

            // Call URL to apply the penalty
            log(`Applying escalation penalty of ${penaltyCost}.`);
            browseURL(setPenaltyUrl);
        }
    }

    // Notify that the process was successful
    flash(`Price of '${itemName}' has been adjusted.`);

} catch (error) {
    // Handle errors if they occur (e.g., invalid JSON)
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    // Set %errmsg in Tasker for further handling if needed
    setGlobal('errmsg', errorMessage);
}
