// --- process_exercise_progression.js (Tasker) ---
// Description: Processes EXP addition for sports statistics progression.
// Input from Tasker:
// - %progression_data: JSON string from gamicraft_progression_data.json.
// - %exercise_id: ID of the exercise receiving EXP (e.g., "push_up").
// - %amount: Amount of EXP to be added.
//
// Output for Tasker:
// - %new_progression_data: JSON string of updated progression data.
// - %js_script_log: Execution log for debugging.
// - %did_level_up: "true" if a level-up occurred, "false" otherwise.

let taskerLogOutput = "";
function scriptLogger(message) {
    // Simple logger for debugging in Tasker
    taskerLogOutput += message + "\n";
}

let progressionData;
let levelUpOccurred = false;

try {
    scriptLogger("EXERCISE_PROC: Script started.");

    // 1. Validate and Parse Input
    if (typeof progression_data !== 'string' || !progression_data.trim()) {
        throw new Error("Input 'progression_data' is empty or invalid.");
    }
    progressionData = JSON.parse(progression_data);

    if (typeof exercise_id !== 'string' || !exercise_id.trim()) {
        throw new Error("Input 'exercise_id' is empty or invalid.");
    }

    const expToAdd = parseInt(amount, 10);
    if (isNaN(expToAdd)) {
        throw new Error(`Input 'amount' (${amount}) is not a valid number.`);
    }

    scriptLogger(`Searching for exercise with ID: ${exercise_id}`);
    const exerciseToUpdate = progressionData.exerciseStatsProgression.find(ex => ex.id === exercise_id);

    if (!exerciseToUpdate) {
        throw new Error(`Exercise with ID '${exercise_id}' not found in progression data.`);
    }

    // 2. Add EXP
    scriptLogger(`Initial data: Level ${exerciseToUpdate.level}, EXP ${exerciseToUpdate.exp}. Adding ${expToAdd} EXP.`);
    exerciseToUpdate.exp += expToAdd;
    scriptLogger(`Data after addition: Level ${exerciseToUpdate.level}, EXP ${exerciseToUpdate.exp}.`);

    // 3. Process Level Up (can occur multiple times in one call)
    let canLevelUp = true;
    while (canLevelUp) {
        const currentLevel = exerciseToUpdate.level;
        
        // EXP Requirement Formula: 10 * (Level * (Level + 1) / 2)
        const expForNextLevel = 10 * (currentLevel * (currentLevel + 1) / 2);
        scriptLogger(`Checking Level Up: Requires ${expForNextLevel} EXP to level up from Lv. ${currentLevel}. Has ${exerciseToUpdate.exp} EXP.`);

        if (exerciseToUpdate.exp >= expForNextLevel) {
            exerciseToUpdate.level++;
            exerciseToUpdate.exp -= expForNextLevel;
            levelUpOccurred = true;
            scriptLogger(`LEVEL UP! Advanced to Level ${exerciseToUpdate.level}. Remaining EXP: ${exerciseToUpdate.exp}.`);
        } else {
            // If EXP is insufficient, stop the level-up check loop
            canLevelUp = false;
        }
    }

    scriptLogger("EXERCISE_PROC: Process completed.");

} catch (e) {
    scriptLogger("EXERCISE_PROC_ERROR: " + e.message);
    // Set progressionData to null so Tasker knows there was an issue
    progressionData = null;
}

// 4. Prepare Output Variables for Tasker
// Only send back new data if there were no errors
var new_progression_data = progressionData ? JSON.stringify(progressionData) : "";
var js_script_log = taskerLogOutput;
var did_level_up = levelUpOccurred; // Will be 'true' or 'false'