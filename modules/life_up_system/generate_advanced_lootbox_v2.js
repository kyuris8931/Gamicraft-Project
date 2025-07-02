/*
 * Gamicraft - Advanced Loot Box Generator
 * Version: 2.1 (Intelligent Name-to-ID Mapping)
 *
 * Description:
 * This script generates a loot box with two modes:
 * 1. ADVANCED MODE: Uses complex, tiered probability rules based on categories and rarity rates.
 * 2. SPECIFIC MODE: If a specific loot JSON is provided (using 'item_name'), it bypasses
 * all advanced logic, finds the corresponding item ID from the main data, and
 * builds the loot table directly.
 *
 * --- REQUIRED TASKER VARIABLES ---
 * 1. %item_data_json        -> Your main, SYNCED item list JSON.
 * 2. %lootbox_name           -> The name of the loot box item to populate.
 *
 * --- OPTIONAL VARIABLES ---
 * 3. %specific_loot_json     -> (MODE 2) A JSON string defining the exact loot table.
 * If this is present, it will be prioritized over the advanced mode variables.
 * 4. %lootable_categories    -> (MODE 1) Comma-separated categories (e.g., "hero,tbc_consumable").
 * 5. %tier_rates_json        -> (MODE 1) JSON for absolute chance per rarity (e.g., '{"legendary": 2.5, "epic": 7.5}').
 * 6. %fixed_rate_items_json  -> (MODE 1) JSON for items with a fixed drop rate.
 * 7. %rate_up_heroes_json    -> (MODE 1) JSON array of hero names for rotation.
 * 8. %rate_up_chance         -> (MODE 1) Percentage of a tier's chance for rate-up items.
 */

const log = (message) => {
    flash(`JS: ${message}`);
};

try {
    // 1. --- Get All Inputs from Tasker ---
    const itemDataJson = item_data_json || '[]';
    const lootboxName = lootbox_name;
    const specificLootJson = typeof specific_loot_json !== 'undefined' ? specific_loot_json : '[]';

    if (!lootboxName) {
        log("Error: Missing required variable: %lootbox_name.");
        exit();
    }

    const allItems = JSON.parse(itemDataJson);
    let finalLootTable = [];
    let parsedSpecificLoot = [];

    // 2. --- Determine Operating Mode ---
    try {
        parsedSpecificLoot = JSON.parse(specificLootJson);
    } catch (e) {
        parsedSpecificLoot = []; // Fallback to advanced mode if JSON is invalid
    }

    if (Array.isArray(parsedSpecificLoot) && parsedSpecificLoot.length > 0) {
        // --- BRANCH 1: SPECIFIC MODE (with Name-to-ID mapping) ---
        log("Specific loot JSON detected. Mapping names to IDs...");

        // Create a Map for efficient name-to-ID lookups
        const itemMap = new Map(allItems.map(item => [item.name, item.id]));

        for (const lootItem of parsedSpecificLoot) {
            if (!lootItem.item_name) {
                log(`Error: Item in specific_loot_json is missing 'item_name'. Exiting.`);
                exit();
            }

            const foundId = itemMap.get(lootItem.item_name);

            if (foundId) {
                // Construct the final loot table entry with the found ID
                finalLootTable.push({
                    item_id: foundId,
                    amount: lootItem.amount,
                    probability: lootItem.probability,
                    is_fixed_reward: lootItem.is_fixed_reward
                });
            } else {
                log(`Error: Item with name "${lootItem.item_name}" not found in main data. Exiting.`);
                exit();
            }
        }
        log("Successfully built loot table from specific JSON.");

    } else {
        // --- BRANCH 2: ADVANCED MODE ---
        log("No specific loot JSON found. Proceeding with advanced rate calculation.");
        // (The original advanced logic remains here)
        const lootableCategoriesStr = lootable_categories;
        const tierRatesJson = tier_rates_json || '{}';
        const fixedRateItemsJson = typeof fixed_rate_items_json !== 'undefined' ? fixed_rate_items_json : '[]';
        const rateUpHeroesJson = typeof rate_up_heroes_json !== 'undefined' ? rate_up_heroes_json : '[]';
        const rateUpChance = typeof rate_up_chance !== 'undefined' ? parseFloat(rate_up_chance) : 0;

        if (!lootableCategoriesStr || tierRatesJson === '{}') {
            log("Error for Advanced Mode: Missing required variables (%lootable_categories or %tier_rates_json).");
            exit();
        }

        const lootableCategories = lootableCategoriesStr.split(',').map(cat => cat.trim());
        const tierRates = JSON.parse(tierRatesJson);
        const fixedRateItems = JSON.parse(fixedRateItemsJson);
        const rateUpHeroes = JSON.parse(rateUpHeroesJson);
        const itemPools = { legendary: [], epic: [], rare: [], common: [] };
        const potentialLoot = allItems.filter(item => lootableCategories.includes(item.category));

        for (const fixedItem of fixedRateItems) {
            const item = potentialLoot.find(p => p.name === fixedItem.name);
            if (item && item.id) {
                finalLootTable.push({ "item_id": item.id, "amount": fixedItem.amount || 1, "probability": fixedItem.percent, "is_fixed_reward": fixedItem.is_fixed_reward || false });
                if (tierRates[item.rarity] && !fixedItem.is_fixed_reward) {
                    tierRates[item.rarity] -= fixedItem.percent;
                }
                potentialLoot.splice(potentialLoot.indexOf(item), 1);
            }
        }

        if (rateUpHeroes.length > 0 && rateUpChance > 0 && tierRates.legendary > 0) {
            const totalRateUpChance = tierRates.legendary * (rateUpChance / 100);
            const chancePerHero = totalRateUpChance / rateUpHeroes.length;
            for (const heroName of rateUpHeroes) {
                const heroItem = potentialLoot.find(p => p.name === heroName);
                if (heroItem && heroItem.id) {
                    finalLootTable.push({ "item_id": heroItem.id, "amount": 1, "probability": chancePerHero, "is_fixed_reward": false });
                    potentialLoot.splice(potentialLoot.indexOf(heroItem), 1);
                }
            }
            tierRates.legendary -= totalRateUpChance;
        }

        for (const item of potentialLoot) {
            if (item.rarity && itemPools[item.rarity]) {
                itemPools[item.rarity].push(item);
            }
        }

        for (const rarity in itemPools) {
            const pool = itemPools[rarity];
            const remainingChanceForTier = tierRates[rarity];
            if (pool.length > 0 && remainingChanceForTier > 0) {
                const chancePerItem = remainingChanceForTier / pool.length;
                for (const item of pool) {
                    if (item.id) {
                        finalLootTable.push({ "item_id": item.id, "amount": 1, "probability": chancePerItem, "is_fixed_reward": false });
                    }
                }
            }
        }
    }

    // 3. --- Final Assembly and API Call ---
    if (finalLootTable.length === 0) {
        log("Could not build a valid loot table. Check configurations.");
        exit();
    }

    const effectObject = [{ "type": 7, "info": { "items": finalLootTable } }];
    const effectsJsonString = JSON.stringify(effectObject);
    const effectsParam = `effects=${encodeURIComponent(effectsJsonString)}`;
    const nameParam = `name=${encodeURIComponent(lootboxName)}`;
    const finalApiUrl = `lifeup://api/item?${nameParam}&${effectsParam}`;

    log(`Sending loot table update to "${lootboxName}"...`);
    browseURL(finalApiUrl);
    flash(`Loot box "${lootboxName}" has been updated!`);

} catch (error) {
    log(`JavaScript Error: ${error.message}`);
    setLocal('errmsg', error.message);
}