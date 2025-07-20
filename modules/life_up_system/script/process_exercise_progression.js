/*
 * Gamicraft - Dynamic Exercise Progression Processor
 * Version: 3.1 (Exporting EXP)
 *
 * Description:
 * This script now explicitly creates a new Tasker variable '%total_exp_gained'
 * containing the calculated EXP, so it can be passed to subsequent actions.
 *
 * Input from Tasker:
 * - %progression_data: JSON string of the main player progression data.
 * - %stat_mapping_data: JSON string from 'exercise_stat_mapping.json'.
 * - %name: The full name of the exercise card that was used.
 * - %amount: The quantity of the item used.
 *
 * Output for Tasker:
 * - %new_progression_data: Updated JSON string of progression data.
 * - %js_script_log: Execution log for debugging.
 * - %did_level_up: "true" if a level-up occurred.
 * - %leveled_up_stat_name: The name of the stat that leveled up.
 * - %popup_api_url: A ready-to-use LifeUp API URL for a progress or level-up toast.
 * - %total_exp_gained: The total EXP calculated in this script.
 */

let taskerLogOutput = "";
function scriptLogger(message) {
    taskerLogOutput += message + "\n";
}

let progressionData;
let levelUpOccurred = false;
let leveledUpStatName = "";
let popupApiUrl = "";
let totalExpToAdd = 0; // Initialize totalExpToAdd in a broader scope

try {
    scriptLogger("DYN_EXERCISE_PROC: Script started.");

    // 1. --- Validate and Parse Inputs ---
    const progressionJson = progression_data || '[]';
    progressionData = JSON.parse(progressionJson);

    const mappingJson = stat_mapping_data || '[]';
    const statMapping = JSON.parse(mappingJson);

    const usedItemName = name;
    if (!usedItemName) throw new Error("Input '%name' is empty or invalid.");
    scriptLogger(`Processing card: "${usedItemName}"`);

    const itemsUsedAmount = parseInt(amount, 10) || 1;
    scriptLogger(`Amount of items used: ${itemsUsedAmount}`);

    // 2. --- Determine if the item is a processable exercise card ---
    const mapping = statMapping.find(m => usedItemName.includes(m.exercise_card_keyword));
    if (!mapping) {
        scriptLogger(`"${usedItemName}" is not a recognized exercise card. Exiting.`);
        exit();
    }
    const targetExerciseId = mapping.exercise_id;
    scriptLogger(`Found mapping for exercise ID "${targetExerciseId}"`);

    // 3. --- Extract Level and Calculate EXP ---
    const levelMatch = usedItemName.match(/Lv\.\s*(\d+)/);
    if (!levelMatch) throw new Error(`Could not extract level from item name: "${usedItemName}"`);
    const cardLevel = parseInt(levelMatch[1], 10);

    const baseExpPerCard = cardLevel * (cardLevel + 1) / 2;
    totalExpToAdd = baseExpPerCard * itemsUsedAmount; // Assign value to the broader scope variable
    scriptLogger(`Card Level: ${cardLevel}, Total EXP to add: ${totalExpToAdd}`);

    // 4. --- Find Target Stat and Process Level Up ---
    if (!progressionData.exerciseStatsProgression) {
        throw new Error("The 'progression_data' JSON must have an 'exerciseStatsProgression' key.");
    }

    const statToUpdate = progressionData.exerciseStatsProgression.find(stat => stat.id === targetExerciseId);
    if (!statToUpdate) throw new Error(`Exercise with ID '${targetExerciseId}' not found.`);
    
    leveledUpStatName = statToUpdate.stats;
    scriptLogger(`Initial data for ${statToUpdate.stats}: Level ${statToUpdate.level}, EXP ${statToUpdate.exp}. Adding ${totalExpToAdd} EXP.`);
    statToUpdate.exp += totalExpToAdd;

    let canLevelUp = true;
    while (canLevelUp) {
        const currentLevel = statToUpdate.level;
        const expForNextLevel = 10 * currentLevel;
        
        if (statToUpdate.exp >= expForNextLevel) {
            statToUpdate.level++;
            statToUpdate.exp -= expForNextLevel;
            levelUpOccurred = true;
            scriptLogger(`LEVEL UP! ${statToUpdate.stats} advanced to Level ${statToUpdate.level}.`);
        } else {
            canLevelUp = false;
        }
    }

    // 5. --- Generate Thematic Popup URL ---
    let messageTemplate = "";
    let messageText = "";
    const finalLevel = statToUpdate.level;

    if (levelUpOccurred) {
        messageTemplate = mapping.level_up_message || "{stat_name} has reached Lv. {new_level}!";
        messageText = messageTemplate
            .replace('{stat_name}', statToUpdate.stats)
            .replace('{new_level}', finalLevel);
        scriptLogger(`Generated level-up message.`);
    } else {
        const totalExpForNextLevel = 10 * finalLevel;
        const expNeeded = totalExpForNextLevel - statToUpdate.exp;
        messageTemplate = mapping.progress_message || "You need {exp_needed} more EXP.";
        messageText = messageTemplate.replace('{exp_needed}', expNeeded);
        scriptLogger(`Generated progress message.`);
    }
    
    const encodedText = encodeURIComponent(messageText);
    popupApiUrl = `lifeup://api/toast?text=${encodedText}&type=1&isLong=true`;

    scriptLogger("DYN_EXERCISE_PROC: Process completed successfully.");

} catch (e) {
    scriptLogger("DYN_EXERCISE_PROC_ERROR: " + e.message);
    progressionData = null;
}

// 6. --- Prepare Output Variables for Tasker ---
var new_progression_data = progressionData ? JSON.stringify(progressionData) : "";
var js_script_log = taskerLogOutput;
var did_level_up = levelUpOccurred;
var leveled_up_stat_name = levelUpOccurred ? leveledUpStatName : "";
var popup_api_url = popupApiUrl;

// **ADDED:** Explicitly create a Tasker variable with the calculated EXP.
var total_exp_gained = totalExpToAdd;
