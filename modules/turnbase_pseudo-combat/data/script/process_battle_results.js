// // --- process_battle_results.js (Tasker) ---
// // Description: Processes the results of a battle, calculates EXP gains, 

// Input Variables from Tasker:
// - battle_state: JSON string of the current battle state.
// - progression_data: JSON string of the current progression data.

// Output Variables for Tasker:
// - battle_state: JSON string of the updated battle state with battle result summary.
// - new_progression_data_to_save: JSON string of the updated progression data.
// - js_script_log: Execution log for debugging.


let taskerLogOutput = "";
function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[${timestamp}] ${message}\n`;
}

// Log the start of the script
scriptLogger("BATTLE_RESULTS_FINALIZER_V2.2: Script started.");

let bState;
let progressionData;
try {
    // 1. Parse Input & Validate
    if (typeof battle_state !== 'string' || !battle_state.trim()) throw new Error("Input 'battle_state' is empty.");
    if (typeof progression_data !== 'string' || !progression_data.trim()) throw new Error("Input 'progression_data' is empty.");

    bState = JSON.parse(battle_state);
    progressionData = JSON.parse(progression_data);

    // 2. Determine Win Condition & Extract Important Data
    const isWin = bState.battleState === "Win";
    const defeatedEnemiesData = Array.isArray(bState._defeatedEnemiesThisBattle) ? bState._defeatedEnemiesThisBattle : [];
    const enemyGlobalLevel = progressionData.enemyProgression.globalLevel;

    // 3. Initialize Summary Object
    let battleResultSummary = {
        totalExpGained: 0,
        baseExpGained: 0,
        winBonusMultiplier: isWin ? 1.25 : 1,
        defeatedEnemiesWithExp: [],
        rewards: [], // Ensure rewards property is initialized
        heroesProgression: [],
        enemyLeveledUp: false,
        enemyLevelBefore: 0,
        enemyLevelAfter: 0
    };

    // 4. Calculate EXP
    let totalBaseExpGained = 0;
    if (defeatedEnemiesData.length > 0) {
        defeatedEnemiesData.forEach(enemy => {
            const expFromThisEnemy = Math.round(enemyGlobalLevel * 1.25 * (enemy.expValue || 0));
            totalBaseExpGained += expFromThisEnemy;

            const enemyDataFromBstate = bState.units.find(u => u.id === enemy.id) || enemy;
            battleResultSummary.defeatedEnemiesWithExp.push({
                id: enemy.id,
                name: enemyDataFromBstate.name || `Enemy (${enemy.tier || 'N/A'})`,
                expGained: expFromThisEnemy
            });
        });
    }
    battleResultSummary.baseExpGained = totalBaseExpGained;
    const finalHeroExpGained = Math.round(totalBaseExpGained * battleResultSummary.winBonusMultiplier);
    battleResultSummary.totalExpGained = finalHeroExpGained;
    
    // 5. Reward Logic
    if (isWin) {
        try {
            battleResultSummary.rewards.push({
                name: "Mint Candy",
                imageFilename: "items/candy.png",
                quantity: 1 
            });
        } catch (rewardError) {
            scriptLogger(`REWARD_ERROR: Failed to process reward logic. Error: ${rewardError.message}`);
        }
    }
    
    // 6. Process Progression (Heroes & Enemies)
    progressionData.heroes.forEach(hero => {
        const expNeededBefore = 100 * (hero.level * (hero.level + 1) / 2);
        battleResultSummary.heroesProgression.push({ id: hero.id, levelBefore: hero.level, expBefore: hero.exp, expToLevelUpBefore: expNeededBefore });
    });
    progressionData.heroes.forEach(hero => {
        hero.exp += finalHeroExpGained;
        let canLevelUp = true;
        while (canLevelUp) {
            const expForNextLevel = 100 * (hero.level * (hero.level + 1) / 2);
            if (hero.exp >= expForNextLevel) { hero.level++; hero.exp -= expForNextLevel; } else { canLevelUp = false; }
        }
    });
    const enemyProg = progressionData.enemyProgression;
    const enemyLevelBefore = enemyProg.globalLevel;
    battleResultSummary.enemyLevelBefore = enemyLevelBefore;
    const enemyExpChange = isWin ? 25 : -50;
    enemyProg.exp += enemyExpChange;
    while (enemyProg.exp < 0 && enemyProg.globalLevel > 1) { const expOfPreviousLevel = 25 * (enemyProg.globalLevel - 1); enemyProg.globalLevel--; enemyProg.exp += expOfPreviousLevel; }
    if (enemyProg.exp < 0) enemyProg.exp = 0;
    let enemyCanLevelUp = true;
    while(enemyCanLevelUp) { const expForNextEnemyLevel = 25 * enemyProg.globalLevel; if (enemyProg.exp >= expForNextEnemyLevel) { enemyProg.globalLevel++; enemyProg.exp -= expForNextEnemyLevel; } else { enemyCanLevelUp = false; } }
    battleResultSummary.enemyLevelAfter = enemyProg.globalLevel;
    if (battleResultSummary.enemyLevelAfter > enemyLevelBefore) battleResultSummary.enemyLeveledUp = true;
    battleResultSummary.heroesProgression.forEach((heroSummary, index) => {
        const heroAfter = progressionData.heroes[index];
        const expNeededAfter = 100 * (heroAfter.level * (heroAfter.level + 1) / 2);
        heroSummary.levelAfter = heroAfter.level; heroSummary.expAfter = heroAfter.exp; heroSummary.expToLevelUpAfter = expNeededAfter;
    });

    // 7. Inject Summary into bState
    bState.battleResultSummary = battleResultSummary;
    delete bState._defeatedEnemiesThisBattle;

} catch (e) {
    // Log fatal error
    scriptLogger("BATTLE_RESULTS_FATAL_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleResultSummary = { error: `Script crash: ${e.message}` };
}

// 8. Prepare Output Variables for Tasker
var battle_state = JSON.stringify(bState);
var new_progression_data_to_save = JSON.stringify(progressionData);
var js_script_log = taskerLogOutput;