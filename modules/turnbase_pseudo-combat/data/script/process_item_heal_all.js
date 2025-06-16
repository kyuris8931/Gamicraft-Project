// --- process_item_heal_all.js (Tasker) ---
// Description: Simple script to process the effect of the item 'Heal All 25%'.
// This is a hard-coded implementation for one specific item.
//
// Input from Tasker:
// - %battle_state: JSON string of the current battle_state.
// - %item_name: (Optional) Name of the item for logging, e.g., "Potion of Valor".
//
// Output for Tasker:
// - %battle_state: JSON string of the updated battle_state.
// - %js_script_log: Execution log for debugging.

let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += message + "\n";
}

let bState;
try {
    scriptLogger("ITEM_PROC_HEAL_ALL: Script started.");

    // 1. Validate and Parse Input
    if (typeof battle_state !== 'string' || !battle_state.trim()) {
        throw new Error("Input 'battle_state' is empty or invalid.");
    }
    bState = JSON.parse(battle_state);

    if (!bState.units || !Array.isArray(bState.units)) {
        throw new Error("Invalid battle_state structure, 'units' not found.");
    }

    // Retrieve item name from input or use default name
    const itemName = typeof item_name === 'string' && item_name.trim() ? item_name : "Healing Item";
    const healedUnitsLog = [];

    // 2. Iterate and Apply Heal Effect to all living Allies
    bState.units.forEach(unit => {
        // Effect only applies to 'Ally' whose status is NOT 'Defeated'
        if (unit.type === "Ally" && unit.status !== "Defeated") {
            const healAmount = Math.round(unit.stats.maxHp * 0.25);
            const oldHp = unit.stats.hp;
            
            // Skip healing if HP is already full
            if (oldHp >= unit.stats.maxHp) {
                scriptLogger(`SKIP_HEAL: ${unit.name} already has full HP.`);
                return; // Continue to the next unit in the loop
            }

            // Apply healing, ensure it does not exceed maxHp
            unit.stats.hp = Math.min(unit.stats.maxHp, oldHp + healAmount);
            
            // Calculate the actual amount of healing received
            const actualHealReceived = unit.stats.hp - oldHp; 

            scriptLogger(`HEAL_APPLIED: ${unit.name} healed by ${actualHealReceived} HP (from ${oldHp} to ${unit.stats.hp}).`);
            healedUnitsLog.push(`${unit.name} (+${actualHealReceived} HP)`);
        }
    });

    // 3. Update Battle Message and Last Action Details
    if (healedUnitsLog.length > 0) {
        bState.battleMessage = `${itemName} was used! ${healedUnitsLog.join('. ')}.`;
    } else {
        bState.battleMessage = `${itemName} was used, but all allies' HP were already full.`;
    }

    // Provide details in lastActionDetails for UI rendering if needed
    bState.lastActionDetails = {
        actorId: "SYSTEM_ITEM",
        commandId: "__ITEM_HEAL_ALL__",
        commandName: itemName,
        targets: [], // Targets are global, so can be left empty
        effectsSummary: healedUnitsLog
    };

    scriptLogger("ITEM_PROC_HEAL_ALL: Process completed.");

} catch (e) {
    scriptLogger("ITEM_PROC_HEAL_ALL_ERROR: " + e.message);
    if (!bState) { 
        bState = { 
            battleState: "Error", 
            battleMessage: "Item Script Error: " + e.message 
        }; 
    }
}

// 4. Prepare Output Variables for Tasker
var battle_state = JSON.stringify(bState);
var js_script_log = taskerLogOutput;