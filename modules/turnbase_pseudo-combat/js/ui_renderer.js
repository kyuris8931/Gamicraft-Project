// js/ui_renderer.js

// --- DOM Element References (will be initialized in main.js) ---
// let elBattleScreen, elRoundTurnInfo, elBattleMessageArea;
// let elMainEnemyDisplayContainer, elMainEnemyDisplayWrapper, elPrevEnemyBtn, elNextEnemyBtn;
// let elPseudomapStrip;
// let elActiveHeroPanel;
// let elBattleEndScreen, elBattleResultMessage;
// Note: pwaLogOutputElement is initialized in main.js and used by pwaLogger from config.js

// --- UI State Variables ---
let currentEnemyDisplayIndex = 0; // Index for the currently shown enemy in the main display
let visibleEnemies = [];          // Array of living enemies for the main display

// --- Helper Functions ---
function getUnitById(unitId) {
    if (!bState || !bState.Units) return null;
    return bState.Units.find(u => u.id === unitId);
}

function getActiveHeroFromState() {
    if (!bState || !bState.Units || !bState.ActiveUnitID) return null;
    const activeUnit = getUnitById(bState.ActiveUnitID);
    return (activeUnit && activeUnit.type === "Ally" && activeUnit.status !== "Defeated") ? activeUnit : null;
}

function getLivingUnits(type = null) { // type can be "Ally", "Enemy", or null for all
    if (!bState || !bState.Units) return [];
    return bState.Units.filter(unit => {
        const isAlive = unit.status !== "Defeated";
        if (type) {
            return isAlive && unit.type === type;
        }
        return isAlive;
    });
}

// --- Main UI Rendering Orchestrator ---
function refreshAllUIElements() {
    pwaLogger("UI_RENDERER: Refreshing all UI elements.");
    if (!bState || Object.keys(bState).length === 0) {
        pwaLogger("UI_RENDERER: bState is empty. Cannot refresh UI.");
        if (elBattleMessageArea) elBattleMessageArea.textContent = "Waiting for battle data...";
        return;
    }

    // Handle Battle End Screen first
    if (bState.BattleState === "Win" || bState.BattleState === "Lose") {
        showBattleEndScreen(bState.BattleState);
        if (elBattleScreen) elBattleScreen.classList.add("is-hidden"); // Hide main battle screen
        return;
    } else {
        if (elBattleEndScreen) elBattleEndScreen.classList.add("is-hidden");
        if (elBattleScreen) elBattleScreen.classList.remove("is-hidden");
    }

    renderBattleInfo();
    renderMainEnemyDisplay();
    renderPseudomap();
    renderActiveHeroPanel();
    // Animations and damage popups will be triggered by game logic/events, not directly in refreshAll.
    pwaLogger("UI_RENDERER: Finished refreshing UI elements.");
}

// --- Individual UI Component Renderers ---
function renderBattleInfo() {
    if (elRoundTurnInfo) {
        elRoundTurnInfo.textContent = `Round: ${bState.Round || '-'} - Turn: ${bState.TurnInRound || '-'}`;
    }
    if (elBattleMessageArea) {
        elBattleMessageArea.textContent = bState.BattleMessage || "---";
    }
}

function renderMainEnemyDisplay() {
    if (!elMainEnemyDisplayWrapper || !elMainEnemyDisplayContainer) {
        pwaLogger("UI_RENDERER_ENEMY: Wrapper or container element not found.");
        return;
    }
    pwaLogger("UI_RENDERER_ENEMY: Rendering main enemy display.");

    visibleEnemies = getLivingUnits("Enemy");
    elMainEnemyDisplayWrapper.innerHTML = ''; // Clear previous enemies

    if (visibleEnemies.length === 0) {
        const noEnemiesItem = document.createElement('div');
        noEnemiesItem.classList.add('enemy-display-item');
        noEnemiesItem.innerHTML = `<p>No enemies remaining!</p>`;
        elMainEnemyDisplayWrapper.appendChild(noEnemiesItem);
        if (elPrevEnemyBtn) elPrevEnemyBtn.classList.add('is-hidden');
        if (elNextEnemyBtn) elNextEnemyBtn.classList.add('is-hidden');
        currentEnemyDisplayIndex = 0; // Reset index
        return;
    }

    if (elPrevEnemyBtn) elPrevEnemyBtn.classList.toggle('is-hidden', visibleEnemies.length <= 1);
    if (elNextEnemyBtn) elNextEnemyBtn.classList.toggle('is-hidden', visibleEnemies.length <= 1);

    // Ensure currentEnemyDisplayIndex is valid
    currentEnemyDisplayIndex = Math.max(0, Math.min(currentEnemyDisplayIndex, visibleEnemies.length - 1));

    visibleEnemies.forEach((enemy) => {
        const enemyItem = document.createElement('div');
        enemyItem.classList.add('enemy-display-item');
        enemyItem.dataset.enemyId = enemy.id; // For event handling

        const portraitImg = document.createElement('img');
        portraitImg.src = assetCache.portraits[enemy.portraitRef] || staticAssetCache.portraits.placeholder_enemy_portrait; // Fallback
        portraitImg.alt = enemy.name;
        portraitImg.onerror = function() { this.src = staticAssetCache.portraits.placeholder_enemy_portrait; };


        const nameDiv = document.createElement('div');
        nameDiv.classList.add('enemy-name');
        nameDiv.textContent = enemy.name;

        const hpBarContainerDiv = document.createElement('div');
        hpBarContainerDiv.classList.add('hp-bar-container');
        const hpBarDiv = document.createElement('div');
        hpBarDiv.classList.add('hp-bar');
        const hpPercentage = (enemy.stats.HP / enemy.stats.MaxHP) * 100;
        hpBarDiv.style.width = `${Math.max(0, hpPercentage)}%`;
        hpBarContainerDiv.appendChild(hpBarDiv);

        const hpTextDiv = document.createElement('div');
        hpTextDiv.classList.add('hp-text');
        hpTextDiv.textContent = `${enemy.stats.HP} / ${enemy.stats.MaxHP}`;

        enemyItem.appendChild(portraitImg);
        enemyItem.appendChild(nameDiv);
        enemyItem.appendChild(hpBarContainerDiv);
        enemyItem.appendChild(hpTextDiv);

        // Add click listener for targeting
        enemyItem.addEventListener('click', () => handleEnemyDisplayTap(enemy));

        elMainEnemyDisplayWrapper.appendChild(enemyItem);
    });

    // Apply transform to show the correct enemy
    elMainEnemyDisplayWrapper.style.transform = `translateX(-${currentEnemyDisplayIndex * 100}%)`;
    updateEnemyDisplayTargetabilityVisuals(); // Update visual cues for targetability
}

function updateEnemyDisplayTargetabilityVisuals() {
    if (!elMainEnemyDisplayWrapper) return;

    const activeHero = getActiveHeroFromState();
    const enemyItems = elMainEnemyDisplayWrapper.querySelectorAll('.enemy-display-item');

    enemyItems.forEach(item => {
        item.classList.remove('targetable-enemy', 'invalid-target'); // Reset classes
        if (pwaMode === "targeting_enemy" && activeHero) {
            const enemyId = item.dataset.enemyId;
            const enemyUnit = visibleEnemies.find(e => e.id === enemyId);
            if (enemyUnit) {
                const command = activeHero.commands.find(cmd => cmd.commandType === "NormalAttack");
                if (command) {
                    const relativePos = enemyUnit.pseudoPos - activeHero.pseudoPos;
                    if (Math.abs(relativePos) <= command.range && enemyUnit.type === command.targetableType) {
                        item.classList.add('targetable-enemy');
                    } else {
                        item.classList.add('invalid-target');
                    }
                } else {
                     item.classList.add('invalid-target'); // No normal attack defined for hero
                }
            }
        }
    });
}


function renderPseudomap() {
    if (!elPseudomapStrip) {
        pwaLogger("UI_RENDERER_PSEUDO: Strip element not found.");
        return;
    }
    pwaLogger("UI_RENDERER_PSEUDO: Rendering PseudoMap.");
    elPseudomapStrip.innerHTML = ''; // Clear previous frames

    const unitsToDisplayOnMap = getLivingUnits(); // Get all living units
    if (unitsToDisplayOnMap.length === 0) {
        pwaLogger("UI_RENDERER_PSEUDO: No living units to display on PseudoMap.");
        return;
    }

    // Sort units by pseudoPos for consistent rendering order if needed,
    // though the centering logic will primarily dictate visual order.
    unitsToDisplayOnMap.sort((a, b) => a.pseudoPos - b.pseudoPos);

    let displaySlots = new Array(PSEUDOMAP_MAX_VISIBLE_UNITS).fill(null);
    const activeUnit = getUnitById(bState.ActiveUnitID);
    let activeUnitPseudoPos = 0;

    if (activeUnit && activeUnit.status !== "Defeated") {
        activeUnitPseudoPos = activeUnit.pseudoPos;
    } else if (unitsToDisplayOnMap.length > 0) {
        // Fallback if active unit is defeated or not found, center on the first living unit
        activeUnitPseudoPos = unitsToDisplayOnMap[0].pseudoPos;
        pwaLogger("UI_RENDERER_PSEUDO: Active unit not found or defeated, centering on first living unit.");
    }
    
    const centerSlotIndex = Math.floor(PSEUDOMAP_MAX_VISIBLE_UNITS / 2);

    // Populate displaySlots centered around the active unit's pseudoPos
    for (let i = 0; i < PSEUDOMAP_MAX_VISIBLE_UNITS; i++) {
        const targetPseudoPos = activeUnitPseudoPos + (i - centerSlotIndex);
        const unitForSlot = unitsToDisplayOnMap.find(u => u.pseudoPos === targetPseudoPos);
        if (unitForSlot) {
            displaySlots[i] = unitForSlot;
        }
    }
    
    // If fewer units than slots, and we want to keep active unit centered,
    // we might need to adjust. For now, this fills from the calculated center.
    // If PSEUDOMAP_MAX_VISIBLE_UNITS is less than actual units, overflow-x: auto handles scrolling.
    // If we always want to show ALL units when <= MAX_VISIBLE_SLOTS, the logic would be different.
    // For now, we show a "window" of MAX_VISIBLE_SLOTS centered on active unit.

    let actualUnitsToRender = displaySlots;
    if (unitsToDisplayOnMap.length < PSEUDOMAP_MAX_VISIBLE_UNITS) {
        // If total living units are few, just display them all, trying to center the active one.
        // This part can be complex to perfectly center a small number of units within a fixed number of slots.
        // A simpler approach for few units:
        actualUnitsToRender = unitsToDisplayOnMap; // Display all living units directly
        // And then apply CSS to #pseudomap-strip to center them if they don't fill the container.
    }


    actualUnitsToRender.forEach(unit => {
        if (!unit && unitsToDisplayOnMap.length >= PSEUDOMAP_MAX_VISIBLE_UNITS) { // Only add placeholders if we are in "windowed" mode
            const placeholderFrame = document.createElement('div');
            placeholderFrame.classList.add('pseudomap-frame', 'placeholder');
            // Optionally, add a specific style or content for placeholder
            elPseudomapStrip.appendChild(placeholderFrame);
            return;
        }
        if (!unit) return; // Skip if still null after adjustments

        const frameDiv = document.createElement('div');
        frameDiv.classList.add('pseudomap-frame', unit.type.toLowerCase());
        frameDiv.dataset.unitId = unit.id;
        if (unit.id === bState.ActiveUnitID) {
            frameDiv.classList.add('active-unit');
        }
        // No 'is-defeated' class here as we filter for living units

        const borderDiv = document.createElement('div');
        borderDiv.classList.add('diamond-border');

        const portraitImg = document.createElement('img');
        portraitImg.classList.add('unit-portrait');
        portraitImg.src = assetCache.portraits[unit.portraitRef] || (unit.type === "Ally" ? staticAssetCache.portraits.placeholder_ally_portrait : staticAssetCache.portraits.placeholder_enemy_portrait);
        portraitImg.alt = unit.name;
        portraitImg.onerror = function() { this.src = (unit.type === "Ally" ? staticAssetCache.portraits.placeholder_ally_portrait : staticAssetCache.portraits.placeholder_enemy_portrait); };

        frameDiv.appendChild(borderDiv);
        frameDiv.appendChild(portraitImg);
        elPseudomapStrip.appendChild(frameDiv);
    });
}


function renderActiveHeroPanel() {
    if (!elActiveHeroPanel) {
        pwaLogger("UI_RENDERER_HERO: Panel element not found.");
        return;
    }
    pwaLogger("UI_RENDERER_HERO: Rendering active hero panel.");

    const activeHero = getActiveHeroFromState();
    if (!activeHero) {
        elActiveHeroPanel.innerHTML = `<p style="padding: 10px; text-align: center;">No active ally.</p>`;
        elActiveHeroPanel.classList.remove('ready-to-attack');
        return;
    }

    elActiveHeroPanel.innerHTML = `
        <img src="${assetCache.portraits[activeHero.portraitRef] || staticAssetCache.portraits.placeholder_ally_portrait}" alt="${activeHero.name}" class="hero-portrait" onerror="this.src='${staticAssetCache.portraits.placeholder_ally_portrait}'">
        <div class="hero-info">
            <div class="hero-name">${activeHero.name}</div>
            <div class="hp-bar-container">
                <div class="hp-bar" style="width: ${Math.max(0, (activeHero.stats.HP / activeHero.stats.MaxHP) * 100)}%;"></div>
            </div>
            <div class="hp-text">${activeHero.stats.HP} / ${activeHero.stats.MaxHP}</div>
        </div>
    `;

    if (pwaMode === "targeting_enemy") {
        elActiveHeroPanel.classList.add('ready-to-attack');
    } else {
        elActiveHeroPanel.classList.remove('ready-to-attack');
    }
}

function showBattleEndScreen(resultState) { // resultState: "Win" or "Lose"
    if (!elBattleScreen || !elBattleEndScreen || !elBattleResultMessage) {
        pwaLogger("UI_RENDERER_END: Battle end screen elements not found.");
        return;
    }

    elBattleScreen.classList.add('is-hidden'); // Hide main battle screen
    elBattleEndScreen.classList.remove('is-hidden', 'win', 'lose'); // Show end screen and reset result classes

    if (resultState === "Win") {
        elBattleResultMessage.textContent = "Victory!";
        elBattleEndScreen.classList.add('win');
    } else if (resultState === "Lose") {
        elBattleResultMessage.textContent = "Defeat!";
        elBattleEndScreen.classList.add('lose');
    } else {
        elBattleResultMessage.textContent = "Battle Over."; // Fallback
    }
    pwaLogger(`UI_RENDERER_END: Displaying Battle End Screen - ${resultState}`);
}

// --- Animation & Visual Feedback Functions ---
function showDamagePopup(targetUnitId, damageAmount) {
    if (!damageAmount || damageAmount <= 0) return; // Don't show for 0 or negative damage

    // Find the target element in the main enemy display or pseudomap
    let targetElement = elMainEnemyDisplayWrapper?.querySelector(`.enemy-display-item[data-enemy-id="${targetUnitId}"] img`);
    if (!targetElement) {
        targetElement = elPseudomapStrip?.querySelector(`.pseudomap-frame[data-unit-id="${targetUnitId}"] img.unit-portrait`);
    }
    if (!targetElement || !elBattleScreen) return; // Need a positioned parent like battle-screen

    const damagePopup = document.createElement('div');
    damagePopup.classList.add('damage-text-popup');
    damagePopup.textContent = damageAmount;

    // Append to battle-screen to ensure it's positioned correctly relative to it
    elBattleScreen.appendChild(damagePopup);

    // Position popup near the target element
    // This is a simplified positioning, might need refinement
    const targetRect = targetElement.getBoundingClientRect();
    const battleScreenRect = elBattleScreen.getBoundingClientRect();
    
    // Calculate position relative to elBattleScreen
    damagePopup.style.left = `${targetRect.left - battleScreenRect.left + targetRect.width / 2}px`;
    damagePopup.style.top = `${targetRect.top - battleScreenRect.top}px`;


    pwaLogger(`UI_ANIM: Showing damage popup: ${damageAmount} on ${targetUnitId}`);
    damagePopup.addEventListener('animationend', () => {
        damagePopup.remove();
    });
}

function animateUnitAction(unitId, actionType) { // actionType: "attack_ally", "attack_enemy", "hit"
    // Find unit in PseudoMap
    const pseudoFrame = elPseudomapStrip?.querySelector(`.pseudomap-frame[data-unit-id="${unitId}"]`);
    const pseudoPortrait = pseudoFrame?.querySelector('img.unit-portrait');

    // Find unit in Main Enemy Display (if it's an enemy)
    const mainEnemyItem = elMainEnemyDisplayWrapper?.querySelector(`.enemy-display-item[data-enemy-id="${unitId}"]`);
    const mainEnemyPortrait = mainEnemyItem?.querySelector('img');

    let animationClass = '';
    if (actionType === "attack_ally") animationClass = 'unit-attacking-ally';
    else if (actionType === "attack_enemy") animationClass = 'unit-attacking-enemy';
    else if (actionType === "hit") animationClass = 'unit-hit';
    else return;

    const elementsToAnimate = [pseudoPortrait, mainEnemyPortrait].filter(el => el); // Filter out nulls

    elementsToAnimate.forEach(element => {
        element.classList.add(animationClass);
        element.addEventListener('animationend', () => {
            element.classList.remove(animationClass);
        }, { once: true });
    });
    pwaLogger(`UI_ANIM: Animating ${unitId} with ${actionType}`);
}
