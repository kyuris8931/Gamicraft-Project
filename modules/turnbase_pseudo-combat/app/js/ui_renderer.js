// js/ui_renderer.js
// Handles all UI rendering logic for the Gamicraft WebScreen Turn-Based Combat.
// Versi dengan perbaikan posisi pop-up dan bug "No Target".

// --- Helper Functions ---

/**
 * Gets a unit object from bState by its ID.
 * @param {string} unitId
 * @returns {object|null}
 */
function getUnitById(unitId) {
    if (!bState || !bState.units || !Array.isArray(bState.units)) {
        wsLogger(`GET_UNIT_BY_ID_ERROR: bState or bState.units is not available or not an array. Cannot find unit: ${unitId}`);
        return null;
    }
    return bState.units.find(u => u.id === unitId);
}

/**
 * Gets the currently active unit object from bState.
 * @returns {object|null}
 */
function getActiveUnit() {
    if (!bState || !bState.activeUnitID) {
        wsLogger("GET_ACTIVE_UNIT_ERROR: bState or activeUnitID is missing.");
        return null;
    }
    return getUnitById(bState.activeUnitID);
}

/**
 * Constructs the full image path for a unit.
 * @param {string} filenameFromState
 * @param {string} unitType
 * @param {string} displayContext
 * @param {boolean} [isErrorFallback=false]
 * @returns {string}
 */
function getImagePathForUnit(filenameFromState, unitType, displayContext, isErrorFallback = false) {
    let basePathToUse;
    let finalFilename;

    if (typeof window.gcpcDataPath === 'undefined' || typeof window.gcpcPlaceholderPath === 'undefined') {
        wsLogger(`GET_IMAGE_PATH_ERROR: Global path variables undefined!`);
        return "assets/images/path_error_generic.png";
    }

    if (filenameFromState && typeof filenameFromState === 'string' && filenameFromState.trim() !== '' && !isErrorFallback) {
        basePathToUse = window.gcpcDataPath;
        finalFilename = filenameFromState;
    } else {
        basePathToUse = window.gcpcPlaceholderPath;
        let placeholderKey;
        if (displayContext === "fullBody") {
            placeholderKey = staticAssetFilenames.portraits.placeholder_enemy_sprite_fullbody;
        } else {
            placeholderKey = (unitType === "Ally")
                ? staticAssetFilenames.portraits.placeholder_hero_portrait_head
                : staticAssetFilenames.portraits.placeholder_enemy_portrait_head;
        }
        finalFilename = placeholderKey;
    }
    if (typeof basePathToUse === 'undefined' || typeof finalFilename === 'undefined') {
         return "assets/images/filename_error_generic.png";
    }
    return basePathToUse + finalFilename;
}

/**
 * Constructs the full path for general assets like backgrounds.
 * @param {string} filenameFromState
 * @param {string} assetCategory
 * @returns {string}
 */
function getGeneralAssetPath(filenameFromState, assetCategory) {
    if (typeof window.gcpcDataPath === 'undefined') return "";
    if (!filenameFromState || filenameFromState.trim() === '') {
        if (assetCategory === 'fx' && staticAssetFilenames && staticAssetFilenames.animations) {
             return window.gcpcPlaceholderPath + staticAssetFilenames.animations.default_attack_fx;
        }
        return "";
    }
    return window.gcpcDataPath + filenameFromState;
}

/**
 * Helper function to get valid basic attack target IDs for UI highlighting.
 * @param {object} actorUnit
 * @param {Array<object>} allAliveUnits
 * @returns {Array<string>}
 */
function getValidBasicAttackTargetIdsForUI(actorUnit, allAliveUnits) {
    if (!actorUnit || actorUnit.type !== "Ally" || !allAliveUnits) return [];

    const aliveEnemies = allAliveUnits.filter(u => u.type === "Enemy");
    if (aliveEnemies.length === 0) return [];

    const actorRole = actorUnit.role || "Melee";
    const attackRange = (actorRole === "Ranged") ? [2, -2] : [1, -1];
    
    const validTargets = aliveEnemies.filter(enemy => attackRange.includes(enemy.pseudoPos));
    return validTargets.map(u => u.id);
}

/**
 * Finds the best anchor element for a pop-up with a specific priority.
 * This ensures pop-ups for heroes appear on their card, not their pseudomap icon.
 * @param {string} unitId - The ID of the unit.
 * @returns {HTMLElement|null} The best DOM element found or null.
 */
function findBestAnchorElement(unitId) {
    // Priority: Hero Card > Enemy Card > Pseudomap Frame
    const heroCardAnchor = document.querySelector(`#player-heroes-deck .character-card[data-unit-id="${unitId}"]`);
    if (heroCardAnchor) return heroCardAnchor;

    const enemyCardAnchor = document.querySelector(`#enemy-stage .character-card[data-unit-id="${unitId}"]`);
    if (enemyCardAnchor) return enemyCardAnchor;

    const pseudomapAnchor = document.querySelector(`.pseudomap-unit-frame[data-unit-id="${unitId}"]`);
    return pseudomapAnchor;
}

// --- Main UI Rendering Orchestrator ---
function refreshAllUIElements(passedPreviousBState = null) {
    wsLogger("UI_RENDERER: refreshAllUIElements CALLED.");
    if (!bState || Object.keys(bState).length === 0 || !bState.units) {
        wsLogger("UI_RENDERER_ERROR: Battle state (bState) is empty or invalid.");
        return;
    }

    const activeUnit = getActiveUnit();
    if (activeUnit && activeUnit.type === 'Enemy') {
        if (!passedPreviousBState || activeUnit.id !== passedPreviousBState.activeUnitID) {
            scrollToEnemyInCarousel(activeUnit.id);
            wsLogger(`UI_RENDERER: Auto-scrolling to active enemy: ${activeUnit.name}`);
        }
    }

    const damagedUnitData = [];
    const healedUnitData = [];
    const defeatedUnitData = [];
    let spGained = 0;
    let spSpent = 0;

    let stunnedUnitId = null;
    if (bState.lastActionDetails?.actionOutcome === "STUNNED") {
        stunnedUnitId = bState.lastActionDetails.actorId;
    }

    if (passedPreviousBState) {
        if (typeof bState.teamSP === 'number' && typeof passedPreviousBState.teamSP === 'number') {
            const spChange = bState.teamSP - passedPreviousBState.teamSP;
            if (spChange > 0) spGained = spChange;
            else if (spChange < 0) spSpent = -spChange;
        }

        if (bState.units && passedPreviousBState.units) {
            bState.units.forEach(currentUnit => {
                const prevUnitData = passedPreviousBState.units.find(prevU => prevU.id === currentUnit.id);
                if (prevUnitData) {
                    if (currentUnit.status === "Defeated" && prevUnitData.status !== "Defeated") {
                        defeatedUnitData.push({ unitId: currentUnit.id, type: currentUnit.type });
                    }
                    if (prevUnitData.stats && currentUnit.stats) {
                        const oldHp = prevUnitData.stats.hp;
                        const newHp = currentUnit.stats.hp;
                        if (newHp < oldHp) {
                            damagedUnitData.push({ unitId: currentUnit.id, amount: oldHp - newHp, type: currentUnit.type });
                        } else if (newHp > oldHp) {
                            healedUnitData.push({ unitId: currentUnit.id, amount: newHp - oldHp, type: currentUnit.type });
                        }
                    }
                }
            });
        }
    }

    const performStandardRenderAndPopups = () => {
        renderDynamicBackground();
        renderTopBar();
        renderEnemyStage();
        renderPlayerHeroesDeck();
        renderPlayerActionBar();
        renderPseudomap();

        // --- PERUBAHAN: Tampilkan pop-up "Stunned" ---
        if (stunnedUnitId) {
            const anchor = elPseudomapArea;
            if (anchor) {
                // Gunakan kelas 'info-popup' atau buat kelas baru 'stun-popup' jika mau
                ui_createFeedbackPopup(anchor, 'Stunned!', 'info-popup', { verticalOrigin: 'top', yOffset: 15 });
            }
        }

        // FIX: Only show "No Target" popup if the state has just changed to this.
        if (bState.lastActionDetails?.actionOutcome === "NO_TARGET_IN_RANGE") {
            // Kita hanya tampilkan popup jika state sebelumnya TIDAK sama,
            // untuk mencegah render ulang pada UI refresh biasa.
            if (passedPreviousBState?.lastActionDetails?.actionOutcome !== "NO_TARGET_IN_RANGE") {
                const anchor = elPseudomapArea;
                if (anchor) {
                    ui_createFeedbackPopup(anchor, 'No Target', 'info-popup', { verticalOrigin: 'top', yOffset: 15 });
                }
            }
            // PENTING: "Konsumsi" sinyal ini di sisi klien agar tidak muncul lagi
            // sampai sinyal baru yang identik datang dari backend. Ini menghentikan pop-up hantu.
            bState.lastActionDetails.actionOutcome = null;
        }


        healedUnitData.forEach(data => {
            const anchor = findBestAnchorElement(data.unitId);
            if (anchor) ui_createFeedbackPopup(anchor, `+${data.amount}`, 'heal-popup');
        });
        if (spGained > 0 && elTeamResourcesDisplay) {
            ui_createFeedbackPopup(elTeamResourcesDisplay, `+${spGained} SP`, 'sp-gain-popup');
        }
        if (spSpent > 0 && elTeamResourcesDisplay) {
            ui_createFeedbackPopup(elTeamResourcesDisplay, `-${spSpent} SP`, 'sp-spent-popup');
        }

        if (bState.battleState === "Win" || bState.battleState === "Lose") {
            renderBattleLogOverlay(true, bState.battleState, bState.battleMessage || (bState.battleState === "Win" ? "Victory!" : "Defeat!"));
            if(elActionButtonsGroup) elActionButtonsGroup.innerHTML = `<p class="battle-over-message">${bState.battleState.toUpperCase()}!</p>`;
            if(elPseudomapArea) elPseudomapArea.classList.add('is-hidden');
            if(elPlayerHeroesDeck) elPlayerHeroesDeck.classList.add('is-hidden');
        } else {
            if (elBattleLogOverlay && elBattleLogOverlay.classList.contains('is-visible') && !bState.showLog) {
                 renderBattleLogOverlay(false);
            }
            if(elPseudomapArea) elPseudomapArea.classList.remove('is-hidden');
            if(elPlayerHeroesDeck) elPlayerHeroesDeck.classList.remove('is-hidden');
            if (typeof scrollToActiveUnitInPseudomap === "function") requestAnimationFrame(() => { requestAnimationFrame(scrollToActiveUnitInPseudomap); });
            const activeUnitForScroll = getActiveUnit();
            if (activeUnitForScroll && activeUnitForScroll.type === "Ally") {
                if (typeof scrollToPlayerHero === "function") requestAnimationFrame(() => { scrollToPlayerHero(activeUnitForScroll.id, true); });
            }
            const allUnitFrames = elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
            if (wsMode === "selecting_primary_target") {
                if (typeof ui_renderSelectPrimaryTargetMode === "function") ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, allUnitFrames);
            } else if (wsMode === "confirming_effect_area") {
                if (typeof ui_renderConfirmAreaMode === "function") ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, allUnitFrames);
            } else if (wsMode === "confirming_basic_attack") {
                if (typeof ui_highlightPotentialBasicAttackTarget === "function") allUnitFrames.forEach(frame => ui_highlightPotentialBasicAttackTarget(frame.dataset.unitId, frame.dataset.unitId === lastTappedUnitId));
            }
        }
    };
    
    damagedUnitData.forEach(data => {
        const anchor = findBestAnchorElement(data.unitId);
        // PERUBAHAN DI SINI: yOffset diubah untuk mendorong pop-up lebih ke bawah.
        // Anda bisa mengubah nilai 40 ini sesuai selera.
        const popupOptions = (data.type === 'Enemy') 
            ? { verticalOrigin: 'top', yOffset: 50 } // Mendorong 40px dari atas kartu
            : {}; 
        if (anchor) ui_createFeedbackPopup(anchor, `-${data.amount}`, 'damage-popup', popupOptions);
    });

    if (defeatedUnitData.length > 0) {
        wsLogger("UI_RENDERER: Defeated unit(s) detected. Starting death animation sequence.");
        
        defeatedUnitData.forEach(data => {
            const cardElement = findBestAnchorElement(data.unitId);
            if (cardElement) {
                const hpBar = cardElement.querySelector('.hp-bar');
                if (hpBar) hpBar.style.width = '0%';
                
                setTimeout(() => {
                    ui_playDeathAnimation(cardElement);
                    ui_createFeedbackPopup(cardElement, 'KO!', 'damage-popup', { verticalOrigin: 'center' });
                }, 400);
            }
        });
        
        const totalAnimationTime = 1600;
        wsLogger(`UI_RENDERER: Waiting ${totalAnimationTime}ms for death sequence to finish before full re-render.`);
        setTimeout(performStandardRenderAndPopups, totalAnimationTime);
    } else {
        wsLogger("UI_RENDERER: No defeated units. Performing standard render.");
        performStandardRenderAndPopups();
    }
    
    wsLogger("UI_RENDERER: refreshAllUIElements sequence finished.");
}

// --- Individual Component Renderers ---
function renderDynamicBackground() {
    if (!elDynamicBackground) { return; }
    const bgFilename = bState.assets?.backgroundImageFilename;
    if (bgFilename && typeof bgFilename === 'string' && bgFilename.trim() !== '') {
        const fullPath = getGeneralAssetPath(bgFilename, "background");
        elDynamicBackground.style.backgroundImage = fullPath ? `url('${fullPath}')` : '';
        elDynamicBackground.style.backgroundColor = fullPath ? '' : DEFAULT_BACKGROUND_COLOR;
    } else {
        elDynamicBackground.style.backgroundImage = '';
        elDynamicBackground.style.backgroundColor = DEFAULT_BACKGROUND_COLOR;
    }
}

function renderTopBar() {
    if (elRoundTurnDisplay) {
        const roundText = bState.round ? toRoman(bState.round) : 'N/A';
        const turnText = bState.turnInRound || 'N/A';
        elRoundTurnDisplay.innerHTML = `<span>${roundText}</span>-<span>${turnText}</span>`;
    }
    if (elBattleMessageDisplay) {
        elBattleMessageDisplay.textContent = bState.battleMessage || "---";
    }
}

function renderEnemyStage() {
    if (!elEnemyCarousel) { return; }
    elEnemyCarousel.innerHTML = '';
    const enemies = bState.units ? bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated") : [];
    
    if (enemies.length === 0) {
        elEnemyCarousel.innerHTML = '<div class="character-card enemy-card no-target"><p>No enemies left!</p></div>';
        if (elPrevEnemyBtn) elPrevEnemyBtn.style.display = 'none';
        if (elNextEnemyBtn) elNextEnemyBtn.style.display = 'none';
        currentEnemyIndex = 0;
        return;
    }
    if (currentEnemyIndex >= enemies.length) currentEnemyIndex = Math.max(0, enemies.length - 1);
    if (currentEnemyIndex < 0) currentEnemyIndex = 0;

    enemies.forEach((enemy, index) => {
        const card = document.createElement('div');
        card.classList.add('character-card', 'enemy-card');
        card.dataset.unitId = enemy.id;
        if (index === currentEnemyIndex) card.classList.add('active-enemy');
        const detailsWrapper = document.createElement('div');
        detailsWrapper.classList.add('character-details');
        const nameElement = document.createElement('h3');
        nameElement.classList.add('character-name');
        nameElement.textContent = enemy.name || "Unknown Enemy";
        const hpContainer = document.createElement('div');
        hpContainer.classList.add('hp-bar-container');
        const hpBar = document.createElement('div');
        hpBar.classList.add('hp-bar');
        const maxHp = enemy.stats?.maxHp || 0;
        const currentHp = enemy.stats?.hp || 0;
        const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
        hpBar.style.width = `${Math.max(0, hpPercentage)}%`;
        const hpText = document.createElement('div');
        hpText.classList.add('hp-text');
        hpText.textContent = `${currentHp}/${maxHp}`;
        hpContainer.appendChild(hpBar);
        hpContainer.appendChild(hpText);
        detailsWrapper.appendChild(nameElement);
        detailsWrapper.appendChild(hpContainer);
        const spriteContainer = document.createElement('div');
        spriteContainer.classList.add('character-sprite-container');
        const sprite = document.createElement('img');
        sprite.src = getImagePathForUnit(enemy.fullBodyFilename, enemy.type, "fullBody");
        sprite.alt = (enemy.name || "Unknown Enemy") + " Sprite";
        sprite.classList.add('character-sprite');
        sprite.onerror = function() {
            this.src = getImagePathForUnit(null, enemy.type, "fullBody", true);
            this.onerror = null;
        };
        spriteContainer.appendChild(sprite);
        card.appendChild(detailsWrapper);
        card.appendChild(spriteContainer);
        elEnemyCarousel.appendChild(card);
    });

    elEnemyCarousel.style.transform = `translateX(-${currentEnemyIndex * 100}%)`;
    if (elPrevEnemyBtn) elPrevEnemyBtn.style.display = enemies.length > 1 ? 'block' : 'none';
    if (elNextEnemyBtn) elNextEnemyBtn.style.display = enemies.length > 1 ? 'block' : 'none';
}

function renderPlayerHeroesDeck() {
    if (!elPlayerHeroesCarousel) { return; }
    elPlayerHeroesCarousel.innerHTML = '';
    const playerHeroes = bState.units ? bState.units.filter(unit => unit.type === "Ally" && unit.status !== "Defeated") : [];
    if (playerHeroes.length === 0) {
        elPlayerHeroesCarousel.innerHTML = '<p class="no-heroes-message">No active heroes.</p>';
        return;
    }
    playerHeroes.forEach((hero) => {
        const card = document.createElement('div');
        card.classList.add('character-card', 'player-card');
        card.dataset.unitId = hero.id;
        if (hero.id === bState.activeUnitID) card.classList.add('active-player-hero');
        const spriteContainer = document.createElement('div');
        spriteContainer.classList.add('character-sprite-container');
        const sprite = document.createElement('img');
        sprite.src = getImagePathForUnit(hero.portraitFilename, hero.type, "portraitHead");
        sprite.alt = (hero.name || "Hero") + " Portrait";
        sprite.classList.add('character-sprite');
        sprite.onerror = function() { this.src = getImagePathForUnit(null, hero.type, "portraitHead", true); };
        spriteContainer.appendChild(sprite);
        const details = document.createElement('div');
        details.classList.add('character-details');
        const name = document.createElement('h4');
        name.classList.add('character-name');
        name.textContent = hero.name || "Unknown Hero";
        const hpContainer = document.createElement('div');
        hpContainer.classList.add('hp-bar-container');
        const hpBar = document.createElement('div');
        hpBar.classList.add('hp-bar');
        const maxHp = hero.stats?.maxHp || 0;
        const currentHp = hero.stats?.hp || 0;
        const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
        hpBar.style.width = `${Math.max(0, hpPercentage)}%`;
        const hpText = document.createElement('div');
        hpText.classList.add('hp-text');
        hpText.textContent = `${currentHp}/${maxHp}`;
        hpContainer.appendChild(hpBar);
        if (hero.stats?.maxHp) hpContainer.appendChild(hpText);
        details.appendChild(name);
        details.appendChild(hpContainer);
        card.appendChild(spriteContainer);
        card.appendChild(details);
        elPlayerHeroesCarousel.appendChild(card);
    });
}

function renderPlayerActionBar() {
    if (elTeamResourcesDisplay) {
        elTeamResourcesDisplay.textContent = `SP: ${bState.teamSP || 0}/${bState.maxTeamSP || 5}`;
    }
    if (!elActionButtonsGroup) { wsLogger("UI_RENDERER_ACTION_BAR_ERROR: Action buttons group not found."); return; }
    elActionButtonsGroup.innerHTML = '';
    const activeUnit = getActiveUnit();
    if (!activeUnit || activeUnit.type !== "Ally" || bState.battleState !== "Ongoing") {
        elActionButtonsGroup.innerHTML = '<p class="no-actions-message">No actions available.</p>';
        return;
    }
    const skills = activeUnit.commands ? activeUnit.commands.filter(cmd => cmd.type !== "BasicAttack") : [];
    if (skills.length === 0) {
        elActionButtonsGroup.innerHTML = '<p class="no-actions-message">No skills. Double tap enemy for Basic Attack.</p>';
        return;
    }
    skills.forEach(cmd => {
        const button = document.createElement('button');
        button.textContent = cmd.name || "Skill";
        button.dataset.commandId = cmd.commandId;
        button.dataset.actionType = cmd.type;
        let isDisabled = (cmd.type === "Skill" && typeof cmd.spCost === 'number' && bState.teamSP < cmd.spCost);
        if (isDisabled) {
            button.classList.add('disabled');
            button.disabled = true;
            button.title = `Needs ${cmd.spCost} SP`;
        }
        elActionButtonsGroup.appendChild(button);
    });
}

function renderBattleLogOverlay(show, resultState = null, endMessage = null) {
    if (!elBattleLogOverlay || !elBattleLogEntries) { return; }
    if (show) {
        const titleElement = elBattleLogOverlay.querySelector('h3');
        if (titleElement) titleElement.textContent = resultState === "Win" ? "VICTORY!" : (resultState === "Lose" ? "DEFEAT!" : "Battle Log");
        if (endMessage) addLogEntry(endMessage, resultState === "Win" ? 'log-victory' : (resultState === "Lose" ? 'log-defeat' : 'system'), true);
        elBattleLogOverlay.classList.remove('is-hidden');
        elBattleLogOverlay.classList.add('is-visible');
    } else {
        elBattleLogOverlay.classList.remove('is-visible');
    }
}

function addLogEntry(message, type = "system", forceShow = false) {
    if (!elBattleLogEntries) return;
    const entry = document.createElement('p');
    entry.classList.add(`log-entry-${type}`);
    entry.innerHTML = message;
    elBattleLogEntries.appendChild(entry);
    elBattleLogEntries.scrollTop = elBattleLogEntries.scrollHeight;
    if (forceShow && elBattleLogOverlay && !elBattleLogOverlay.classList.contains('is-visible')) {
        renderBattleLogOverlay(true);
    }
}

function renderPseudomap() {
    if (!elPseudomapTrack) { wsLogger("UI_RENDERER_PSEUDOMAP_ERROR: Pseudomap track element not found."); return; }
    elPseudomapTrack.innerHTML = '';
    const allUnitsForMap = bState.units ? bState.units.filter(u => u.status !== "Defeated") : [];
    if (allUnitsForMap.length === 0) { return; }
    allUnitsForMap.sort((a, b) => (a.pseudoPos || 0) - (b.pseudoPos || 0));
    let validBasicTargets = [];
    const activeUnit = getActiveUnit();
    if (wsMode === "idle" && activeUnit && activeUnit.type === "Ally" && bState.battleState === "Ongoing") {
        validBasicTargets = getValidBasicAttackTargetIdsForUI(activeUnit, allUnitsForMap);
    }
    allUnitsForMap.forEach(unit => {
        const frame = document.createElement('div');
        frame.classList.add('pseudomap-unit-frame', unit.type.toLowerCase());
        frame.dataset.unitId = unit.id;
        if (unit.id === bState.activeUnitID) {
            frame.classList.add('active');
            if (wsMode === "idle") frame.classList.add('active-turn-idle');
        }
        if (unit.status === "EndTurn") frame.classList.add('end-turn');
        if (wsMode === "idle" && validBasicTargets.includes(unit.id)) {
            frame.classList.add('valid-basic-attack-target');
        }
        const portrait = document.createElement('img');
        portrait.src = getImagePathForUnit(unit.portraitFilename, unit.type, "portraitHead");
        portrait.alt = (unit.name || "Unit") + " Portrait";
        portrait.classList.add('pseudomap-portrait');
        portrait.onerror = function() { this.src = getImagePathForUnit(null, unit.type, "portraitHead", true); };
        frame.appendChild(portrait);
        elPseudomapTrack.appendChild(frame);
    });
}

// --- UI Hint and Targeting Visual Functions ---
function ui_showEndTurnHint(unitId, show) {
    const unitFrame = elPseudomapTrack ? elPseudomapTrack.querySelector(`.pseudomap-unit-frame[data-unit-id="${unitId}"]`) : null;
    if (unitFrame && bState.activeUnitID === unitId) {
        unitFrame.classList.toggle('active-turn-first-tap', show);
        unitFrame.classList.toggle('can-double-tap-end-turn', show);
        if(show) unitFrame.classList.remove('active-turn-idle');
        else if (wsMode === "idle") unitFrame.classList.add('active-turn-idle');
    }
}

function ui_highlightPotentialBasicAttackTarget(targetUnitId, show) {
    const unitFrame = elPseudomapTrack ? elPseudomapTrack.querySelector(`.pseudomap-unit-frame[data-unit-id="${targetUnitId}"]`) : null;
    if (unitFrame) {
        unitFrame.classList.toggle('potential-basic-attack-target', show);
        unitFrame.classList.toggle('pulsing', show);
    }
}

function ui_renderSelectPrimaryTargetMode(validIds, allFrames) {
    if (elPseudomapArea) elPseudomapArea.classList.add('targeting-select-primary');
    allFrames.forEach(f => {
        f.classList.remove('active-turn-idle', 'valid-basic-attack-target');
        f.classList.toggle('valid-primary-target', validIds.includes(f.dataset.unitId));
        f.classList.toggle('invalid-primary-target', !validIds.includes(f.dataset.unitId));
    });
}

function ui_renderConfirmAreaMode(primaryId, affectedIds, allFrames) {
    if (elPseudomapArea) {
        elPseudomapArea.classList.remove('targeting-select-primary');
        elPseudomapArea.classList.add('targeting-confirm-area');
    }
     allFrames.forEach(f => {
        f.classList.remove('active-turn-idle', 'valid-basic-attack-target', 'valid-primary-target', 'invalid-primary-target');
        const unitId = f.dataset.unitId;
        f.classList.toggle('primary-selected-for-effect', unitId === primaryId);
        f.classList.toggle('affected-by-action', affectedIds.includes(unitId));
    });
}

function ui_clearAllTargetingVisuals() {
    if (elPseudomapArea) {
        elPseudomapArea.classList.remove('targeting-select-primary', 'targeting-confirm-area', 'targeting-revive');
    }
    const allUnitFrames = elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
    allUnitFrames.forEach(frame => {
        frame.classList.remove(
            'valid-primary-target', 'invalid-primary-target',
            'primary-selected-for-effect', 'affected-by-action',
            'potential-basic-attack-target', 'pulsing',
            'active-turn-first-tap', 'can-double-tap-end-turn',
            'revive-target'
        );
    });
}

function ui_resetIdleHighlights() {
    wsLogger("UI_RENDERER: Resetting idle state highlights.");
    const allFrames = elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
    allFrames.forEach(frame => {
        frame.classList.remove(
            'potential-basic-attack-target',
            'pulsing',
            'active-turn-first-tap',
            'can-double-tap-end-turn'
        );
    });
    renderPseudomap();
}


// --- Animation & Scroll Functions ---
function ui_playDeathAnimation(elementToAnimate) {
    wsLogger(`UI_ANIM: Playing death animation for element.`);
    elementToAnimate.classList.add('unit-death-animation');
    elementToAnimate.style.pointerEvents = 'none';
}

/**
 * Creates a feedback popup (e.g., for damage, healing) that animates and disappears.
 * @param {HTMLElement} anchorElement The DOM element to anchor the popup to.
 * @param {string} text The text to display in the popup.
 * @param {string} popupClass A CSS class for styling (e.g., 'damage-popup', 'heal-popup').
 * @param {object} [options={}] Additional options for positioning.
 * @param {'center'|'top'} [options.verticalOrigin='center'] The vertical point on the anchor to originate from.
 * @param {number} [options.yOffset=0] An additional vertical pixel offset.
 */
function ui_createFeedbackPopup(anchorElement, text, popupClass, options = {}) {
    if (!anchorElement) {
        wsLogger(`UI_ANIM_ERROR: Anchor element for pop-up not provided.`);
        return;
    }
    const { verticalOrigin = 'center', yOffset = 0 } = options;
    const rect = anchorElement.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.classList.add('feedback-popup', popupClass);
    popup.textContent = text;
    
    let topPosition = (verticalOrigin === 'top') 
        ? rect.top 
        : rect.top + rect.height / 2;
    popup.style.top = `${topPosition + yOffset}px`;
    
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.transform = 'translateX(-50%) translateY(-50%) scale(0.5)';
    
    document.body.appendChild(popup);

    requestAnimationFrame(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateX(-50%) translateY(-150%) scale(1)';
    });

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(-200%) scale(0.8)';
    }, 1400); // Durasi diperpanjang

    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1900); // Waktu remove diperpanjang
}

function scrollToActiveUnitInPseudomap() {
    if (!elPseudomapArea || !elPseudomapTrack || !bState || !bState.activeUnitID) return;
    const activeUnitFrame = elPseudomapTrack.querySelector(`.pseudomap-unit-frame[data-unit-id="${bState.activeUnitID}"]`);
    if (!activeUnitFrame) return;

    const areaRect = elPseudomapArea.getBoundingClientRect();
    const unitCenterInTrack = activeUnitFrame.offsetLeft + (activeUnitFrame.offsetWidth / 2);
    const areaCenter = areaRect.width / 2;
    let scrollTarget = unitCenterInTrack - areaCenter;
    const maxScrollLeft = elPseudomapTrack.scrollWidth - elPseudomapArea.clientWidth;
    scrollTarget = Math.max(0, Math.min(scrollTarget, maxScrollLeft));

    if (Math.abs(elPseudomapArea.scrollLeft - scrollTarget) > 1) {
        elPseudomapArea.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
}

function scrollToPlayerHero(heroId, centerIfPossible = true) {
    if (!elPlayerHeroesCarousel || !elPlayerHeroesDeck || !bState || !bState.units) return;
    const playerHeroes = bState.units.filter(unit => unit.type === "Ally" && unit.status !== "Defeated");
    const heroIndex = playerHeroes.findIndex(hero => hero.id === heroId);
    if (heroIndex === -1) return;
    const heroCardElement = elPlayerHeroesCarousel.querySelector(`.character-card.player-card[data-unit-id="${heroId}"]`);
    if (!heroCardElement) return;

    const carousel = elPlayerHeroesCarousel;
    const cardWidth = heroCardElement.offsetWidth;
    const cardGapStyle = getComputedStyle(carousel).gap;
    const cardGap = cardGapStyle && cardGapStyle !== 'normal' ? parseInt(cardGapStyle) : 10;
    const cardWidthWithGap = cardWidth + cardGap;
    const deckContainerWidth = elPlayerHeroesDeck.offsetWidth;

    let targetScrollPositionPx = heroIndex * cardWidthWithGap;
    if (centerIfPossible) {
        targetScrollPositionPx -= (deckContainerWidth / 2) - (cardWidthWithGap / 2);
    }
    const maxScrollOffsetPx = Math.max(0, (playerHeroes.length * cardWidthWithGap) - deckContainerWidth - cardGap);
    targetScrollPositionPx = Math.max(0, Math.min(targetScrollPositionPx, maxScrollOffsetPx));
    elPlayerHeroesCarousel.style.transform = `translateX(-${targetScrollPositionPx}px)`;
    currentPlayerHeroStartIndex = Math.round(targetScrollPositionPx / cardWidthWithGap);
}

function scrollToEnemyInCarousel(enemyId) {
    if (!bState || !bState.units) return;
    const enemies = bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated");
    const enemyIndex = enemies.findIndex(enemy => enemy.id === enemyId);
    if (enemyIndex !== -1 && enemyIndex !== currentEnemyIndex) {
        currentEnemyIndex = enemyIndex;
        if (typeof renderEnemyStage === "function") {
            renderEnemyStage();
        }
    }
}

/**
 * FUNGSI BARU: Merender ulang pseudomap untuk mode pemilihan target revive.
 * Mengganti unit yang hidup dengan unit sekutu yang telah kalah.
 * @param {string[]} defeatedAllyIds - Array berisi ID unit sekutu yang kalah.
 */
function ui_renderReviveTargetingMode(defeatedAllyIds) {
    if (!elPseudomapTrack) {
        wsLogger("UI_RENDERER_REVIVE_ERROR: Pseudomap track element not found.");
        return;
    }

    // 1. Bersihkan isi pseudomap yang sekarang
    elPseudomapTrack.innerHTML = '';
    // Tambahkan kelas khusus ke container untuk styling
    if (elPseudomapArea) elPseudomapArea.classList.add('targeting-revive');

    wsLogger(`UI_RENDERER_REVIVE: Rendering revive targets: ${defeatedAllyIds.join(', ')}`);

    // 2. Loop melalui setiap ID hero yang kalah dan buat frame untuk mereka
    defeatedAllyIds.forEach(unitId => {
        const unit = getUnitById(unitId); // getUnitById sudah ada, kita gunakan lagi
        if (!unit) return;

        // 3. Buat elemen frame, sama seperti di renderPseudomap() tapi dengan kelas berbeda
        const frame = document.createElement('div');
        // Gunakan kelas yang sudah ada agar bentuk diamond tetap sama, lalu tambah kelas baru
        frame.classList.add('pseudomap-unit-frame', 'ally', 'revive-target');
        frame.dataset.unitId = unit.id; // Simpan ID di data-attribute

        const portrait = document.createElement('img');
        portrait.src = getImagePathForUnit(unit.portraitFilename, unit.type, "portraitHead");
        portrait.alt = (unit.name || "Fallen Hero") + " Portrait";
        portrait.classList.add('pseudomap-portrait');
        portrait.onerror = function() { this.src = getImagePathForUnit(null, unit.type, "portraitHead", true); };

        // Tambahkan efek grayscale agar terlihat 'mati'
        portrait.style.filter = 'grayscale(100%) brightness(0.8)';

        frame.appendChild(portrait);
        elPseudomapTrack.appendChild(frame);
    });
}


wsLogger("UI_RENDERER_JS: ui_renderer.js (with popup fixes) loaded.");
