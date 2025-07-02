/*
 * Gamicraft - Advanced Loot Box Generator
 * Version: 1.1 (Robust Optional Variables)
 *
 * Description:
 * This script generates a loot box with complex, tiered probability rules.
 * It handles fixed-rate items, hero rotations, and distributes remaining
 * probability across rarity tiers, giving you precise control over your gacha.
 * This version is more robust in handling optional Tasker variables.
 *
 * Required Tasker Variables:
 * 1. %item_data_json        -> Your main, SYNCED item list JSON.
 * 2. %lootbox_name           -> The name of the loot box item to populate.
 * 3. %lootable_categories    -> Comma-separated categories to include (e.g., "hero,tbc_consumable").
 * 4. %tier_rates_json        -> JSON defining the ABSOLUTE chance for each rarity tier.
 * Example: '{"legendary": 2.5, "epic": 7.5, "rare": 30, "common": 60}'
 *
 * Optional Tasker Variables:
 * 5. %fixed_rate_items_json  -> JSON for items with a specific, fixed drop rate.
 * 6. %rate_up_heroes_json    -> JSON array of hero names for rotation.
 * 7. %rate_up_chance         -> The percentage of a tier's chance dedicated to rate-up items.
 */

const log = (message) => {
    flash(`JS: ${message}`);
};

try {
    // 1. --- Get All Inputs from Tasker ---
    const itemDataJson = item_data_json || '[]';
    const lootboxName = lootbox_name;
    const lootableCategoriesStr = lootable_categories;
    const tierRatesJson = tier_rates_json || '{}';

    // --- FIX: Check if optional variables exist before trying to access them ---
    const fixedRateItemsJson = typeof fixed_rate_items_json !== 'undefined' ? fixed_rate_items_json : '[]';
    const rateUpHeroesJson = typeof rate_up_heroes_json !== 'undefined' ? rate_up_heroes_json : '[]';
    const rateUpChance = typeof rate_up_chance !== 'undefined' ? parseFloat(rate_up_chance) : 0;


    if (!lootboxName || !lootableCategoriesStr || tierRatesJson === '{}') {
        log("Error: Missing required variables (lootbox_name, lootable_categories, or tier_rates_json).");
        exit();
    }

    // 2. --- Parse All Inputs ---
    const allItems = JSON.parse(itemDataJson);
    const lootableCategories = lootableCategoriesStr.split(',').map(cat => cat.trim());
    const tierRates = JSON.parse(tierRatesJson); // e.g., {legendary: 2.5, epic: 7.5, ...}
    const fixedRateItems = JSON.parse(fixedRateItemsJson); // e.g., [{name: "...", percent: 1.25}, ...]
    const rateUpHeroes = JSON.parse(rateUpHeroesJson); // e.g., ["Hero A", "Hero B", ...]

    // 3. --- Initialize Data Structures ---
    const finalLootTable = [];
    const itemPools = { legendary: [], epic: [], rare: [], common: [] };

    // Get all potential items from the specified categories
    const potentialLoot = allItems.filter(item => lootableCategories.includes(item.category));

    // 4. --- Process Fixed Rate Items ---
    for (const fixedItem of fixedRateItems) {
        const item = potentialLoot.find(p => p.name === fixedItem.name);
        if (item && item.id) {
            finalLootTable.push({ "item_id": item.id, "probability": fixedItem.percent });
            // Reduce the available probability for that item's rarity tier
            if (tierRates[item.rarity]) {
                tierRates[item.rarity] -= fixedItem.percent;
            }
            // Mark the item as processed by removing it from the potential loot
            potentialLoot.splice(potentialLoot.indexOf(item), 1);
        }
    }
    
    // 5. --- Process Hero Rotation (Rate-Up) ---
    if (rateUpHeroes.length > 0 && rateUpChance > 0 && tierRates.legendary > 0) {
        const totalRateUpChance = tierRates.legendary * (rateUpChance / 100);
        const chancePerHero = totalRateUpChance / rateUpHeroes.length;

        for (const heroName of rateUpHeroes) {
            const heroItem = potentialLoot.find(p => p.name === heroName);
            if (heroItem && heroItem.id) {
                finalLootTable.push({ "item_id": heroItem.id, "probability": chancePerHero });
                potentialLoot.splice(potentialLoot.indexOf(heroItem), 1);
            }
        }
        // Reduce the legendary tier's probability by the amount used for the rotation
        tierRates.legendary -= totalRateUpChance;
    }

    // 6. --- Populate Pools for Remaining Items ---
    for (const item of potentialLoot) {
        if (item.rarity && itemPools[item.rarity]) {
            itemPools[item.rarity].push(item);
        }
    }

    // 7. --- Calculate and Distribute Probabilities for General Pools ---
    for (const rarity in itemPools) {
        const pool = itemPools[rarity];
        const remainingChanceForTier = tierRates[rarity];
        if (pool.length > 0 && remainingChanceForTier > 0) {
            const chancePerItem = remainingChanceForTier / pool.length;
            for (const item of pool) {
                if (item.id) {
                    finalLootTable.push({ "item_id": item.id, "probability": chancePerItem });
                }
            }
        }
    }

    // 8. --- Final Assembly and API Call ---
    if (finalLootTable.length === 0) {
        log("Could not build a valid loot table. Check item IDs and configurations.");
        exit();
    }

    const effectObject = [{ "type": 7, "info": { "items": finalLootTable } }];
    const effectsJsonString = JSON.stringify(effectObject);
    const effectsParam = `effects=${encodeURIComponent(effectsJsonString)}`;
    const nameParam = `name=${lootboxName}`;
    const finalApiUrl = `lifeup://api/item?${nameParam}&${effectsParam}`;

    log(`Sending advanced loot table update to "${lootboxName}"...`);
    browseURL(finalApiUrl);
    flash(`Loot box "${lootboxName}" has been updated with advanced rates!`);

} catch (error) {
    log(`JavaScript Error: ${error.message}`);
    setLocal('errmsg', errorMessage);
}
