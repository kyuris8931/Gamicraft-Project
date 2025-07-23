/*
 * Gamicraft - Battle Progression Finalizer
 * Version: 2.4 (Role-Focused)
 *
 * Description:
 * Processes battle results, focusing ONLY on EXP calculation and hero/enemy progression.
 * It creates the battleResultSummary structure and exports the necessary data
 * for the separate reward generation script.
 *
 * --- INPUT FROM TASKER ---
 * - battle_state: JSON string of the current battle state.
 * - progression_data: JSON string of the current progression data.
 *
 * --- OUTPUT FOR TASKER ---
 * - battle_state: JSON string with an updated battleResultSummary (rewards array is empty).
 * - new_progression_data_to_save: JSON string of the updated progression data.
 * - total_exp_gained: The final total EXP gained by the heroes.
 * - enemy_global_level: The enemy global level BEFORE the battle ended.
 * - js_script_log: Execution log for debugging.
 */

let taskerLogOutput = "";
function scriptLogger(message) {
    const now = new Date();
    const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    taskerLogOutput += `[BATTLE_PROG] ${message}\n`;
}

scriptLogger("BATTLE_PROGRESSION_FINALIZER_V2.4: Script started.");

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

    // 3. Initialize Summary Object (rewards intentionally left empty)
    let battleResultSummary = {
        totalExpGained: 0,
        baseExpGained: 0,
        winBonusMultiplier: isWin ? 1.25 : 1,
        defeatedEnemiesWithExp: [],
        rewards: [], // Dibiarkan kosong, akan diisi oleh skrip generate_battle_rewards.js
        heroesProgression: [],
        enemyLeveledUp: false,
        enemyLevelBefore: enemyGlobalLevel,
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
    
    // 5. Process Progression (Heroes & Enemies)
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
    
    const enemyExpChange = isWin ? 25 : -50;
    enemyProg.exp += enemyExpChange;
    while (enemyProg.exp < 0 && enemyProg.globalLevel > 1) { const expOfPreviousLevel = 25 * (enemyProg.globalLevel - 1); enemyProg.globalLevel--; enemyProg.exp += expOfPreviousLevel; }
    if (enemyProg.exp < 0) enemyProg.exp = 0;
    let enemyCanLevelUp = true;
    while(enemyCanLevelUp) { const expForNextEnemyLevel = 25 * enemyProg.globalLevel; if (enemyProg.exp >= expForNextEnemyLevel) { enemyProg.globalLevel++; enemyProg.exp -= expForNextEnemyLevel; } else { enemyCanLevelUp = false; } }
    
    battleResultSummary.enemyLevelAfter = enemyProg.globalLevel;
    if (battleResultSummary.enemyLevelAfter > battleResultSummary.enemyLevelBefore) {
        battleResultSummary.enemyLeveledUp = true;
    }

    battleResultSummary.heroesProgression.forEach((heroSummary, index) => {
        const heroAfter = progressionData.heroes.find(h => h.id === heroSummary.id);
        if (heroAfter) {
            const expNeededAfter = 100 * (heroAfter.level * (heroAfter.level + 1) / 2);
            heroSummary.levelAfter = heroAfter.level;
            heroSummary.expAfter = heroAfter.exp;
            heroSummary.expToLevelUpAfter = expNeededAfter;
        }
    });

    // 6. Inject Summary into bState
    bState.battleResultSummary = battleResultSummary;
    delete bState._defeatedEnemiesThisBattle;

} catch (e) {
    scriptLogger("BATTLE_PROGRESSION_FATAL_ERROR: " + e.message + " | Stack: " + e.stack);
    if (!bState) bState = {};
    bState.battleResultSummary = { error: `Script crash: ${e.message}` };
}

// 7. Prepare Output Variables for Tasker
var battle_state = JSON.stringify(bState);
var new_progression_data_to_save = JSON.stringify(progressionData);
var js_script_log = taskerLogOutput;
var total_exp_gained = bState.battleResultSummary?.totalExpGained || 0;
var enemy_global_level = progressionData?.enemyProgression?.globalLevel || 1;