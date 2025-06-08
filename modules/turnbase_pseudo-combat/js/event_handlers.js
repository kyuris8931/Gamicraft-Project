// js/event_handlers.js
// Gamicraft WebScreen Event Handling Logic
// Versi dengan perbaikan highlight double tap, optimasi, dan penanganan flickering basic attack

// --- Konstanta ---
const DOUBLE_TAP_END_TURN_THRESHOLD = 400;
const DOUBLE_TAP_BASIC_ATTACK_THRESHOLD = 350;

// --- Variabel Global (didefinisikan di main.js atau di sini) ---
// bState, currentEnemyIndex, currentPlayerHeroStartIndex, wsMode,
// selectedActionDetails, validPrimaryTargetIds, selectedPrimaryTargetId, currentAffectedTargetIds
// akan diakses dari scope global.

// Variabel untuk deteksi swipe
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 40;
const SWIPE_TIME_THRESHOLD = 300;
let touchStartTime = 0;

// Variabel untuk deteksi double tap
let lastTapTimeOnActiveUnit = 0;
let lastTappedActiveUnitId = null;
let lastTapTimeOnTarget = 0;
let lastTappedTargetUnitId = null;

// Flag untuk konsistensi highlight tap pertama
let isWaitingForSecondTapEndTurn = false;
let isWaitingForSecondTapBasicAttack = false;

/**
 * Inisialisasi semua event listener utama.
 */
function initializeEventListeners() {
    wsLogger("EVENT_HANDLER: Initializing event listeners (Highlight Fix v4 - Basic Attack Flicker).");

    if (elBattleOptionsTrigger) elBattleOptionsTrigger.addEventListener('click', () => handleToggleBattleLog());
    if (elCloseLogBtn) elCloseLogBtn.addEventListener('click', () => handleToggleBattleLog(false));

    if (elPrevEnemyBtn) elPrevEnemyBtn.addEventListener('click', () => navigateEnemyCarousel(-1));
    if (elNextEnemyBtn) elNextEnemyBtn.addEventListener('click', () => navigateEnemyCarousel(1));

    if (elEnemyCarousel) {
        elEnemyCarousel.addEventListener('touchstart', (e) => handleTouchStart(e, 'enemy'), { passive: true });
        elEnemyCarousel.addEventListener('touchend', (e) => handleTouchEnd(e, 'enemy'), { passive: true });
        elEnemyCarousel.addEventListener('click', handleEnemyCarouselClick);
    }

    if (elPlayerHeroesCarousel) {
        elPlayerHeroesCarousel.addEventListener('touchstart', (e) => handleTouchStart(e, 'player'), { passive: true });
        elPlayerHeroesCarousel.addEventListener('touchend', (e) => handleTouchEnd(e, 'player'), { passive: true });
    }

    if (elActionButtonsGroup) {
        elActionButtonsGroup.addEventListener('click', handleActionButtonClick);
    }

    if (elPseudomapTrack) {
        elPseudomapTrack.addEventListener('click', handlePseudomapUnitClick);
    }

    // MODIFIKASI: Pastikan listener untuk tombol "Open WS Log" yang baru dikembalikan terpasang
    // Variabel elOpenWsLogBtn seharusnya sudah diinisialisasi di main.js jika tombolnya ada di HTML saat main.js load.
    // Jika tombol ditambahkan dinamis atau ID-nya berbeda, perlu penyesuaian.
    // Untuk tombol yang ada di Battle Log overlay:
    const openWsLogButtonFromBattleLog = document.getElementById('open-ws-log-btn');
    if (openWsLogButtonFromBattleLog) {
        openWsLogButtonFromBattleLog.addEventListener('click', handleToggleWsLoggerScreen);
        wsLogger("EVENT_HANDLER: Listener attached to #open-ws-log-btn in Battle Log.");
    } else {
        wsLogger("EVENT_HANDLER_WARN: Button #open-ws-log-btn NOT found in Battle Log for listener attachment.");
    }


    if (elCloseWsLoggerBtn) elCloseWsLoggerBtn.addEventListener('click', () => handleToggleWsLoggerScreen(false));
    if (elCopyWsLogBtn) elCopyWsLogBtn.addEventListener('click', handleCopyWsLog);
    if (elClearWsLogBtn) elClearWsLogBtn.addEventListener('click', handleClearWsLog);

    document.body.addEventListener('click', handleGlobalClickToCancelTargeting, true);

    document.querySelectorAll('.styled-button, .action-buttons-group button').forEach(button => {
        button.addEventListener('mousedown', (e) => createRipple(e, button));
    });
    wsLogger("EVENT_HANDLER: Event listeners initialization complete.");
}

function scrollToEnemyInCarousel(enemyId) {
    if (!bState || !bState.units) {
        wsLogger("SCROLL_ENEMY_WARN: bState.units not available.");
        return;
    }
    const enemies = bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated");
    const enemyIndex = enemies.findIndex(enemy => enemy.id === enemyId);

    if (enemyIndex !== -1 && enemyIndex !== currentEnemyIndex) {
        currentEnemyIndex = enemyIndex;
        if (typeof renderEnemyStage === "function") {
            renderEnemyStage();
            wsLogger(`SCROLL_ENEMY_INFO: Scrolled enemy carousel to ${enemyId} (index ${currentEnemyIndex}).`);
        } else {
            wsLogger("SCROLL_ENEMY_ERROR: renderEnemyStage function not found.");
        }
    } else if (enemyIndex === -1) {
        wsLogger(`SCROLL_ENEMY_WARN: Enemy with ID ${enemyId} not found in active enemies for carousel scroll.`);
    }
}

function handleToggleWsLoggerScreen(explicitShow = null) {
    if (!elWsLoggerScreen) {
        wsLogger("EVENT_HANDLER_ERROR: WS Logger screen element (#ws-logger-screen) not found.");
        return;
    }
    const isCurrentlyVisible = elWsLoggerScreen.classList.contains('is-visible');
    let showScreen = (explicitShow === null) ? !isCurrentlyVisible : explicitShow;

    if (showScreen) {
        elWsLoggerScreen.classList.remove('is-hidden');
        requestAnimationFrame(() => {
            elWsLoggerScreen.classList.add('is-visible');
        });
        // wsLogger("EVENT_HANDLER: WS Logger screen opened."); // Log standar, bisa di-filter nanti
    } else {
        elWsLoggerScreen.classList.remove('is-visible');
        function afterWsLogTransition() {
            if (!elWsLoggerScreen.classList.contains('is-visible')) {
                elWsLoggerScreen.classList.add('is-hidden');
            }
            elWsLoggerScreen.removeEventListener('transitionend', afterWsLogTransition);
        }
        elWsLoggerScreen.addEventListener('transitionend', afterWsLogTransition);
        setTimeout(() => {
             if (!elWsLoggerScreen.classList.contains('is-visible')) {
                elWsLoggerScreen.classList.add('is-hidden');
            }
        }, 350);
        // wsLogger("EVENT_HANDLER: WS Logger screen closed."); // Log standar
    }
}

/**
 * Menangani klik pada unit di Pseudomap.
 */
function handlePseudomapUnitClick(event) {
    const targetFrame = event.target.closest('.pseudomap-unit-frame');
    if (!targetFrame) return;

    const clickedUnitId = targetFrame.dataset.unitId;
    const currentTime = new Date().getTime();
    const activeUnit = getActiveUnit();

    if (wsMode === "idle" && activeUnit && activeUnit.id === bState.activeUnitID && !(bState.battleState === "Win" || bState.battleState === "Lose")) {
        if (clickedUnitId === activeUnit.id) { // Tap pada unit aktif sendiri (End Turn)
            wsLogger(`END_TURN_DEBUG: Clicked on active unit ${activeUnit.id}.`);
            if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId && (currentTime - lastTapTimeOnActiveUnit) < DOUBLE_TAP_END_TURN_THRESHOLD) {
                wsLogger(`EVENT_HANDLER: Double tap on ACTIVE unit ${activeUnit.id}. Ending turn.`);
                addLogEntry(`${activeUnit.name || 'Active unit'} ends their turn.`, "system-info");
                if (typeof sendCommandToTasker === "function") {
                    sendCommandToTasker("PLAYER_END_TURN", { actorId: activeUnit.id });
                }
                isWaitingForSecondTapEndTurn = false;
                resetDoubleTapState(); // Ini juga reset flag basic attack
                return;
            } else {
                lastTapTimeOnActiveUnit = currentTime;
                lastTappedActiveUnitId = clickedUnitId;
                isWaitingForSecondTapEndTurn = true;
                isWaitingForSecondTapBasicAttack = false; // Pastikan flag basic attack false
                wsLogger(`EVENT_HANDLER: First tap on ACTIVE unit ${activeUnit.id}. isWaitingForSecondTapEndTurn = true`);

                // MODIFIKASI: Bersihkan highlight basic attack SEBELUM menampilkan hint end turn
                if (typeof ui_clearIdleBasicAttackHighlights === "function") {
                    ui_clearIdleBasicAttackHighlights();
                    wsLogger("EVENT_HANDLER: Cleared basic attack highlights before showing end turn hint.");
                }

                if (typeof ui_showEndTurnHint === "function") {
                    ui_showEndTurnHint(clickedUnitId, true); // Tampilkan hint end turn (oranye)
                    setTimeout(() => {
                        if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId && new Date().getTime() - lastTapTimeOnActiveUnit >= DOUBLE_TAP_END_TURN_THRESHOLD) {
                            isWaitingForSecondTapEndTurn = false;
                            ui_showEndTurnHint(clickedUnitId, false);
                            if (wsMode === 'idle') resetDoubleTapState();
                        }
                    }, DOUBLE_TAP_END_TURN_THRESHOLD + 50);
                }
                // Panggil refresh setelah semua state tap pertama diatur
                if (typeof refreshAllUIElements === "function") refreshAllUIElements(typeof previousBState !== 'undefined' ? previousBState : null);
                return;
            }
        }

        let validBasicAttackTargets = [];
        if (typeof getValidBasicAttackTargetIdsForUI === "function") {
            validBasicAttackTargets = getValidBasicAttackTargetIdsForUI(activeUnit, bState.units);
        }

        if (validBasicAttackTargets.includes(clickedUnitId)) { // Tap pada target basic attack yang valid
            const tappedUnitObject = getUnitById(clickedUnitId);
            wsLogger(`BASIC_ATTACK_DEBUG: Clicked on valid basic attack target ${clickedUnitId}.`);
            if (isWaitingForSecondTapBasicAttack && lastTappedTargetUnitId === clickedUnitId && (currentTime - lastTapTimeOnTarget) < DOUBLE_TAP_BASIC_ATTACK_THRESHOLD) {
                wsLogger(`EVENT_HANDLER: Double tap on VALID BASIC ATTACK target ${clickedUnitId} by ${activeUnit.name}.`);
                addLogEntry(`${activeUnit.name} performs Basic Attack on ${tappedUnitObject?.name || clickedUnitId}.`, "ally-action-execute");
                if (typeof sendCommandToTasker === "function") {
                    sendCommandToTasker("PLAYER_BASIC_ATTACK", { actorId: activeUnit.id, targetId: clickedUnitId });
                }
                isWaitingForSecondTapBasicAttack = false;
                resetDoubleTapState(); // Ini juga reset flag end turn
                // ui_clearIdleBasicAttackHighlights sudah dipanggil setelah aksi dari refreshAllUIElements (jika bState berubah)
                // atau bisa dipanggil eksplisit di sini jika perlu.
                return;
            } else {
                lastTapTimeOnTarget = currentTime;
                lastTappedTargetUnitId = clickedUnitId;
                isWaitingForSecondTapBasicAttack = true;
                isWaitingForSecondTapEndTurn = false; // Pastikan flag end turn false
                wsLogger(`EVENT_HANDLER: First tap on POTENTIAL BASIC ATTACK target ${clickedUnitId}. isWaitingForSecondTapBasicAttack = true`);
                if (tappedUnitObject && tappedUnitObject.type === "Enemy") {
                    if (typeof scrollToEnemyInCarousel === "function") scrollToEnemyInCarousel(clickedUnitId);
                }
                // Panggil refresh untuk menampilkan highlight basic attack (jika ada style khusus untuk tap pertama)
                // atau untuk memastikan state UI konsisten.
                if (typeof refreshAllUIElements === "function") refreshAllUIElements(typeof previousBState !== 'undefined' ? previousBState : null);
                return;
            }
        } else {
             wsLogger(`EVENT_HANDLER: Clicked on ${clickedUnitId} (not active unit or valid basic attack target) while idle. No action.`);
             isWaitingForSecondTapEndTurn = false;
             isWaitingForSecondTapBasicAttack = false;
             resetDoubleTapState();
             return;
        }
    } else if (wsMode !== "idle") {
        if (isWaitingForSecondTapEndTurn || isWaitingForSecondTapBasicAttack) {
            isWaitingForSecondTapEndTurn = false;
            isWaitingForSecondTapBasicAttack = false;
            resetDoubleTapState();
            wsLogger("EVENT_HANDLER_INFO: Double tap flags & states direset karena wsMode bukan 'idle'.");
        }
    }

    // --- Logic for SKILL Targeting (wsMode is not "idle") ---
    // ... (Tidak ada perubahan di bagian skill targeting, diasumsikan sudah benar) ...
    if (wsMode === "selecting_primary_target") {
        if (!selectedActionDetails) {
            wsLogger("EVENT_HANDLER_ERROR: Pseudomap clicked in selecting_primary_target, but no action selected.");
            exitTargetingMode();
            return;
        }
        if (validPrimaryTargetIds.includes(clickedUnitId)) {
            selectedPrimaryTargetId = clickedUnitId;
            const primaryTargetUnit = getUnitById(selectedPrimaryTargetId);
            wsLogger(`EVENT_HANDLER: Primary target selected for SKILL: ${primaryTargetUnit?.name || clickedUnitId} by ${activeUnit?.name || 'Unknown Actor'}.`);
            const commandPatternShape = selectedActionDetails.commandObject?.targetingParams?.selection?.pattern?.shape;
            if (primaryTargetUnit && primaryTargetUnit.type === "Enemy" && commandPatternShape !== "Self") {
                if (typeof scrollToEnemyInCarousel === "function") scrollToEnemyInCarousel(primaryTargetUnit.id);
            }
            currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, selectedActionDetails.commandObject, bState.units);
            if (currentAffectedTargetIds.length > 0) {
                wsMode = "confirming_effect_area";
                addLogEntry(`Skill: ${selectedActionDetails.buttonText}. Tap an affected unit to confirm.`, "system-info");
                if (typeof ui_renderConfirmAreaMode === "function") {
                    ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap(), false);
                } else {
                     wsLogger("EVENT_HANDLER_ERROR: ui_renderConfirmAreaMode function not found.");
                }
            } else {
                wsLogger(`EVENT_HANDLER_ERROR: No affected targets for SKILL AoE with primary target ${primaryTargetUnit?.name || 'Unknown'}.`);
                addLogEntry("Error: Could not determine skill area of effect.", "error");
                exitTargetingMode();
            }
        } else {
            wsLogger("EVENT_HANDLER: Clicked on an invalid primary target for SKILL.");
            addLogEntry("Invalid skill target. Please select a highlighted unit.", "error-feedback");
        }
    } else if (wsMode === "confirming_effect_area") {
        if (!selectedActionDetails || !selectedPrimaryTargetId || currentAffectedTargetIds.length === 0) {
            wsLogger("EVENT_HANDLER_ERROR: Pseudomap clicked in confirming_effect_area, but state is invalid.");
            exitTargetingMode();
            return;
        }
        if (currentAffectedTargetIds.includes(clickedUnitId)) {
            wsLogger(`EVENT_HANDLER: Clicked on affected unit ${clickedUnitId}. Confirming SKILL action.`);
            handleActionConfirm();
        } else {
            wsLogger("EVENT_HANDLER: Clicked on a non-affected unit during SKILL confirmation. Action not confirmed. Tap an affected unit or outside to cancel.");
        }
    }
}

function handleActionButtonClick(event) {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('disabled')) return;

    if (wsMode === "selecting_primary_target" || wsMode === "confirming_effect_area") {
        wsLogger("EVENT_HANDLER: New skill button pressed while targeting. Cancelling previous targeting.");
        isWaitingForSecondTapEndTurn = false;
        isWaitingForSecondTapBasicAttack = false;
        handleActionCancel();
    }
    isWaitingForSecondTapEndTurn = false;
    isWaitingForSecondTapBasicAttack = false;
    resetDoubleTapState();

    if (typeof ui_clearIdleBasicAttackHighlights === "function") {
        ui_clearIdleBasicAttackHighlights();
        wsLogger("EVENT_HANDLER_INFO: Basic attack highlights cleared due to skill button press.");
    }

    // ... (sisa logika handleActionButtonClick tidak berubah) ...
    const commandId = button.dataset.commandId;
    const activeUnit = getActiveUnit();
    if (!activeUnit) {
        wsLogger("EVENT_HANDLER_ERROR: No active unit for SKILL.");
        addLogEntry("Error: No active unit.", "error");
        exitTargetingMode(); return;
    }
    const commandObject = activeUnit.commands.find(cmd => cmd.commandId === commandId);
    if (!commandObject || (commandObject.type !== "Skill" && commandObject.type !== "Ultimate")) {
        wsLogger(`EVENT_HANDLER_ERROR: Skill/Ultimate ID ${commandId} not found or type error on ${activeUnit.name}.`);
        addLogEntry("Error: Skill not found.", "error");
        exitTargetingMode(); return;
    }
    selectedActionDetails = {
        commandId: commandId, commandObject: commandObject, actionType: commandObject.type,
        spCost: commandObject.spCost || 0, actorId: activeUnit.id, actorName: activeUnit.name,
        buttonText: button.textContent
    };
    wsLogger(`EVENT_HANDLER: SKILL selected: '${selectedActionDetails.buttonText}' by ${activeUnit.name}.`);
    addLogEntry(`${activeUnit.name} prepares ${selectedActionDetails.buttonText}.`, "ally-action-intent");
    validPrimaryTargetIds = getValidPrimaryTargets(activeUnit, commandObject, bState.units);
    if (validPrimaryTargetIds.length > 0) {
        wsMode = "selecting_primary_target";
        const commandPatternShape = commandObject.targetingParams?.selection?.pattern?.shape;
        if (commandPatternShape === "Self" && validPrimaryTargetIds.includes(activeUnit.id)) {
             wsLogger(`EVENT_HANDLER: Skill "${selectedActionDetails.buttonText}" is Self-targeted. Player needs to tap self.`);
             addLogEntry(`Tap ${activeUnit.name} to select as skill origin.`, "system-info");
        } else {
            addLogEntry("Select primary target for skill.", "system-info");
        }
        if (typeof ui_renderSelectPrimaryTargetMode === "function") {
            ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, getAllUnitFramesOnMap());
        } else {
            wsLogger("EVENT_HANDLER_ERROR: ui_renderSelectPrimaryTargetMode function not found.");
        }
    } else {
        const commandPatternShapeForNoTarget = commandObject.targetingParams?.selection?.pattern?.shape;
        const areaOrigin = commandObject.targetingParams?.area?.origin;
        if ( (areaOrigin === "Caster" && (!commandObject.targetingParams.selection || !commandObject.targetingParams.selection.targetableTypes || commandPatternShapeForNoTarget === "None" ) ) ) {
            wsLogger(`EVENT_HANDLER: Skill '${selectedActionDetails.buttonText}' is Caster-AoE without initial map selection. Proceeding to AoE calculation.`);
            selectedPrimaryTargetId = activeUnit.id;
            currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, commandObject, bState.units);
            if (currentAffectedTargetIds.length > 0) {
                wsMode = "confirming_effect_area";
                addLogEntry("Confirm skill effect area by tapping an affected unit.", "system-info");
                 if (typeof ui_renderConfirmAreaMode === "function") {
                    ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap(), false);
                } else {
                    wsLogger("EVENT_HANDLER_ERROR: ui_renderConfirmAreaMode function not found.");
                }
            } else {
                addLogEntry(`No units affected by SKILL ${selectedActionDetails.buttonText}.`, "error-feedback");
                exitTargetingMode();
            }
        } else {
            wsLogger(`EVENT_HANDLER: No valid primary targets for SKILL '${selectedActionDetails.buttonText}'. Action cancelled.`);
            addLogEntry(`No valid targets for ${selectedActionDetails.buttonText}.`, "error-feedback");
            exitTargetingMode();
        }
    }
}

function handleActionConfirm() {
    // ... (Tidak ada perubahan di sini) ...
    if (wsMode !== "confirming_effect_area" || !selectedActionDetails || !selectedPrimaryTargetId || currentAffectedTargetIds.length === 0) {
        wsLogger("EVENT_HANDLER_ERROR: Confirm SKILL action called in invalid state or missing data.");
        addLogEntry("Error confirming skill. Please try again.", "error");
        exitTargetingMode(); return;
    }
    const targetName = getUnitById(selectedPrimaryTargetId)?.name || selectedPrimaryTargetId;
    wsLogger(`EVENT_HANDLER: SKILL CONFIRMED: ${selectedActionDetails.buttonText} by ${selectedActionDetails.actorName} on primary ${targetName}. Affected: ${currentAffectedTargetIds.join(', ')}`);
    addLogEntry(`${selectedActionDetails.actorName} uses ${selectedActionDetails.buttonText} on ${targetName}!`, "ally-action-execute");
    sendCommandToTasker("PLAYER_ACTION", {
        actorId: selectedActionDetails.actorId, commandId: selectedActionDetails.commandId,
        primaryTargetId: selectedPrimaryTargetId, affectedTargetIds: currentAffectedTargetIds
    });
    exitTargetingMode();
}

function resetDoubleTapState() {
    wsLogger("EVENT_HANDLER_TRACE: resetDoubleTapState CALLED. LastActiveTapID: " + lastTappedActiveUnitId + ", isWaitingEnd: " + isWaitingForSecondTapEndTurn + ", isWaitingBasic: " + isWaitingForSecondTapBasicAttack);
    if (lastTappedActiveUnitId && typeof ui_showEndTurnHint === "function") {
        ui_showEndTurnHint(lastTappedActiveUnitId, false);
    }
    lastTapTimeOnActiveUnit = 0;
    lastTappedActiveUnitId = null;
    lastTapTimeOnTarget = 0;
    lastTappedTargetUnitId = null;
    isWaitingForSecondTapEndTurn = false;
    isWaitingForSecondTapBasicAttack = false;
    wsLogger("EVENT_HANDLER: Double tap states and flags reset.");
}

function exitTargetingMode() {
    // ... (Tidak ada perubahan signifikan di sini, resetDoubleTapState sudah menangani flag) ...
    wsLogger("EVENT_HANDLER: Exiting targeting mode. Previous wsMode: " + wsMode);
    wsMode = "idle";
    selectedActionDetails = null;
    validPrimaryTargetIds = [];
    selectedPrimaryTargetId = null;
    currentAffectedTargetIds = [];
    if (typeof ui_clearAllTargetingVisuals === "function") {
        ui_clearAllTargetingVisuals();
        wsLogger("EVENT_HANDLER_INFO: All targeting visuals cleared by exitTargetingMode.");
    }
    isWaitingForSecondTapEndTurn = false; // Redundant if resetDoubleTapState is called, but safe
    isWaitingForSecondTapBasicAttack = false; // Redundant
    resetDoubleTapState();
    wsLogger("EVENT_HANDLER: Targeting mode finished. wsMode set to 'idle'.");
    if (typeof refreshAllUIElements === "function") {
        wsLogger("EVENT_HANDLER_INFO: Refreshing UI after exiting targeting mode.");
        refreshAllUIElements(typeof previousBState !== 'undefined' ? previousBState : null);
    } else {
        wsLogger("EVENT_HANDLER_ERROR: refreshAllUIElements not found when exiting targeting mode!");
    }
}

function handleGlobalClickToCancelTargeting(event) {
    // ... (Tidak ada perubahan signifikan di sini, resetDoubleTapState sudah menangani flag) ...
    if (wsMode === "selecting_primary_target" || wsMode === "confirming_effect_area") {
        const isClickInPseudomapTrack = elPseudomapTrack && elPseudomapTrack.contains(event.target);
        const isClickOnActionButton = elActionButtonsGroup && elActionButtonsGroup.contains(event.target.closest('button'));
        if (!isClickInPseudomapTrack && !isClickOnActionButton) {
             const isClickInsidePseudomapArea = elPseudomapArea && elPseudomapArea.contains(event.target);
             if (!isClickInsidePseudomapArea) {
                wsLogger("EVENT_HANDLER: Targeting cancelled by clicking outside relevant areas.");
                isWaitingForSecondTapEndTurn = false;
                isWaitingForSecondTapBasicAttack = false;
                handleActionCancel();
            }
        }
    } else if (wsMode === "idle") {
        const isClickInPseudomapTrack = elPseudomapTrack && elPseudomapTrack.contains(event.target);
        if (!isClickInPseudomapTrack) {
             isWaitingForSecondTapEndTurn = false;
             isWaitingForSecondTapBasicAttack = false;
             resetDoubleTapState();
        }
    }
}

function handleActionCancel() {
    // ... (Tidak ada perubahan signifikan di sini, exitTargetingMode sudah menangani flag) ...
    wsLogger("EVENT_HANDLER: Action targeting cancelled.");
    addLogEntry("Action cancelled.", "system-info");
    isWaitingForSecondTapEndTurn = false;
    isWaitingForSecondTapBasicAttack = false;
    exitTargetingMode();
}

function handleEnemyCarouselClick(event) {
    // ... (Tidak ada perubahan signifikan di sini, handleActionCancel sudah menangani flag) ...
    if (wsMode === "selecting_primary_target" || wsMode === "confirming_effect_area") {
        wsLogger("EVENT_HANDLER: Click on enemy carousel during targeting. Cancelling.");
        isWaitingForSecondTapEndTurn = false;
        isWaitingForSecondTapBasicAttack = false;
        handleActionCancel();
        return;
    }
    const targetCard = event.target.closest('.character-card.enemy-card');
    if (targetCard) {
        wsLogger(`EVENT_HANDLER: Enemy card clicked (not in targeting mode): ${targetCard.dataset.unitId}`);
    }
}

// --- Sisa fungsi helper (getAllUnitFramesOnMap, handleToggleBattleLog, swipe handlers, ripple, copy/clear log) tetap sama ---
function getAllUnitFramesOnMap() {
    return elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
}
function handleToggleBattleLog(explicitShow = null) {
    const isCurrentlyVisible = elBattleLogOverlay && elBattleLogOverlay.classList.contains('is-visible');
    let showLog = (explicitShow === null) ? !isCurrentlyVisible : explicitShow;
    if (typeof renderBattleLogOverlay === "function") renderBattleLogOverlay(showLog);
    // wsLogger(`EVENT_HANDLER: Battle log toggled to ${showLog ? 'visible' : 'hidden'}.`); // Log standar
}
function handleTouchStart(event, carouselType) {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
    touchStartTime = new Date().getTime();
}
function handleTouchEnd(event, carouselType) {
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
    const touchEndTime = new Date().getTime();
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const elapsedTime = touchEndTime - touchStartTime;
    if (elapsedTime < SWIPE_TIME_THRESHOLD && Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (carouselType === 'enemy') {
            navigateEnemyCarousel(deltaX > 0 ? -1 : 1);
        } else if (carouselType === 'player') {
            navigatePlayerHeroesCarouselManual(deltaX > 0 ? -1 : 1);
        }
    }
}
function navigateEnemyCarousel(direction) {
    if (!bState || !bState.units) { wsLogger("NAV_ENEMY_CAROUSEL_ERROR: bState.units not available."); return; }
    const enemies = bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated");
    if (enemies.length <= 1) return;
    const prevIndex = currentEnemyIndex;
    currentEnemyIndex += direction;
    if (currentEnemyIndex < 0) currentEnemyIndex = enemies.length - 1;
    else if (currentEnemyIndex >= enemies.length) currentEnemyIndex = 0;
    if (prevIndex !== currentEnemyIndex) {
        if (typeof renderEnemyStage === "function") renderEnemyStage();
        else wsLogger("NAV_ENEMY_CAROUSEL_ERROR: renderEnemyStage function not found!");
    }
}
function navigatePlayerHeroesCarouselManual(direction) {
    if (!elPlayerHeroesCarousel || !elPlayerHeroesDeck || !bState || !bState.units) return;
    const playerHeroes = bState.units.filter(unit => unit.type === "Ally" && unit.status !== "Defeated");
    if (playerHeroes.length === 0) return;
    const heroCardElement = elPlayerHeroesCarousel.querySelector('.character-card.player-card');
    if (!heroCardElement) return;
    const cardWidth = heroCardElement.offsetWidth;
    const cardGapStyle = getComputedStyle(elPlayerHeroesCarousel).gap;
    const cardGap = cardGapStyle && cardGapStyle !== 'normal' ? parseInt(cardGapStyle) : (window.VAR_PLAYER_HERO_CARD_GAP || 8);
    const cardWidthWithGap = cardWidth + cardGap;
    const deckContainerWidth = elPlayerHeroesDeck.offsetWidth;
    const cardsThatFitInView = Math.max(1, Math.floor(deckContainerWidth / cardWidthWithGap));
    const maxStartIndex = Math.max(0, playerHeroes.length - cardsThatFitInView);
    const prevStartIndex = currentPlayerHeroStartIndex;
    currentPlayerHeroStartIndex += direction;
    currentPlayerHeroStartIndex = Math.max(0, currentPlayerHeroStartIndex);
    currentPlayerHeroStartIndex = Math.min(currentPlayerHeroStartIndex, maxStartIndex);
    if (prevStartIndex !== currentPlayerHeroStartIndex) {
        const newScrollOffsetPx = currentPlayerHeroStartIndex * cardWidthWithGap;
        elPlayerHeroesCarousel.style.transform = `translateX(-${newScrollOffsetPx}px)`;
        wsLogger(`NAV_PLAYER_MANUAL: Swiped. New StartIndex: ${currentPlayerHeroStartIndex}. Offset: ${newScrollOffsetPx}px`);
    }
}
function createRipple(event, buttonElement) {
    const button = buttonElement || event.currentTarget;
    const existingRipple = button.querySelector(".ripple");
    if (existingRipple) { existingRipple.remove(); }
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    const buttonRect = button.getBoundingClientRect();
    circle.style.left = `${event.clientX - buttonRect.left - radius}px`;
    circle.style.top = `${event.clientY - buttonRect.top - radius}px`;
    circle.classList.add("ripple");
    button.appendChild(circle);
    circle.addEventListener('animationend', () => { if (circle.parentNode) circle.parentNode.removeChild(circle); });
    setTimeout(() => { if(circle && circle.parentNode) circle.parentNode.removeChild(circle); }, 600);
}
function handleCopyWsLog() {
    if (typeof getAccumulatedWsLog === "function") {
        const logText = getAccumulatedWsLog();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(logText)
                .then(() => {
                    wsLogger("EVENT_HANDLER_INFO: WS Log copied to clipboard!");
                    // Ganti alert dengan custom dialog jika memungkinkan di masa depan
                    alert("Log copied to clipboard!");
                })
                .catch(err => {
                    wsLogger("EVENT_HANDLER_ERROR: Failed to copy WS Log: " + err);
                    tryManuallyCopyLog(logText);
                });
        } else {
            wsLogger("EVENT_HANDLER_WARN: Clipboard API not available. Attempting manual copy prompt.");
            tryManuallyCopyLog(logText);
        }
    } else {
        wsLogger("EVENT_HANDLER_ERROR: getAccumulatedWsLog function not found.");
    }
}
function tryManuallyCopyLog(logText) {
    // Ganti prompt dengan custom dialog jika memungkinkan
    prompt("Copy all text from below (Ctrl+C / Cmd+C):", logText);
}
function handleClearWsLog() {
    if (typeof clearAccumulatedWsLog === "function") {
        // Ganti confirm dengan custom dialog
        if (confirm("Are you sure you want to clear the WS Log? This action cannot be undone.")) {
            clearAccumulatedWsLog();
            wsLogger("EVENT_HANDLER_INFO: WS Log cleared by user.");
        }
    } else {
        wsLogger("EVENT_HANDLER_ERROR: clearAccumulatedWsLog function not found.");
    }
}

wsLogger("EVENT_HANDLER_JS: event_handlers.js (v8: Basic Attack Flicker Addressed) loaded.");
