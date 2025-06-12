// js/event_handlers.js
// Gamicraft WebScreen Event Handling Logic
// Versi dengan pemanggilan suara menggunakan fungsi terpisah.

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
    wsLogger("EVENT_HANDLER: Initializing event listeners (SFX added).");
    if (elBattleOptionsTrigger) elBattleOptionsTrigger.addEventListener('click', () => {
        // DIUBAH: Gunakan fungsi baru
        sendSoundCommand({ sfx_name: "ui_tap" });
        handleToggleBattleLog();
    });
    if (elCloseLogBtn) elCloseLogBtn.addEventListener('click', () => {
        // DIUBAH: Gunakan fungsi baru
        sendSoundCommand({ sfx_name: "ui_tap" });
        handleToggleBattleLog(false);
    });
    if (elPrevEnemyBtn) elPrevEnemyBtn.addEventListener('click', () => {
        // DIUBAH: Gunakan fungsi baru
        sendSoundCommand({ sfx_name: "ui_tap" });
        navigateEnemyCarousel(-1);
    });
    if (elNextEnemyBtn) elNextEnemyBtn.addEventListener('click', () => {
        // DIUBAH: Gunakan fungsi baru
        sendSoundCommand({ sfx_name: "ui_tap" });
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
    
    // Listener untuk WS Logger (tidak perlu SFX agar tidak berisik)
    const openWsLogButtonFromBattleLog = document.getElementById('open-ws-log-btn');
    if (openWsLogButtonFromBattleLog) openWsLogButtonFromBattleLog.addEventListener('click', handleToggleWsLoggerScreen);
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
    }
}

/**
 * Menangani klik pada unit di Pseudomap.
 */
function handlePseudomapUnitClick(event) {
    const targetFrame = event.target.closest('.pseudomap-unit-frame');
    if (!targetFrame) return;

    // DIUBAH: Gunakan fungsi baru
    sendSoundCommand({ sfx_name: "ui_tap" });

    const clickedUnitId = targetFrame.dataset.unitId;
    const currentTime = new Date().getTime();
    const activeUnit = getActiveUnit();

    if (wsMode === "idle" && activeUnit && activeUnit.id === bState.activeUnitID && bState.battleState === "Ongoing") {
        if (clickedUnitId === activeUnit.id) { // Tap pada unit aktif sendiri (End Turn)
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
        if (validBasicAttackTargets.includes(clickedUnitId)) { // Tap pada target basic attack yang valid
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
            // Kirim perintah ke Tasker. Strukturnya mirip dengan konfirmasi skill biasa.
            sendCommandToTasker("PLAYER_ACTION", {
                actorId: selectedActionDetails.actorId,
                commandId: selectedActionDetails.commandId,
                // Backend akan menerima ini sebagai target yang akan di-revive
                affectedTargetIds: [clickedUnitId] 
            });
            // Keluar dari mode targeting setelah perintah dikirim
            exitTargetingMode();
        } else {
            // Jika user mengklik area kosong di pseudomap, batalkan aksi
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

    // DIUBAH: Gunakan fungsi baru
    sendSoundCommand({ sfx_name: "ui_tap" });

    if (wsMode !== "idle") handleActionCancel();
    resetDoubleTapState();

    const commandId = button.dataset.commandId;
    const activeUnit = getActiveUnit();
    if (!activeUnit) return;
    const commandObject = activeUnit.commands.find(cmd => cmd.commandId === commandId);
    if (!commandObject) return;

    selectedActionDetails = {
        commandId: commandId, commandObject: commandObject, actionType: commandObject.type,
        spCost: commandObject.spCost || 0, actorId: activeUnit.id, actorName: activeUnit.name,
        buttonText: button.textContent
    };
    addLogEntry(`${activeUnit.name} prepares ${selectedActionDetails.buttonText}.`, "ally-action-intent");

    const commandPatternShape = commandObject.targetingParams?.selection?.pattern?.shape;
    
    if (commandPatternShape === "AnyDefeatedAlly") {
        wsLogger("EVENT_HANDLER: Revive skill detected. Entering revive targeting mode.");
        // Ambil semua ID hero yang sudah kalah
        const defeatedAllyIds = bState.units
            .filter(u => u.type === "Ally" && u.status === "Defeated")
            .map(u => u.id);

        if (defeatedAllyIds.length > 0) {
            wsMode = "selecting_revive_target"; // Mode baru!
            validPrimaryTargetIds = defeatedAllyIds; // Simpan target yg valid
            addLogEntry("Select a fallen hero to revive.", "system-info");
            
            // Panggil fungsi render yang baru (akan kita buat di langkah selanjutnya)
            if (typeof ui_renderReviveTargetingMode === "function") {
                ui_renderReviveTargetingMode(validPrimaryTargetIds);
            }
        } else {
            addLogEntry("No fallen heroes to revive.", "error-feedback");
            exitTargetingMode();
        }
        return; // Hentikan eksekusi lebih lanjut di fungsi ini
    }

    if (commandPatternShape === "Self") {
        selectedPrimaryTargetId = activeUnit.id;
        validPrimaryTargetIds = [activeUnit.id];
        currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, commandObject, bState.units);
        if (currentAffectedTargetIds.length > 0) {
            wsMode = "confirming_effect_area";
            addLogEntry(`Confirm skill effect. Tap a highlighted unit to execute.`, "system-info");
            if (typeof ui_renderConfirmAreaMode === "function") ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap());
        } else {
            addLogEntry("Error: Could not determine skill area.", "error");
            exitTargetingMode();
        }
        return;
    }
    
    validPrimaryTargetIds = getValidPrimaryTargets(activeUnit, commandObject, bState.units);
    if (validPrimaryTargetIds.length > 0) {
        wsMode = "selecting_primary_target";
        addLogEntry("Select primary target for skill.", "system-info");
        if (typeof ui_renderSelectPrimaryTargetMode === "function") ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, getAllUnitFramesOnMap());
    } else {
        addLogEntry(`No valid targets for ${selectedActionDetails.buttonText}.`, "error-feedback");
        exitTargetingMode();
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
    const isCurrentlyVisible = elBattleLogOverlay && elBattleLogOverlay.classList.contains('is-visible');
    let showLog = (explicitShow === null) ? !isCurrentlyVisible : explicitShow;
    if (typeof renderBattleLogOverlay === "function") renderBattleLogOverlay(showLog);
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
            // DIUBAH: Gunakan fungsi baru
            sendSoundCommand({ sfx_name: "ui_swipe" });
            navigateEnemyCarousel(deltaX > 0 ? -1 : 1);
        } else if (carouselType === 'player') {
            // Player hero swipe juga bisa diberi suara jika mau
            // sendSoundCommand({ sfx_name: "ui_swipe" });
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

wsLogger("EVENT_HANDLER_JS: event_handlers.js (with separated sound commands) loaded.");
