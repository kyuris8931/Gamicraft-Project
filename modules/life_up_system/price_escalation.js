/*
 * Gamicraft - Price Escalation Script (v7 - ID-Priority Manipulation)
 *
 * Description:
 * This script handles price escalation with maximum reliability.
 * It finds an item using a hybrid ID/Name search. For manipulating the
 * item in LifeUp, it prioritizes using the item's ID if available and
 * valid, falling back to the item's name only when necessary.
 *
 * Input Variables from Tasker:
 * 1. %item_data_json -> JSON string of the entire main item list.
 * 2. %amount          -> Number of items purchased.
 * 3. %name            -> NAME of the purchased item.
 * 4. %item_id         -> ID of the purchased item from LifeUp's event.
 */

const log = (message) => {
    // Helper function for logging feedback in Tasker.
    flash(`JS: ${message}`);
};

try {
    // 1. Retrieve all variables from Tasker.
    const itemDataJson = item_data_json || '[]';
    const amountBought = parseInt(amount, 10) || 0;
    const purchasedItemName = name;
    const purchasedItemIdFromEvent = parseInt(item_id, 10) || 0;

    if (!purchasedItemName) {
        log("Error: %name variable is missing.");
        exit();
    }
    if (amountBought === 0) {
        log("Error: Purchase amount is zero. No escalation needed.");
        exit();
    }

    const allItems = JSON.parse(itemDataJson);
    let purchasedItem = null;

    // 2. Find the item in the local JSON. Try by ID first.
    if (purchasedItemIdFromEvent > 0) {
        purchasedItem = allItems.find(item => item.id === purchasedItemIdFromEvent);
    }

    // 3. If not found by ID, fall back to searching by name.
    if (!purchasedItem) {
        log(`Item not found by ID. Falling back to search by NAME: "${purchasedItemName}"`);
        purchasedItem = allItems.find(item => item.name === purchasedItemName);
    }

    // 4. Check if the item was found and is flagged for escalation.
    if (!purchasedItem) {
        log(`Item "${purchasedItemName}" could not be found in the main list. Exiting.`);
        exit();
    }
    if (purchasedItem.escalation !== true) {
        log(`Item "${purchasedItemName}" is not flagged for escalation. Exiting.`);
        exit();
    }

    log(`Item found in JSON: "${purchasedItem.name}".`);

    // 5. Proceed with escalation logic.
    const baseCost = parseInt(purchasedItem.price, 10);
    if (isNaN(baseCost) || baseCost <= 0) {
        log(`Error: Invalid base price for escalating item "${purchasedItemName}".`);
        exit();
    }

    const totalEscalation = baseCost * amountBought;
    let setPriceUrl = '';

    // 6. Construct the API URL. Prioritize using the item's ID if it's valid in our JSON.
    const itemIdFromJSON = parseInt(purchasedItem.id, 10);
    if (!isNaN(itemIdFromJSON) && itemIdFromJSON > 0) {
        log(`Manipulating LifeUp using item ID: ${itemIdFromJSON}`);
        setPriceUrl = `lifeup://api/item?id=${itemIdFromJSON}&set_price=${totalEscalation}&set_price_type=relative`;
    } else {
        // Fallback to using the name if the ID in our JSON is null or invalid.
        log(`Item ID is null/invalid in JSON. Manipulating LifeUp using item NAME.`);
        const encodedName = encodeURIComponent(purchasedItemName);
        setPriceUrl = `lifeup://api/item?name=${encodedName}&set_price=${totalEscalation}&set_price_type=relative`;
    }

    browseURL(setPriceUrl);

    // 7. Calculate and apply penalty for bulk purchases.
    if (amountBought > 1) {
        const penaltyCost = baseCost * (amountBought * (amountBought - 1) / 2);
        const penaltyContent = `Escalation cost for buying ${amountBought}x "${purchasedItemName}"`;

        if (penaltyCost > 0) {
            const setPenaltyUrl = `lifeup://api/penalty?type=coin&content=${encodeURIComponent(penaltyContent)}&number=${penaltyCost}`;
            log(`Applying bulk purchase penalty of ${penaltyCost}.`);
            browseURL(setPenaltyUrl);
        }
    }

    flash(`Price for "${purchasedItemName}" has been escalated.`);

} catch (error) {
    const errorMessage = `JavaScript Error: ${error.message}`;
    log(errorMessage);
    setLocal('errmsg', errorMessage);
}
