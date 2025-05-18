// js/event_handlers.js

// --- DOM Element References (will be initialized in main.js) ---
// These are declared in ui_renderer.js and main.js will make them available globally or pass them.
// For clarity, we can list the ones this module directly interacts with for adding listeners:
// elActiveHeroPanel
// elPrevEnemyBtn, elNextEnemyBtn
// elMainEnemyDisplayContainer (for swipe)
// elQuitBattleBtn
// Individual enemy items in elMainEnemyDisplayWrapper will have listeners added dynamically.

/**
 * Initializes all primary event listeners for the PWA.
 * This function should be called once the DOM is fully loaded.
 */
function initializeEventListeners() {
    pwaLogger("EVENT_HANDLER: Initializing event listeners.");

    if (elActiveHeroPanel) {
        elActiveHeroPanel.addEventListener('click', handleActiveHeroPanelTap);
    } else {
        pwaLogger("EVENT_HANDLER_ERROR: Active Hero Panel element not found for listener.");
    }

    if (elPrevEnemyBtn) {
        elPrevEnemyBtn.addEventListener('click', () => navigateEnemyDisplay(-1));
    } else {
        pwaLogger("EVENT_HANDLER_ERROR: Previous Enemy Button element not found for listener.");
    }

    if (elNextEnemyBtn) {
        elNextEnemyBtn.addEventListener('click', () => navigateEnemyDisplay(1));
    } else {
        pwaLogger("EVENT_HANDLER_ERROR: Next Enemy Button element not found for listener.");
    }
    
    // Swipe listeners for the main enemy display
    if (elMainEnemyDisplayContainer) {
        let touchStartX = 0;
        let touchEndX = 0;
        const swipeThreshold = 50; // Minimum pixels for a swipe

        elMainEnemyDisplayContainer.addEventListener('touchstart', function(event) {
            touchStartX = event.changedTouches[0].screenX;
        }, { passive: true }); // passive: true for better scroll performance

        elMainEnemyDisplayContainer.addEventListener('touchend', function(event) {
            touchEndX = event.changedTouches[0].screenX;
            handleEnemySwipeGesture(touchStartX, touchEndX, swipeThreshold);
        }, { passive: true });
    } else {
        pwaLogger("EVENT_HANDLER_ERROR: Main Enemy Display Container not found for swipe listeners.");
    }

    if (elQuitBattleBtn) {
        elQuitBattleBtn.addEventListener('click', handleQuitBattle);
    } else {
        pwaLogger("EVENT_HANDLER_ERROR: Quit Battle Button element not found for listener.");
    }
    // Note: Event listeners for dynamically created enemy items in renderMainEnemyDisplay()
    // are added directly in that function (in ui_renderer.js).
}

/**
 * Handles taps on the active hero panel.
 * Toggles the PWA into "targeting_enemy" mode if it's the active hero's turn.
 */
function handleActiveHeroPanelTap() {
    pwaLogger("EVENT_HANDLER: Active Hero Panel tapped.");
    const activeHero = getActiveHeroFromState(); // From ui_renderer.js or global

    if (!activeHero || bState.BattleState !== "Ongoing" || bState.ActiveUnitID !== activeHero.id) {
        pwaLogger("EVENT_HANDLER: Tap ignored (not active hero's turn or battle is over).");
        return;
    }

    if (pwaMode === "idle") {
        pwaMode = "targeting_enemy";
        pwaLogger(`PWA_MODE: Changed to -> ${pwaMode}. Ready to select an enemy target.`);
    } else if (pwaMode === "targeting_enemy") {
        pwaMode = "idle"; // Toggle off targeting mode
        pwaLogger(`PWA_MODE: Changed to -> ${pwaMode}. Targeting cancelled by hero panel tap.`);
    }
    // Update UI to reflect the new mode (e.g., panel highlight, targetability visuals)
    if (typeof renderActiveHeroPanel === "function") renderActiveHeroPanel();
    if (typeof updateEnemyDisplayTargetabilityVisuals === "function") updateEnemyDisplayTargetabilityVisuals();
}

/**
 * Handles swipe gestures on the main enemy display.
 * @param {number} startX - The starting X coordinate of the touch.
 * @param {number} endX - The ending X coordinate of the touch.
 * @param {number} threshold - The minimum pixel distance to qualify as a swipe.
 */
function handleEnemySwipeGesture(startX, endX, threshold) {
    if (endX < startX - threshold) {
        navigateEnemyDisplay(1); // Swipe left -> next enemy
    } else if (endX > startX + threshold) {
        navigateEnemyDisplay(-1); // Swipe right -> previous enemy
    }
}

/**
 * Navigates the main enemy display.
 * @param {number} direction - 1 for next, -1 for previous.
 */
function navigateEnemyDisplay(direction) {
    if (!visibleEnemies || visibleEnemies.length <= 1) {
        pwaLogger("EVENT_HANDLER_ENEMY_NAV: Navigation skipped (0 or 1 enemy).");
        return; // No navigation needed if 0 or 1 enemy
    }

    currentEnemyDisplayIndex += direction;

    if (currentEnemyDisplayIndex < 0) {
        currentEnemyDisplayIndex = visibleEnemies.length - 1; // Loop to last
    } else if (currentEnemyDisplayIndex >= visibleEnemies.length) {
        currentEnemyDisplayIndex = 0; // Loop to first
    }

    if (elMainEnemyDisplayWrapper) {
        elMainEnemyDisplayWrapper.style.transform = `translateX(-${currentEnemyDisplayIndex * 100}%)`;
    }
    pwaLogger(`EVENT_HANDLER_ENEMY_NAV: Navigated to enemy index ${currentEnemyDisplayIndex} (${visibleEnemies[currentEnemyDisplayIndex]?.name || 'N/A'})`);
    
    // Update targetability visuals after navigation
    if (typeof updateEnemyDisplayTargetabilityVisuals === "function") updateEnemyDisplayTargetabilityVisuals();
}

/**
 * Handles taps on an enemy item in the main enemy display.
 * If in targeting mode, validates the target and sends a command.
 * @param {object} enemyUnit - The enemy unit object that was tapped.
 */
function handleEnemyDisplayTap(enemyUnit) {
    pwaLogger(`EVENT_HANDLER_ENEMY_TAP: Enemy '${enemyUnit.name}' (ID: ${enemyUnit.id}) tapped.`);
    if (pwaMode !== "targeting_enemy") {
        pwaLogger("EVENT_HANDLER_ENEMY_TAP: Tap ignored, not in targeting mode.");
        // Future: Could show detailed enemy info if tapped in "idle" mode.
        return;
    }

    const activeHero = getActiveHeroFromState();
    if (!activeHero) {
        pwaLogger("EVENT_HANDLER_ENEMY_TAP: No active hero to perform an attack.");
        return;
    }

    // For soft launch, assume the first command is Normal Attack
    const normalAttackCommand = activeHero.commands.find(cmd => cmd.commandType === "NormalAttack");
    if (!normalAttackCommand) {
        pwaLogger("EVENT_HANDLER_ENEMY_TAP: Active hero has no NormalAttack command defined.");
        if (elBattleMessageArea) elBattleMessageArea.textContent = "Cannot attack!";
        return;
    }

    // Validate attack range based on pseudoPos
    const relativePos = enemyUnit.pseudoPos - activeHero.pseudoPos;
    if (Math.abs(relativePos) <= normalAttackCommand.range && enemyUnit.type === normalAttackCommand.targetableType) {
        pwaLogger(`EVENT_HANDLER_ENEMY_TAP: Target ${enemyUnit.name} is VALID for Normal Attack.`);
        
        // Animate attacker
        if (typeof animateUnitAction === "function") animateUnitAction(activeHero.id, activeHero.type === "Ally" ? "attack_ally" : "attack_enemy");

        sendCommandToTasker(normalAttackCommand.commandId, enemyUnit.id); // Send commandId
        pwaMode = "waiting_tasker"; // Change mode after sending command
        pwaLogger(`PWA_MODE: Changed to -> ${pwaMode}. Waiting for Tasker response.`);
        if (elBattleMessageArea) elBattleMessageArea.textContent = `${activeHero.name} attacks ${enemyUnit.name}...`;
        
        // Update UI to reflect waiting state (e.g., disable hero panel taps)
        if (typeof renderActiveHeroPanel === "function") renderActiveHeroPanel(); 
        if (typeof updateEnemyDisplayTargetabilityVisuals === "function") updateEnemyDisplayTargetabilityVisuals();


    } else {
        pwaLogger(`EVENT_HANDLER_ENEMY_TAP: Target ${enemyUnit.name} is OUT OF RANGE for Normal Attack.`);
        if (elBattleMessageArea) elBattleMessageArea.textContent = `${enemyUnit.name} is out of range!`;
        // Optionally, provide visual feedback like a shake or a red border on the target
    }
}

/**
 * Handles the "Quit" button tap on the battle end screen.
 */
function handleQuitBattle() {
    pwaLogger("EVENT_HANDLER: Quit Battle button tapped.");
    // For soft launch, attempt to close web screen or send a generic quit command
    if (window.AutoTools && typeof window.AutoTools.closeWebScreen === 'function') {
        pwaLogger("EVENT_HANDLER: Attempting AutoTools.closeWebScreen().");
        window.AutoTools.closeWebScreen();
    } else if (window.parent && window.parent.AutoTools && typeof window.parent.AutoTools.closeWebScreen === 'function') {
        // If PWA is in an iframe within AutoTools Web Screen context
        pwaLogger("EVENT_HANDLER: Attempting window.parent.AutoTools.closeWebScreen().");
        window.parent.AutoTools.closeWebScreen();
    } else {
        pwaLogger("EVENT_HANDLER: Cannot close Web Screen automatically. Sending 'QUIT_BATTLE_ACTION' to Tasker.");
        // Send a command to Tasker to handle the quit action (e.g., destroy web screen)
        sendCommandToTasker('QuitBattleAction', null); 
        if(elBattleEndScreen && elBattleResultMessage) {
            elBattleResultMessage.textContent = "Quitting...";
            // Disable the button after click to prevent multiple sends
            const quitBtn = elBattleEndScreen.querySelector('#quit-battle-btn');
            if(quitBtn) quitBtn.disabled = true;
        }
    }
}
