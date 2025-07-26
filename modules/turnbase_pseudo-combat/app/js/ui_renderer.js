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
 * Helper untuk mendapatkan ID target serangan dasar yang valid untuk disorot di UI.
 * Versi ini menerapkan aturan jarak spesifik untuk Melee dan Ranged.
 * @param {object} actorUnit - Objek unit yang sedang aktif.
 * @param {Array<object>} allAliveUnits - Array semua objek unit yang masih hidup.
 * @returns {Array<string>} Array berisi ID unit yang valid sebagai target serangan dasar.
 */
function getValidBasicAttackTargetIdsForUI(actorUnit, allAliveUnits) {
    if (!actorUnit || actorUnit.type !== "Ally" || !allAliveUnits || !bState?._turnOrder) return [];

    const numAlive = bState._turnOrder.length;
    if (numAlive <= 1) return [];

    const aliveEnemies = allAliveUnits.filter(u => u.type === "Enemy");
    if (aliveEnemies.length === 0) return [];

    const actorRole = actorUnit.role || "Melee";
    let validTargetPseudoPositions = [];

    // Logika targeting dipisah berdasarkan Role
    if (actorRole === "Ranged") {
        // Ranged HANYA bisa menyerang pada Jarak 2
        wsLogger(`UI_RENDERER_TARGETING: ${actorUnit.name} adalah Ranged. Menargetkan jarak 2.`);
        if (numAlive > 2) validTargetPseudoPositions.push(2); // Jarak 2 ke depan
        if (numAlive > 3) validTargetPseudoPositions.push(numAlive - 2); // Jarak 2 ke belakang (sirkular)
    } else {
        // Melee (atau role lain) HANYA bisa menyerang pada Jarak 1
        wsLogger(`UI_RENDERER_TARGETING: ${actorUnit.name} adalah Melee. Menargetkan jarak 1.`);
        if (numAlive > 1) validTargetPseudoPositions.push(1); // Jarak 1 ke depan
        if (numAlive > 2) validTargetPseudoPositions.push(numAlive - 1); // Jarak 1 ke belakang (sirkular)
    }

    // Pastikan posisi unik, penting jika jumlah unit sedikit
    validTargetPseudoPositions = [...new Set(validTargetPseudoPositions)];

    const validTargets = aliveEnemies.filter(enemy => validTargetPseudoPositions.includes(enemy.pseudoPos));

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

// --- FUNGSI refreshAllUIElements VERSI FINAL 2.0 (DENGAN PERBAIKAN SHIELD DAMAGE POP-UP) ---
function refreshAllUIElements(passedPreviousBState = null) {
    wsLogger("UI_RENDERER: refreshAllUIElements CALLED.");
    if (!bState || Object.keys(bState).length === 0 || !bState.units) {
        wsLogger("UI_RENDERER_ERROR: Battle state (bState) is empty or invalid.");
        return;
    }

    renderStatsPanel();

    const activeUnit = getActiveUnit();
    if (activeUnit && activeUnit.type === 'Enemy') {
        if (!passedPreviousBState || activeUnit.id !== passedPreviousBState.activeUnitID) {
            scrollToEnemyInCarousel(activeUnit.id);
        }
    }

    const damagedUnitData = [], healedUnitData = [], defeatedUnitData = [];
    const shieldGainedData = [], shieldDamagedData = [];
    const revivedUnitData = [];
    let spGained = 0, spSpent = 0, stunnedUnitId = null;
    let attackerId = null;


    // Cek apakah ada aksi serangan atau skill yang dilakukan oleh unit
    if (bState.lastActionDetails && bState.lastActionDetails.actorId) {
        const actorId = bState.lastActionDetails.actorId;
        const commandId = bState.lastActionDetails.commandId || "";

        // Animasikan untuk aksi apa pun yang bukan dari item sistem atau efek status pasif
        if (!actorId.startsWith("SYSTEM_") && commandId !== "__STUNNED__") {
            attackerId = actorId;
        }
    }
    // --- AKHIR PERUBAHAN ---

    // Langkah 1: Kumpulkan semua data perubahan (Blok ini sudah benar)
    if (passedPreviousBState) {
        if (typeof bState.teamSP === 'number' && typeof passedPreviousBState.teamSP === 'number') {
            const spChange = bState.teamSP - passedPreviousBState.teamSP;
            if (spChange < 0) spSpent += -spChange;
        }
        if (bState.units && passedPreviousBState.units) {
            bState.units.forEach(currentUnit => {
                const prevUnitData = passedPreviousBState.units.find(prevU => prevU.id === currentUnit.id);
                if (!prevUnitData) return;
                
                if (prevUnitData.status === "Defeated" && currentUnit.status !== "Defeated") {
                    revivedUnitData.push({ unitId: currentUnit.id, type: currentUnit.type });
                }
                if (currentUnit.status === "Defeated" && prevUnitData.status !== "Defeated") {
                    defeatedUnitData.push({ unitId: currentUnit.id, type: currentUnit.type });
                }
                if (prevUnitData.stats && currentUnit.stats) {
                    const oldHp = prevUnitData.stats.hp, newHp = currentUnit.stats.hp;
                    const oldShield = prevUnitData.stats.shieldHP || 0, newShield = currentUnit.stats.shieldHP || 0;
                    const hpChange = newHp - oldHp, shieldChange = newShield - oldShield;
                    if (hpChange < 0) {
                        damagedUnitData.push({ unitId: currentUnit.id, amount: Math.abs(hpChange) + Math.abs(shieldChange), type: currentUnit.type });
                    } else if (hpChange === 0 && shieldChange < 0) {
                        shieldDamagedData.push({ unitId: currentUnit.id, amount: Math.abs(shieldChange), type: currentUnit.type });
                    }
                    if (hpChange > 0) {
                        healedUnitData.push({ unitId: currentUnit.id, amount: hpChange, type: currentUnit.type });
                    }
                    if (shieldChange > 0) {
                        shieldGainedData.push({ unitId: currentUnit.id, amount: shieldChange, type: currentUnit.type });
                    }
                }
            });
        }
    }
    if (bState.lastActionDetails) {
        if (bState.lastActionDetails.actorId?.startsWith("SYSTEM_ITEM")) {
            wsLogger("UI_RENDERER: Processing SYSTEM_ITEM action details from flag.");
            const effects = bState.lastActionDetails.effects || [];
            const spEffect = effects.find(e => e.type === 'sp_gain');
            if (spEffect && spEffect.amount > 0) {
                spGained += spEffect.amount;
            }
            const healEffects = effects.filter(e => e.type === 'heal' && e.amount > 0);
            if (healEffects.length > 0) {
                healEffects.forEach(effect => {
                    healedUnitData.push({ unitId: effect.unitId, amount: effect.amount, type: 'Ally' });
                });
            }
            const shieldEffects = effects.filter(e => e.type === 'shield' && e.amount > 0);
            if (shieldEffects.length > 0) {
                shieldEffects.forEach(effect => {
                    shieldGainedData.push({ unitId: effect.unitId, amount: effect.amount, type: 'Ally' });
                });
            }
            bState.lastActionDetails = null;
        }
        else if (bState.lastActionDetails.actionOutcome === "STUNNED") {
            stunnedUnitId = bState.lastActionDetails.actorId;
        }
    }

    // Langkah 2: Tampilkan semua pop-up "efek samping" yang aman secara INSTAN
    const defeatedIds = defeatedUnitData.map(d => d.unitId);
    const enemyPopupOptions = { verticalOrigin: 'top', yOffset: 50 };

    damagedUnitData.filter(d => !defeatedIds.includes(d.unitId)).forEach(data => {
        ui_createFeedbackPopup(findBestAnchorElement(data.unitId), `-${data.amount}`, 'damage-popup', data.type === 'Enemy' ? enemyPopupOptions : {});
    });
    
 
    shieldDamagedData.filter(d => !defeatedIds.includes(d.unitId)).forEach(data => {
        ui_createFeedbackPopup(findBestAnchorElement(data.unitId), `-${data.amount}`, 'shield-popup', data.type === 'Enemy' ? enemyPopupOptions : {});
    });


    healedUnitData.forEach(data => ui_createFeedbackPopup(findBestAnchorElement(data.unitId), `+${data.amount}`, 'heal-popup'));
    shieldGainedData.forEach(data => {
        setTimeout(() => {
            ui_createFeedbackPopup(findBestAnchorElement(data.unitId), `+${data.amount}`, 'shield-popup');
        }, 500); 
    });

    revivedUnitData.forEach(data => {
        setTimeout(() => {
            // 1. Buat pop-up di Hero Card (seperti sebelumnya)
            const cardAnchor = findBestAnchorElement(data.unitId);
            if (cardAnchor) {
                ui_createFeedbackPopup(cardAnchor, 'Respawn', 'info-popup', { verticalOrigin: 'center' });
            }
    
            // 2. Cari frame di pseudomap untuk diberi animasi kilat
            const frameAnchor = document.querySelector(`.pseudomap-unit-frame[data-unit-id="${data.unitId}"]`);
            if (frameAnchor) {
                frameAnchor.classList.add('unit-respawn-flash');
    
                // 3. Hapus kelas animasi setelah selesai agar bisa dipicu lagi nanti
                setTimeout(() => {
                    frameAnchor.classList.remove('unit-respawn-flash');
                }, 1200); // Durasi harus sama dengan durasi animasi di CSS
            }
    
        }, 150);
    });

    if (spGained > 0) ui_createFeedbackPopup(elTeamResourcesDisplay, `+${spGained} SP`, 'sp-gain-popup');
    if (spSpent > 0) ui_createFeedbackPopup(elTeamResourcesDisplay, `-${spSpent} SP`, 'sp-spent-popup');
    if (stunnedUnitId) ui_createFeedbackPopup(elPseudomapArea, 'Stunned!', 'info-popup', { verticalOrigin: 'top', yOffset: 15 });

    // Langkah 3: Definisikan fungsi untuk me-render ulang UI utama
    const performStandardRender = () => {
        renderDynamicBackground();
        renderTopBar();
        renderEnemyStage();
        renderPlayerHeroesDeck();
        renderPlayerActionBar();
        renderPseudomap();

        if (bState.lastActionDetails?.actionOutcome === "NO_TARGET_IN_RANGE") {
            if (passedPreviousBState?.lastActionDetails?.actionOutcome !== "NO_TARGET_IN_RANGE") {
                ui_createFeedbackPopup(elPseudomapArea, 'No Target', 'info-popup', { verticalOrigin: 'top', yOffset: 15 });
            }
            bState.lastActionDetails.actionOutcome = null;
        }

        if (elBattleLogOverlay?.classList.contains('is-visible') && !bState.showLog) renderBattleLogOverlay(false);
        if (elPseudomapArea) elPseudomapArea.classList.remove('is-hidden');
        if (elPlayerHeroesDeck) elPlayerHeroesDeck.classList.remove('is-hidden');
        if (typeof scrollToActiveUnitInPseudomap === "function") requestAnimationFrame(scrollToActiveUnitInPseudomap);
        const activeUnitForScroll = getActiveUnit();
        if (activeUnitForScroll?.type === "Ally" && typeof scrollToPlayerHero === "function") {
            requestAnimationFrame(() => scrollToPlayerHero(activeUnitForScroll.id, true));
        }
        const allUnitFrames = elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
        if (wsMode === "selecting_primary_target") ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, allUnitFrames);
        else if (wsMode === "confirming_effect_area") ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, allUnitFrames);
        else if (wsMode === "confirming_basic_attack") allUnitFrames.forEach(frame => ui_highlightPotentialBasicAttackTarget(frame.dataset.unitId, frame.dataset.unitId === lastTappedUnitId));
    };

    // Langkah 4: Tentukan kapan harus menjalankan render ulang
    if (defeatedUnitData.length > 0) {
        wsLogger("UI_RENDERER: Defeated unit(s) detected. Starting death animation sequence.");
        
        defeatedUnitData.forEach(data => {
            const fatalDamageData = damagedUnitData.find(d => d.unitId === data.unitId);
            if (fatalDamageData) {
                ui_createFeedbackPopup(findBestAnchorElement(data.unitId), `-${fatalDamageData.amount}`, 'damage-popup', data.type === 'Enemy' ? enemyPopupOptions : {});
            }

            const cardElement = findBestAnchorElement(data.unitId);
            if (cardElement) {
                const hpBar = cardElement.querySelector('.hp-bar');
                if (hpBar) hpBar.style.width = '0%';
                setTimeout(() => {
                    ui_playDeathAnimation(cardElement);
                    ui_createFeedbackPopup(cardElement, 'KO!', 'damage-popup', { verticalOrigin: 'center' });
                }, 200);
            }
        });
        
        setTimeout(performStandardRender, 1600);
    } else {
        wsLogger("UI_RENDERER: No defeated units. Performing standard render.");
        performStandardRender();
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
    
    // --- PERBAIKAN BUG MUSUH HANTU ADA DI SINI ---
    // Filter musuh untuk hanya menyertakan yang statusnya BUKAN "Defeated".
    const enemies = bState.units ? bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated") : [];
    // --- AKHIR DARI PERBAIKAN ---
    
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

        const shieldHP = enemy.stats?.shieldHP || 0;
        if (shieldHP > 0) {
            const shieldBar = document.createElement('div');
            shieldBar.classList.add('shield-bar');
            const shieldPercentage = maxHp > 0 ? (shieldHP / maxHp) * 100 : 0;
            shieldBar.style.width = `${Math.min(100, shieldPercentage)}%`;
            const shieldText = document.createElement('div');
            shieldText.classList.add('shield-text');
            shieldText.textContent = shieldHP;
            hpContainer.appendChild(shieldBar);
            hpContainer.appendChild(shieldText);
        }

        detailsWrapper.appendChild(nameElement);
        detailsWrapper.appendChild(hpContainer);
        
        const spriteContainer = document.createElement('div');
        spriteContainer.classList.add('character-sprite-container');
        const sprite = document.createElement('img');
        sprite.src = getImagePathForUnit(enemy.fullBodyFilename, enemy.type, "fullBody");
        sprite.alt = (enemy.name || "Unknown Enemy") + " Sprite";
        sprite.classList.add('character-sprite');
        sprite.onerror = function() { this.src = getImagePathForUnit(null, enemy.type, "fullBody", true); };
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
        const shieldHP = hero.stats?.shieldHP || 0;
        
        // Render shield bar if shieldHP is greater than 0
        if (shieldHP > 0) {
            const shieldBar = document.createElement('div');
            shieldBar.classList.add('shield-bar');
            const shieldPercentage = maxHp > 0 ? (shieldHP / maxHp) * 100 : 0;
            shieldBar.style.width = `${Math.min(100, shieldPercentage)}%`;

            const shieldText = document.createElement('div');
            shieldText.classList.add('shield-text');
            shieldText.textContent = shieldHP;

            hpContainer.appendChild(shieldBar);
            hpContainer.appendChild(shieldText);
        }

        if (hero.stats.maxGauge > 0) {
            const gaugeOverlayContainer = document.createElement('div');
            gaugeOverlayContainer.className = 'gauge-overlay-container';

            const gaugeFill = document.createElement('div');
            gaugeFill.className = 'gauge-fill';
            
            const gaugePercentage = (hero.stats.gauge / hero.stats.maxGauge) * 100;
            gaugeFill.style.height = `${gaugePercentage}%`;


            gaugeOverlayContainer.appendChild(gaugeFill);
            spriteContainer.appendChild(gaugeOverlayContainer); // Masukkan ke dalam container sprite

            // Tambahkan kelas jika ultimate siap
            if (hero.stats.gauge >= hero.stats.maxGauge) {
                card.classList.add('ultimate-ready');
            }
        }

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

    // --- PERUBAHAN DI SINI ---
    // Filter command untuk HANYA menampilkan yang BUKAN ultimate.
    const skills = activeUnit.commands 
        ? activeUnit.commands.filter(cmd => cmd.type !== "BasicAttack" && !cmd.isUltimate) 
        : [];
    // --- AKHIR PERUBAHAN ---

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


/**
 * Renders the pseudomap.
 * Versi ini menggunakan _turnOrder sebagai sumber kebenaran untuk urutan visual,
 * membuatnya lebih tangguh terhadap perubahan pseudoPos.
 */
function renderPseudomap() {
    if (!elPseudomapTrack) {
        wsLogger("UI_RENDERER_PSEUDOMAP_ERROR: Pseudomap track element not found.");
        return;
    }
    elPseudomapTrack.innerHTML = '';

    // --- PERUBAHAN DI SINI ---
    // 1. Dapatkan daftar unit terurut, lalu susun kembali agar seimbang secara visual.
    const unitsToRender = createVisuallyBalancedOrder(getOrderedAliveUnitsForRender());
    // --- AKHIR PERUBAHAN ---

    // 2. Dapatkan target serangan dasar yang valid (jika dalam mode idle)
    let validBasicTargets = [];
    const currentActiveUnit = getActiveUnit();
    if (wsMode === "idle" && currentActiveUnit && currentActiveUnit.type === "Ally" && bState.battleState === "Ongoing") {
        const allAliveUnits = bState.units.filter(u => u.status !== "Defeated");
        validBasicTargets = getValidBasicAttackTargetIdsForUI(currentActiveUnit, allAliveUnits);
    }

    // 3. Langsung render setiap unit sesuai urutan
    unitsToRender.forEach(unit => {
        if (!unit) return;

        const frame = document.createElement('div');
        frame.classList.add('pseudomap-unit-frame', unit.type.toLowerCase());
        frame.dataset.unitId = unit.id;

        // Logika styling (active, end-turn, stun) tetap sama dan aman
        if (unit.id === bState.activeUnitID) {
            frame.classList.add('active');
            if (wsMode === "idle") frame.classList.add('active-turn-idle');
        } else if (unit.status === "EndTurn") {
            frame.classList.add('end-turn');
        }

        if (wsMode === "idle" && validBasicTargets.includes(unit.id)) {
            frame.classList.add('valid-basic-attack-target');
        }

        const isStunned = unit.statusEffects?.debuffs?.some(e => e.name === "Stun");
        if (isStunned) {
            frame.classList.add('is-stunned');
        }

        const portrait = document.createElement('img');
        portrait.src = getImagePathForUnit(unit.portraitFilename, unit.type, "portraitHead");
        portrait.alt = (unit.name || "Unit") + " Portrait";
        portrait.classList.add('pseudomap-portrait');
        portrait.onerror = function() {
            this.src = getImagePathForUnit(null, unit.type, "portraitHead", true);
        };

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
    const { verticalOrigin = 'center', yOffset = 0, verticalAnimation = -150 } = options;
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
        popup.style.transform = `translateX(-50%) translateY(${verticalAnimation}%) scale(1)`;
    });

    setTimeout(() => {
        popup.style.opacity = '0';
        // Gerakan menghilang sedikit lebih jauh dari posisi animasi
        popup.style.transform = `translateX(-50%) translateY(${verticalAnimation - 50}%) scale(0.8)`;
    }, 1400);

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




/**
 * Renders and animates the complete end-of-battle screen with the new interactive design.
 * @param {object} bState The complete bState object containing the fully populated `battleResultSummary`.
 */
function renderBattleEndScreen(bState) {
    wsLogger("UI_RENDERER: Rendering new battle end screen (v2.3 - Final Polish).");
    // Referensi ke semua elemen UI
    const screen = document.getElementById('battle-end-screen');
    const titleEl = document.getElementById('end-screen-title');
    const heroContainer = document.getElementById('hero-results-container');
    const enemiesListContainer = document.getElementById('defeated-enemies-list');
    const rewardsContainer = document.getElementById('rewards-container');
    const expGainedEl = document.getElementById('total-exp-gained');
    const winBonusEl = document.getElementById('win-bonus-text');
    const expToggleEl = document.getElementById('total-exp-toggle');
    const spoilsContentEl = document.getElementById('spoils-details-content');
    const enemyLevelText = document.getElementById('global-enemy-level-text');
    const enemyExpBar = document.getElementById('global-enemy-exp-bar-fill');
    const enemyLvlUpEl = document.getElementById('enemy-levelup-notification');

    if (!screen || !bState || !bState.battleResultSummary) {
        wsLogger("UI_RENDERER_ERROR: End screen elements or summary not found!");
        return;
    }

    const summary = bState.battleResultSummary;
    const battleInterface = document.getElementById('battle-interface');
    if (battleInterface) battleInterface.classList.add('is-fully-hidden');

    // Atur judul dan bersihkan konten lama
    titleEl.textContent = bState.battleState === 'Win' ? "VICTORY" : "DEFEAT";
    titleEl.className = bState.battleState === 'Win' ? "" : "defeat-title";
    heroContainer.innerHTML = '';
    enemiesListContainer.innerHTML = '';
    rewardsContainer.innerHTML = '';
    if(enemyLvlUpEl) enemyLvlUpEl.innerHTML = '';
    if(winBonusEl) winBonusEl.classList.add('is-hidden');
    if(enemyLvlUpEl) enemyLvlUpEl.classList.remove('is-visible');

    // Render Battle Spoils (Daftar Musuh) - tapi tetap tersembunyi
    const enemiesListUl = document.createElement('ul');
    if (summary.defeatedEnemiesWithExp?.length > 0) {
        summary.defeatedEnemiesWithExp.forEach(enemy => {
            const li = document.createElement('li');
            li.textContent = `${enemy.name || 'Unknown Enemy'} -> ${enemy.expGained} EXP`;
            enemiesListUl.appendChild(li);
        });
    } else {
        enemiesListUl.innerHTML = '<li>None</li>';
    }
    enemiesListContainer.appendChild(enemiesListUl);
    spoilsContentEl.style.maxHeight = '0px';
    expToggleEl.classList.remove('is-open');

    // Render Rewards (dengan pengurutan berdasarkan rarity)
    if (summary.rewards?.length > 0) {
        // Objek untuk menentukan urutan rarity
        const rarityOrder = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5,
            mythic: 6,
            ethereal: 7
        };

        // Urutkan array 'rewards' berdasarkan nilai dari rarityOrder
        summary.rewards.sort((a, b) => {
            const rarityA = rarityOrder[a.rarity.toLowerCase()] || 0;
            const rarityB = rarityOrder[b.rarity.toLowerCase()] || 0;
            return rarityA - rarityB;
        });

        // Loop melalui array yang sudah diurutkan untuk menampilkannya
        summary.rewards.forEach(reward => {
            const rewardP = document.createElement('p');
            rewardP.className = 'reward-item-entry';
            const rarityColors = { common: '#95a5a6', uncommon: '#2ecc71', rare: '#3498db', epic: '#9b59b6', legendary: '#f1c40f', mythic: '#e67e22', ethereal: '#e74c3c' };
            rewardP.style.color = rarityColors[reward.rarity.toLowerCase()] || 'var(--color-text-primary)';
            rewardP.textContent = `${reward.name} x${reward.quantity}`;
            rewardsContainer.appendChild(rewardP);
        });
    } else {
        rewardsContainer.innerHTML = '<p class="no-rewards-message">No items gained.</p>';
    }

    // Persiapkan kartu Hero (posisi awal, tanpa animasi)
    summary.heroesProgression.forEach(heroSummary => {
        const heroUnitData = getUnitById(heroSummary.id);
        if (!heroUnitData) return;
        const startPercent = heroSummary.expToLevelUpBefore > 0 ? (heroSummary.expBefore / heroSummary.expToLevelUpBefore) * 100 : 0;
        const card = document.createElement('div');
        card.className = 'hero-result-card';
        card.innerHTML = `
            <div class="hero-portrait-wrapper">
                <img src="${getImagePathForUnit(heroUnitData.portraitFilename, 'Ally', 'portraitHead')}" class="hero-result-portrait" data-hero-id="${heroSummary.id}" onerror="this.src='${getImagePathForUnit(null, 'Ally', 'portraitHead', true)}'">
            </div>
            <div class="hero-result-details">
                <div class="hero-result-info">
                    <span class="hero-result-name">${heroUnitData.name}</span>
                    <span class="hero-result-level" data-hero-id="${heroSummary.id}">
                        <span class="level-value">Lv. ${heroSummary.levelBefore}</span>
                        <span class="level-arrow"> &rarr; </span>
                        <span class="level-value-after">Lv. ${heroSummary.levelAfter}</span>
                    </span>
                </div>
                <div class="exp-bar-container">
                    <div class="exp-bar-fill" style="width: ${startPercent}%;"></div>
                </div>
            </div>`;
        heroContainer.appendChild(card);
    });
    
    // Persiapkan bar musuh di posisi awalnya
    const enemyStartPercent = summary.enemyExpToLevelUpBefore > 0 ? ((summary.enemyExpBefore || 0) / summary.enemyExpToLevelUpBefore) * 100 : 0;
    if(enemyLevelText) enemyLevelText.textContent = `Lv. ${summary.enemyLevelBefore}`;
    if(enemyExpBar) {
        enemyExpBar.style.transition = 'none'; // Pastikan tidak ada animasi saat set posisi awal
        enemyExpBar.style.width = `${enemyStartPercent}%`;
    }

    // Tampilkan layar & mulai semua animasi
    screen.classList.remove('is-fully-hidden', 'is-hidden');
    requestAnimationFrame(() => screen.classList.add('is-visible'));

    setTimeout(() => {
        animateCounter(expGainedEl, 0, summary.totalExpGained, 800);
        if (summary.winBonusMultiplier > 1 && winBonusEl) {
            winBonusEl.textContent = `(Base: ${summary.baseExpGained} x${summary.winBonusMultiplier.toFixed(2)} Win Bonus)`;
            winBonusEl.classList.remove('is-hidden');
        }

        summary.heroesProgression.forEach(heroSummary => {
            animateExpAndLevelUp(heroSummary);
        });

        // Panggil animasi untuk bar musuh yang sudah disempurnakan
        animateGlobalEnemyExp(summary);
    }, 500);

    expToggleEl.onclick = () => {
        expToggleEl.classList.toggle('is-open');
        if (spoilsContentEl.style.maxHeight === '0px' || spoilsContentEl.style.maxHeight === '') {
            spoilsContentEl.style.maxHeight = spoilsContentEl.scrollHeight + "px";
        } else {
            spoilsContentEl.style.maxHeight = '0px';
        }
    };
}

/** Helper untuk animasi angka **/
function animateCounter(element, start, end, duration) {
    if(!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = `+${Math.floor(progress * (end - start) + start)}`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = `+${end}`;
        }
    };
    window.requestAnimationFrame(step);
}

/** Helper untuk animasi bar dan level up hero **/
function animateExpAndLevelUp(heroSummary) {
    const card = document.querySelector(`.hero-result-portrait[data-hero-id="${heroSummary.id}"]`)?.closest('.hero-result-card');
    if (!card) return;

    const expBarFill = card.querySelector('.exp-bar-fill');
    const portraitWrapper = card.querySelector('.hero-portrait-wrapper');
    const levelContainer = card.querySelector('.hero-result-level');

    const didLevelUp = heroSummary.levelAfter > heroSummary.levelBefore;
    const finalPercent = heroSummary.expToLevelUpAfter > 0 ? (heroSummary.expAfter / heroSummary.expToLevelUpAfter) * 100 : 0;
    
    if (!expBarFill || !portraitWrapper || !levelContainer) return;

    expBarFill.style.transition = 'width 1.5s cubic-bezier(0.25, 1, 0.5, 1)';

    if (didLevelUp) {
        expBarFill.style.width = '100%';
        setTimeout(() => {
            portraitWrapper.classList.add('portrait-level-up-flash');
            levelContainer.classList.add('leveled-up');
            
            expBarFill.style.transition = 'none';
            expBarFill.style.width = '0%';
            setTimeout(() => {
                expBarFill.style.transition = 'width 1s cubic-bezier(0.25, 1, 0.5, 1)';
                expBarFill.style.width = `${finalPercent}%`;
                setTimeout(() => portraitWrapper.classList.remove('portrait-level-up-flash'), 1000);
            }, 50);
        }, 1600);
    } else {
        expBarFill.style.width = `${finalPercent}%`;
        levelContainer.querySelector('.level-arrow').style.display = 'none';
        levelContainer.querySelector('.level-value-after').style.display = 'none';
    }
}

/** Helper untuk animasi bar EXP musuh global (naik & turun) **/
function animateGlobalEnemyExp(summary) {
    const expBarFill = document.getElementById('global-enemy-exp-bar-fill');
    const levelText = document.getElementById('global-enemy-level-text');
    const notificationEl = document.getElementById('enemy-levelup-notification');
    if (!expBarFill || !levelText || !notificationEl) return;

    const didLevelUp = summary.enemyLeveledUp;
    const didLevelDown = summary.enemyLevelAfter < summary.enemyLevelBefore;
    
    const finalPercent = (summary.enemyExpToLevelUpAfter || 0) > 0 ? ((summary.enemyExpAfter || 0) / summary.enemyExpToLevelUpAfter) * 100 : 0;

    // Terapkan animasi setelah jeda singkat
    setTimeout(() => {
        expBarFill.style.transition = 'width 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        if (didLevelUp) {
            expBarFill.style.width = '100%'; // Isi penuh bar saat ini
            setTimeout(() => {
                levelText.textContent = `Lv. ${summary.enemyLevelBefore} → ${summary.enemyLevelAfter}`;
                notificationEl.innerHTML = `<strong>A new threat emerges...</strong>`;
                notificationEl.classList.add('is-visible');
                
                expBarFill.style.transition = 'none';
                expBarFill.style.width = '0%';
                setTimeout(() => {
                    expBarFill.style.transition = 'width 1s cubic-bezier(0.25, 1, 0.5, 1)';
                    expBarFill.style.width = `${finalPercent}%`;
                }, 50);
            }, 1600);
        } else if (didLevelDown) {
            expBarFill.style.width = '0%'; // Animasikan bar menjadi kosong
            setTimeout(() => {
                 levelText.textContent = `Lv. ${summary.enemyLevelBefore} → ${summary.enemyLevelAfter}`;
                 
                 expBarFill.style.transition = 'none';
                 expBarFill.style.width = '100%'; // Reset bar ke penuh (dari level sebelumnya)
                 setTimeout(() => {
                    expBarFill.style.transition = 'width 1s cubic-bezier(0.25, 1, 0.5, 1)';
                    expBarFill.style.width = `${finalPercent}%`; // Animasikan ke posisi sisa EXP
                 }, 50);
            }, 1600);
        } else {
            // Jika tidak ada perubahan level, cukup animasikan ke posisi EXP akhir
            expBarFill.style.width = `${finalPercent}%`;
        }
    }, 500); // Delay awal untuk semua animasi bar musuh
}


function renderStatsPanel() {
    if (!elStatsPanelContent || !bState || !bState.units) {
        wsLogger("UI_RENDERER_STATS: Gagal merender panel statistik, elemen atau data tidak ditemukan.");
        return;
    }

    // Kosongkan konten sebelumnya
    elStatsPanelContent.innerHTML = '';

    // --- LOGIKA BARU DIMULAI DI SINI ---

    // 1. Ambil semua efek grup
    const allyGroupEffects = bState.active_effects?.filter(e => e.target_scope === 'team_allies') || [];
    const enemyGroupEffects = bState.active_effects?.filter(e => e.target_scope === 'team_enemies') || [];

    // 2. Fungsi helper untuk membuat "Badge"
    const createEffectBadge = (effect) => {
        // Cek tipe buff/debuff (contoh sederhana, bisa disesuaikan)
        const isBuff = ['sp_over_time'].includes(effect.type); // Tambahkan tipe buff lain di sini
        const badgeClass = isBuff ? 'buff' : 'debuff';
        const name = effect.source_item_name || effect.source_skill_name || effect.name || "Unknown Effect";
        
        return `
            <div class="effect-badge ${badgeClass}">
                <span class="name">${name}</span>
                ${(typeof effect.duration === 'number') ? `<span class="duration">[${effect.duration}]</span>` : ''}
            </div>
        `;
    };

    // 3. Render seksi untuk efek grup Tim Sekutu (Ally)
    if (allyGroupEffects.length > 0) {
        const section = document.createElement('div');
        section.className = 'stats-team-effects-section';
        let badgesHTML = '';
        allyGroupEffects.forEach(effect => {
            badgesHTML += createEffectBadge(effect);
        });
        section.innerHTML = `
            <h4>Ally Team Effects</h4>
            <div class="status-effects-container">${badgesHTML}</div>
        `;
        elStatsPanelContent.appendChild(section);
    }
    
    // (Tambahkan logika untuk 'Enemy Team Effects' di sini jika diperlukan, polanya sama)

    // --- AKHIR DARI LOGIKA BARU ---


    const allUnits = [...bState.units];

    allUnits.sort((a, b) => {
        if (a.type === 'Ally' && b.type === 'Enemy') return -1;
        if (a.type === 'Enemy' && b.type === 'Ally') return 1;
        return 0;
    });

    allUnits.forEach(unit => {
        const card = document.createElement('div');
        card.className = `stats-unit-card ${unit.type.toLowerCase()}`;

        const header = document.createElement('div');
        header.className = 'stats-unit-header';
        header.innerHTML = `
            <img src="${getImagePathForUnit(unit.portraitFilename, unit.type, 'portraitHead')}" class="stats-unit-portrait" onerror="this.src='${getImagePathForUnit(null, unit.type, "portraitHead", true)}'">
            <div class="stats-unit-info">
                <h3>${unit.name || 'Unknown Unit'}</h3>
                <p>Level ${unit.level || 1} ${unit.role || ''} ${unit.tier || ''}</p>
            </div>
        `;

        const statsList = document.createElement('ul');
        statsList.className = 'stats-list';
        const stats = unit.stats || {};
        statsList.innerHTML = `
            <li><span class="stat-name">HP</span> <span class="stat-value">${stats.hp || 0} / ${stats.maxHp || 0}</span></li>
            <li><span class="stat-name">ATK</span> <span class="stat-value">${stats.atk || 0}</span></li>
            <li><span class="stat-name">Shield</span> <span class="stat-value">${stats.shieldHP || 0}</span></li>
            <li><span class="stat-name">DEF</span> <span class="stat-value">${stats.def || 0}</span></li>
            <li><span class="stat-name">Gauge</span> <span class="stat-value">${stats.gauge || 0}%</span></li>
            <li><span class="stat-name">Position</span> <span class="stat-value">${unit.pseudoPos}</span></li>
        `;

        card.appendChild(header);
        card.appendChild(statsList);

        // --- LOGIKA BARU UNTUK EFEK INDIVIDUAL ---
        const buffs = unit.statusEffects?.buffs || [];
        const debuffs = unit.statusEffects?.debuffs || [];
        const individualEffects = [...buffs, ...debuffs];

        if (individualEffects.length > 0) {
            const container = document.createElement('div');
            container.className = 'status-effects-container';
            
            let badgesHTML = '';
            // Render debuff dulu agar lebih menonjol
            debuffs.forEach(effect => badgesHTML += createEffectBadge(effect));
            buffs.forEach(effect => badgesHTML += createEffectBadge(effect));
            
            container.innerHTML = badgesHTML;
            card.appendChild(container);
        }
        // --- AKHIR DARI LOGIKA BARU ---

        if (unit.id.includes('kyuris') && bState.progression_snapshot && bState.progression_snapshot.exerciseStatsProgression) {
            const progSection = document.createElement('div');
            progSection.className = 'exercise-progression-section';
            
            const progHeader = document.createElement('h4');
            progHeader.textContent = 'Exercise Progression';
            
            const progList = document.createElement('ul');
            progList.className = 'stats-list exercise-stats-list';

            bState.progression_snapshot.exerciseStatsProgression.forEach(prog => {
                const progItem = document.createElement('li');
                progItem.innerHTML = `
                    <span class="stat-name">${prog.id.replace('_', ' ')} (${prog.stats})</span>
                    <span class="stat-value">Lv. ${prog.level || 1}</span>
                `;
                progList.appendChild(progItem);
            });

            progSection.appendChild(progHeader);
            progSection.appendChild(progList);
            card.appendChild(progSection);
        }

        elStatsPanelContent.appendChild(card);
    });
}

/**
 * HELPER BARU: Mengambil unit yang hidup, diurutkan berdasarkan _turnOrder.
 * Ini adalah sumber kebenaran untuk urutan render di pseudomap.
 * @returns {Array<object>} Array objek unit yang sudah diurutkan.
 */
function getOrderedAliveUnitsForRender() {
    if (!bState || !bState.units || !bState._turnOrder) {
        wsLogger("UI_RENDERER_HELPER_ERROR: bState atau _turnOrder tidak ada.");
        return (bState.units || []).filter(u => u.status !== 'Defeated').sort((a,b) => a.pseudoPos - b.pseudoPos);
    }
    // Ubah _turnOrder (array of IDs) menjadi array of unit objects
    return bState._turnOrder
        .map(id => getUnitById(id))
        .filter(unit => unit && unit.status !== 'Defeated');
}

/**
 * HELPER BARU: Mengambil daftar unit terurut dan menyusunnya kembali
 * agar seimbang secara visual untuk ditampilkan di pseudomap.
 * @param {Array<object>} orderedUnits - Array unit yang sudah terurut berdasarkan giliran.
 * @returns {Array<object>} Array unit yang sudah siap dirender dengan seimbang.
 */
function createVisuallyBalancedOrder(orderedUnits) {
    const totalUnits = orderedUnits.length;
    if (totalUnits === 0) {
        return [];
    }

    // Unit aktif selalu berada di index 0 dari array input 'orderedUnits'
    const activeUnit = orderedUnits[0];

    // Hitung jumlah unit di sisi kiri
    const numOnLeft = Math.floor((totalUnits - 1) / 2);

    // Sisa unit akan berada di sisi kanan
    const numOnRight = totalUnits - 1 - numOnLeft;

    // Ambil unit-unit untuk sisi kanan dari array (setelah unit aktif)
    const rightSideUnits = orderedUnits.slice(1, 1 + numOnRight);
    
    // Ambil unit-unit untuk sisi kiri dari sisa array (bagian paling akhir)
    const leftSideUnits = orderedUnits.slice(1 + numOnRight);

    // Gabungkan dalam urutan visual yang benar: [Kiri, Tengah, Kanan]
    const finalVisualOrder = [...leftSideUnits, activeUnit, ...rightSideUnits];
    
    wsLogger(`VISUAL_BALANCE: Total: ${totalUnits}, Left: ${leftSideUnits.length}, Active: 1, Right: ${rightSideUnits.length}`);

    return finalVisualOrder;
}

wsLogger("UI_RENDERER_JS: ui_renderer.js (with stats panel logic) loaded.");