// js/event_handlers.js
// Gamicraft WebScreen Event Handling Logic
// Versi final dengan perbaikan logika pengecekan elemen.

// --- Konstanta ---
const DOUBLE_TAP_END_TURN_THRESHOLD = 400;
const DOUBLE_TAP_BASIC_ATTACK_THRESHOLD = 350;

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
    wsLogger("EVENT_HANDLER: Initializing event listeners (with panel overlay and blur).");
    
    if (elBattleOptionsTrigger) elBattleOptionsTrigger.addEventListener('click', (event) => {
        event.stopPropagation(); 
        sendSoundCommand({ sfx_name: "ui_tap" });
        handleToggleStatsPanel(); 
    });

    if (elCloseLogBtn) elCloseLogBtn.addEventListener('click', () => {
        sendSoundCommand({ sfx_name: "ui_tap" });
        handleToggleBattleLog(false);
    });

    if (elPrevEnemyBtn) elPrevEnemyBtn.addEventListener('click', () => {
        sendSoundCommand({ sfx_name: "ui_swipe" });
        navigateEnemyCarousel(-1);
    });
    if (elNextEnemyBtn) elNextEnemyBtn.addEventListener('click', () => {
        sendSoundCommand({ sfx_name: "ui_swipe" });
        navigateEnemyCarousel(1);
    });

    if (elEnemyCarousel) {
        elEnemyCarousel.addEventListener('touchstart', (e) => handleTouchStart(e, 'enemy'), { passive: true });
        elEnemyCarousel.addEventListener('touchend', (e) => handleTouchEnd(e, 'enemy'), { passive: true });
        elEnemyCarousel.addEventListener('click', handleEnemyCarouselClick);
    }
    if (elPlayerHeroesCarousel) {
        elPlayerHeroesCarousel.addEventListener('touchstart', (e) => handleTouchStart(e, 'player'), { passive: true });
        elPlayerHeroesCarousel.addEventListener('touchend', (e) => handleTouchEnd(e, 'player'), { passive: true });
    }

    if (elActionButtonsGroup) elActionButtonsGroup.addEventListener('click', handleActionButtonClick);
    if (elPseudomapTrack) elPseudomapTrack.addEventListener('click', handlePseudomapUnitClick);
    
    const openWsLogButtonFromBattleLog = document.getElementById('open-ws-log-btn');
    if (openWsLogButtonFromBattleLog) openWsLogButtonFromBattleLog.addEventListener('click', handleToggleWsLoggerScreen);
    if (elCloseWsLoggerBtn) elCloseWsLoggerBtn.addEventListener('click', () => handleToggleWsLoggerScreen(false));
    if (elCopyWsLogBtn) elCopyWsLogBtn.addEventListener('click', handleCopyWsLog);
    if (elClearWsLogBtn) elClearWsLogBtn.addEventListener('click', handleClearWsLog);
    
    const statsPanelBattleLogBtn = document.getElementById('stats-panel-battle-log-btn');
    if (statsPanelBattleLogBtn) {
        statsPanelBattleLogBtn.addEventListener('click', () => {
            sendSoundCommand({ sfx_name: "ui_tap" });
            handleToggleStatsPanel(false); 
            handleToggleBattleLog(true);
        });
    }

    const statsPanelWsLogBtn = document.getElementById('stats-panel-ws-log-btn');
    if (statsPanelWsLogBtn) {
        statsPanelWsLogBtn.addEventListener('click', () => {
            handleToggleStatsPanel(false);
            handleToggleWsLoggerScreen(true);
        });
    }
    
    document.addEventListener('click', handleClosePanelOnClickOutside);
    document.body.addEventListener('click', handleGlobalClickToCancelTargeting, true);
    document.querySelectorAll('.styled-button, .action-buttons-group button').forEach(button => {
        button.addEventListener('mousedown', (e) => createRipple(e, button));
    });

    const closeEndScreenBtn = document.getElementById('close-end-screen-btn');
    if (closeEndScreenBtn) {
        closeEndScreenBtn.addEventListener('click', () => {
            sendCommandToTasker("BATTLE_ENDED_CONTINUE");
            const screen = document.getElementById('battle-end-screen');
            if(screen) screen.classList.remove('is-visible');
            const battleInterface = document.getElementById('battle-interface');
            if(battleInterface) battleInterface.classList.remove('is-fully-hidden');
        });
    }
    
    wsLogger("EVENT_HANDLER: Event listeners initialization complete.");
}

/**
 * Menampilkan atau menyembunyikan panel statistik, overlay, dan efek blur.
 * @param {boolean} [explicitShow=null] - Jika true, paksa tampil. Jika false, paksa sembunyi. Jika null, toggle.
 */
function handleToggleStatsPanel(explicitShow = null) {
    // --- PERBAIKAN DI SINI ---
    // Pengecekan sekarang langsung ke variabel, tanpa "window."
    if (!elStatsPanel || !elPanelOverlay) {
        wsLogger("EVENT_HANDLER_STATS: Elemen panel statistik atau overlay tidak ditemukan.");
        return;
    }
    // -------------------------

    const battleInterface = document.getElementById('battle-interface');
    const isCurrentlyVisible = elStatsPanel.classList.contains('is-visible');
    let showPanel = (explicitShow === null) ? !isCurrentlyVisible : explicitShow;

    if (showPanel) {
        elPanelOverlay.classList.add('is-visible');
        elStatsPanel.classList.add('is-visible');
        if (battleInterface) battleInterface.classList.add('is-blurred');
    } else {
        elPanelOverlay.classList.remove('is-visible');
        elStatsPanel.classList.remove('is-visible');
        if (battleInterface) battleInterface.classList.remove('is-blurred');
    }
}

/**
 * Menutup panel statistik jika pengguna mengklik di luar area panel atau tombol pemicunya.
 * @param {MouseEvent} event - Event klik dari listener.
 */
function handleClosePanelOnClickOutside(event) {
    if (elStatsPanel && elStatsPanel.classList.contains('is-visible')) {
        const isClickInsidePanel = elStatsPanel.contains(event.target);
        // Pastikan elBattleOptionsTrigger sudah ada sebelum diakses
        const isClickOnTrigger = elBattleOptionsTrigger ? elBattleOptionsTrigger.contains(event.target) : false;

        if (!isClickInsidePanel && !isClickOnTrigger) {
            handleToggleStatsPanel(false); // Tutup panel
        }
    }
}

// Sisa dari file ini tidak ada perubahan dari versi sebelumnya.
// Fungsi-fungsi di bawah ini tetap sama.

function handlePseudomapUnitClick(event) {
    const targetFrame = event.target.closest('.pseudomap-unit-frame');
    if (!targetFrame) return;
    sendSoundCommand({ sfx_name: "ui_tap" });
    const clickedUnitId = targetFrame.dataset.unitId;
    const currentTime = new Date().getTime();
    const activeUnit = getActiveUnit();
    if (wsMode === "idle" && activeUnit && activeUnit.id === bState.activeUnitID && bState.battleState === "Ongoing") {
        if (clickedUnitId === activeUnit.id) {
            if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId && (currentTime - lastTapTimeOnActiveUnit) < DOUBLE_TAP_END_TURN_THRESHOLD) {
                sendCommandToTasker("PLAYER_END_TURN", { actorId: activeUnit.id });
                resetDoubleTapState();
                return;
            }
            lastTapTimeOnActiveUnit = currentTime;
            lastTappedActiveUnitId = clickedUnitId;
            isWaitingForSecondTapEndTurn = true;
            isWaitingForSecondTapBasicAttack = false;
            ui_showEndTurnHint(clickedUnitId, true);
            setTimeout(() => {
                if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId) {
                    resetDoubleTapState();
                }
            }, DOUBLE_TAP_END_TURN_THRESHOLD + 50);
            return;
        }
        let validBasicAttackTargets = getValidBasicAttackTargetIdsForUI(activeUnit, bState.units);
        if (validBasicAttackTargets.includes(clickedUnitId)) {
            if (isWaitingForSecondTapBasicAttack && lastTappedTargetUnitId === clickedUnitId && (currentTime - lastTapTimeOnTarget) < DOUBLE_TAP_BASIC_ATTACK_THRESHOLD) {
                sendCommandToTasker("PLAYER_BASIC_ATTACK", { actorId: activeUnit.id, targetId: clickedUnitId });
                resetDoubleTapState();
                return;
            }
            lastTapTimeOnTarget = currentTime;
            lastTappedTargetUnitId = clickedUnitId;
            isWaitingForSecondTapBasicAttack = true;
            isWaitingForSecondTapEndTurn = false;
            if (typeof ui_highlightPotentialBasicAttackTarget === "function") ui_highlightPotentialBasicAttackTarget(clickedUnitId, true);
            if (getUnitById(clickedUnitId)?.type === "Enemy") scrollToEnemyInCarousel(clickedUnitId);
            return;
        }
        resetDoubleTapState();
        return;
    }
    if (wsMode === "selecting_primary_target") {
        if (validPrimaryTargetIds.includes(clickedUnitId)) {
            selectedPrimaryTargetId = clickedUnitId;
            const primaryTargetUnit = getUnitById(selectedPrimaryTargetId);
            if (primaryTargetUnit?.type === "Enemy") scrollToEnemyInCarousel(primaryTargetUnit.id);
            currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, selectedActionDetails.commandObject, bState.units);
            if (currentAffectedTargetIds.length > 0) {
                wsMode = "confirming_effect_area";
                addLogEntry(`Skill: ${selectedActionDetails.buttonText}. Tap affected unit to confirm.`, "system-info");
                if (typeof ui_renderConfirmAreaMode === "function") ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap());
            } else {
                addLogEntry("Error: Could not determine skill area of effect.", "error");
                exitTargetingMode();
            }
        } else {
            addLogEntry("Invalid skill target. Please select a highlighted unit.", "error-feedback");
        }
    } else if (wsMode === "selecting_revive_target") {
        if (validPrimaryTargetIds.includes(clickedUnitId)) {
            wsLogger(`EVENT_HANDLER: Revive confirmed for target: ${clickedUnitId}`);
            sendCommandToTasker("PLAYER_ACTION", { actorId: selectedActionDetails.actorId, commandId: selectedActionDetails.commandId, affectedTargetIds: [clickedUnitId] });
            exitTargetingMode();
        } else {
            wsLogger("EVENT_HANDLER: Clicked on a non-revivable area. Cancelling revive.");
            handleActionCancel();
        }
    } else if (wsMode === "confirming_effect_area") {
        if (currentAffectedTargetIds.includes(clickedUnitId)) {
            handleActionConfirm();
        } else {
            wsLogger("EVENT_HANDLER: Clicked on a non-affected unit during skill confirmation. Action cancelled.");
            handleActionCancel();
        }
    }
}

function handleActionButtonClick(event) {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('disabled')) return;
    if (wsMode !== "idle") {
        handleActionCancel();
    }
    resetDoubleTapState();
    const commandId = button.dataset.commandId;
    const activeUnit = getActiveUnit();
    if (!activeUnit) return;
    const commandObject = activeUnit.commands.find(cmd => cmd.commandId === commandId);
    if (!commandObject) return;
    selectedActionDetails = {
        commandId: commandId,
        commandObject: commandObject,
        actionType: commandObject.type,
        spCost: commandObject.spCost || 0,
        actorId: activeUnit.id,
        actorName: activeUnit.name,
        buttonText: button.textContent
    };
    const commandPatternShape = commandObject.targetingParams?.selection?.pattern?.shape;
    if (commandPatternShape === "AnyDefeatedAlly") {
        const defeatedAllyIds = bState.units.filter(u => u.type === "Ally" && u.status === "Defeated").map(u => u.id);
        if (defeatedAllyIds.length > 0) {
            sendSoundCommand({ sfx_name: "ui_tap" });
            wsMode = "selecting_revive_target";
            validPrimaryTargetIds = defeatedAllyIds;
            addLogEntry("Select a fallen hero to revive.", "system-info");
            button.classList.add('skill-button-active');
            if (typeof ui_renderReviveTargetingMode === "function") {
                ui_renderReviveTargetingMode(validPrimaryTargetIds);
            }
        } else {
            sendSoundCommand({ sfx_name: "ui_error" });
            if(typeof ui_createFeedbackPopup === "function") {
                ui_createFeedbackPopup(button, 'No Target', 'info-popup', { verticalOrigin: 'top', yOffset: -10, verticalAnimation: -100 });
            }
        }
    } else if (commandPatternShape === "Self") {
        sendSoundCommand({ sfx_name: "ui_tap" });
        selectedPrimaryTargetId = activeUnit.id;
        currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, commandObject, bState.units);
        if (currentAffectedTargetIds.length > 0) {
            wsMode = "confirming_effect_area";
            button.classList.add('skill-button-active');
            addLogEntry(`Confirm skill effect. Tap a highlighted unit to execute.`, "system-info");
            if (typeof ui_renderConfirmAreaMode === "function") {
                ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap());
            }
        }
    } else {
        const validTargets = getValidPrimaryTargets(activeUnit, commandObject, bState.units);
        if (validTargets.length > 0) {
            sendSoundCommand({ sfx_name: "ui_tap" });
            wsMode = "selecting_primary_target";
            validPrimaryTargetIds = validTargets;
            button.classList.add('skill-button-active');
            addLogEntry("Select primary target for skill.", "system-info");
            if (typeof ui_renderSelectPrimaryTargetMode === "function") {
                ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, getAllUnitFramesOnMap());
            }
        } else {
            sendSoundCommand({ sfx_name: "ui_error" });
            if(typeof ui_createFeedbackPopup === "function") {
                ui_createFeedbackPopup(button, 'No Target', 'info-popup', { verticalOrigin: 'top', yOffset: -10, verticalAnimation: -100 });
            }
        }
    }
}

function handleActionConfirm() {
    if (wsMode !== "confirming_effect_area" || !selectedActionDetails) return;
    const targetName = getUnitById(selectedPrimaryTargetId)?.name || selectedPrimaryTargetId;
    addLogEntry(`${selectedActionDetails.actorName} uses ${selectedActionDetails.buttonText} on ${targetName}!`, "ally-action-execute");
    sendCommandToTasker("PLAYER_ACTION", {
        actorId: selectedActionDetails.actorId, commandId: selectedActionDetails.commandId,
        primaryTargetId: selectedPrimaryTargetId, affectedTargetIds: currentAffectedTargetIds
    });
    exitTargetingMode();
}

function resetDoubleTapState() {
    wsLogger("EVENT_HANDLER_TRACE: resetDoubleTapState CALLED.");
    if (lastTappedActiveUnitId) ui_showEndTurnHint(lastTappedActiveUnitId, false);
    if (lastTappedTargetUnitId) ui_highlightPotentialBasicAttackTarget(lastTappedTargetUnitId, false);
    lastTapTimeOnActiveUnit = 0;
    lastTappedActiveUnitId = null;
    lastTapTimeOnTarget = 0;
    lastTappedTargetUnitId = null;
    isWaitingForSecondTapEndTurn = false;
    isWaitingForSecondTapBasicAttack = false;
    if (typeof ui_resetIdleHighlights === "function") {
        ui_resetIdleHighlights();
    }
    wsLogger("EVENT_HANDLER: Double tap states and highlights reset.");
}

function exitTargetingMode() {
    wsLogger("EVENT_HANDLER: Exiting targeting mode. Previous wsMode: " + wsMode);
    wsMode = "idle";
    selectedActionDetails = null;
    validPrimaryTargetIds = [];
    selectedPrimaryTargetId = null;
    currentAffectedTargetIds = [];
    const actionButtons = elActionButtonsGroup ? elActionButtonsGroup.querySelectorAll('button') : [];
    actionButtons.forEach(btn => btn.classList.remove('skill-button-active'));
    if (typeof ui_clearAllTargetingVisuals === "function") {
        ui_clearAllTargetingVisuals();
    }
    resetDoubleTapState();
    wsLogger("EVENT_HANDLER: Targeting mode finished. wsMode set to 'idle'.");
}

function handleGlobalClickToCancelTargeting(event) {
    if (wsMode !== "idle") {
        const isClickOnActionArea = 
            (elPseudomapTrack && elPseudomapTrack.contains(event.target)) ||
            (elActionButtonsGroup && elActionButtonsGroup.contains(event.target.closest('button')));
        if (!isClickOnActionArea) {
             wsLogger("EVENT_HANDLER: Targeting cancelled by clicking outside relevant areas.");
             handleActionCancel();
        }
    }
}

function handleActionCancel() {
    wsLogger("EVENT_HANDLER: Action targeting cancelled.");
    addLogEntry("Action cancelled.", "system-info");
    exitTargetingMode();
}

function handleEnemyCarouselClick(event) {
    if (wsMode !== "idle") {
        handleActionCancel();
        return;
    }
}

function getAllUnitFramesOnMap() {
    return elPseudomapTrack ? elPseudomapTrack.querySelectorAll('.pseudomap-unit-frame') : [];
}

function handleToggleBattleLog(explicitShow = null) {
    if (!elBattleLogOverlay || !elBattleLogEntries) { return; }
    if (explicitShow) {
        const titleElement = elBattleLogOverlay.querySelector('h3');
        if (titleElement) titleElement.textContent = "Battle Log";
        elBattleLogOverlay.classList.remove('is-hidden');
        elBattleLogOverlay.classList.add('is-visible');
    } else {
        elBattleLogOverlay.classList.remove('is-visible');
    }
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
            sendSoundCommand({ sfx_name: "ui_swipe" });
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
    prompt("Copy all text from below (Ctrl+C / Cmd+C):", logText);
}

function handleClearWsLog() {
    if (typeof clearAccumulatedWsLog === "function") {
        if (confirm("Are you sure you want to clear the WS Log? This action cannot be undone.")) {
            clearAccumulatedWsLog();
            wsLogger("EVENT_HANDLER_INFO: WS Log cleared by user.");
        }
    } else {
        wsLogger("EVENT_HANDLER_ERROR: clearAccumulatedWsLog function not found.");
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
    } else {
        elWsLoggerScreen.classList.remove('is-visible');
    }
}

wsLogger("EVENT_HANDLER_JS: event_handlers.js (with full code and refined close logic) loaded.");
