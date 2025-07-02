// js/event_handlers.js
// Gamicraft WebScreen Event Handling Logic
// VERSI FINAL: Memperbaiki alur logika skill dan menjaga logging.

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

// Variabel global untuk state targeting
let selectedActionDetails = null;
let validPrimaryTargetIds = [];
let selectedPrimaryTargetId = null;
let currentAffectedTargetIds = [];

// Flag untuk konsistensi highlight tap pertama
let isWaitingForSecondTapEndTurn = false;
let isWaitingForSecondTapBasicAttack = false;

/**
 * Inisialisasi semua event listener utama.
 */
function initializeEventListeners() {
    wsLogger("EVENT_HANDLER: Initializing event listeners...");

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

        elPlayerHeroesCarousel.addEventListener('click', handleHeroCardClickForUltimate);
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
            sendCommandContinue("BATTLE_ENDED_CONTINUE");
            const screen = document.getElementById('battle-end-screen');
            if(screen) screen.classList.remove('is-visible');
            const battleInterface = document.getElementById('battle-interface');
            if(battleInterface) battleInterface.classList.remove('is-fully-hidden');
        });
    }

    wsLogger("EVENT_HANDLER: Event listeners initialization complete.");
}

/**
 * Menangani klik pada unit di pseudomap. Ini adalah pusat logika untuk targeting.
 * @param {MouseEvent} event
 */
function handlePseudomapUnitClick(event) {
    const targetFrame = event.target.closest('.pseudomap-unit-frame');
    if (!targetFrame) return;

    sendSoundCommand({ sfx_name: "ui_tap" });
    const clickedUnitId = targetFrame.dataset.unitId;
    wsLogger(`PSEUDOMAP_CLICK: Unit [${clickedUnitId}] diklik. wsMode saat ini: "${wsMode}".`);

    // --- ALUR UNTUK MODE TARGETING SKILL ---
    if (wsMode === "selecting_primary_target") {
        wsLogger(`PSEUDOMAP_CLICK: Memproses klik dalam mode 'selecting_primary_target'.`);
        if (validPrimaryTargetIds.includes(clickedUnitId)) {
            wsLogger(`PSEUDOMAP_CLICK: Target [${clickedUnitId}] valid. Melanjutkan ke konfirmasi area.`);
            selectedPrimaryTargetId = clickedUnitId;
            
            // --- PERBAIKAN DI SINI: Tambahkan auto-scroll jika targetnya musuh ---
            const primaryTargetUnit = getUnitById(selectedPrimaryTargetId); // Fungsi ini sekarang aman dipanggil
            if (primaryTargetUnit && primaryTargetUnit.type === 'Enemy') {
                if (typeof scrollToEnemyInCarousel === 'function') {
                    wsLogger(`PSEUDOMAP_CLICK: Target adalah musuh. Memanggil auto-scroll.`);
                    scrollToEnemyInCarousel(selectedPrimaryTargetId);
                }
            }
            // --- AKHIR PERBAIKAN ---

            const activeUnit = getActiveUnit();
            currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, activeUnit, selectedActionDetails.commandObject, bState);

            if (currentAffectedTargetIds.length > 0) {
                wsMode = "confirming_effect_area";
                wsLogger(`PSEUDOMAP_CLICK: wsMode diubah menjadi 'confirming_effect_area'. Target terpengaruh: [${currentAffectedTargetIds.join(', ')}]. Menunggu klik konfirmasi.`);
                addLogEntry(`Skill: ${selectedActionDetails.buttonText}. Tekan target lagi untuk konfirmasi.`, "system-info");
                if (typeof ui_renderConfirmAreaMode === "function") ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap());
            } else {
                wsLogger("PSEUDOMAP_CLICK_ERROR: Gagal menentukan area efek skill. Membatalkan aksi.");
                addLogEntry("Error: Tidak dapat menentukan area efek skill.", "error");
                exitTargetingMode();
            }
        } else {
            wsLogger(`PSEUDOMAP_CLICK_WARN: Target [${clickedUnitId}] tidak valid. Aksi dibatalkan.`);
            handleActionCancel(); // Klik di luar target valid akan membatalkan
        }
        return;
    }

    if (wsMode === "confirming_effect_area") {
        wsLogger(`PSEUDOMAP_CLICK: Memproses klik dalam mode 'confirming_effect_area'.`);
        if (currentAffectedTargetIds.includes(clickedUnitId)) {
            wsLogger(`PSEUDOMAP_CLICK: Target [${clickedUnitId}] valid untuk konfirmasi. Mengeksekusi aksi.`);
            handleActionConfirm();
        } else {
            wsLogger("PSEUDOMAP_CLICK_WARN: Klik di luar area efek. Aksi dibatalkan.");
            handleActionCancel();
        }
        return;
    }
    
    if (wsMode === "selecting_revive_target") {
         wsLogger(`PSEUDOMAP_CLICK: Memproses klik dalam mode 'selecting_revive_target'.`);
        if (validPrimaryTargetIds.includes(clickedUnitId)) {
            wsLogger(`EVENT_HANDLER: Revive dikonfirmasi untuk target: ${clickedUnitId}`);
            sendCommandToTasker("PLAYER_ACTION", { actorId: selectedActionDetails.actorId, commandId: selectedActionDetails.commandId, affectedTargetIds: [clickedUnitId] });
            exitTargetingMode();
        } else {
            wsLogger("EVENT_HANDLER: Klik di area yang tidak bisa di-revive. Membatalkan revive.");
            handleActionCancel();
        }
        return;
    }


    // --- ALUR UNTUK MODE IDLE (BASIC ATTACK & END TURN) ---
    const currentTime = new Date().getTime();
    const activeUnit = getActiveUnit();
    if (wsMode === "idle" && activeUnit && activeUnit.id === bState.activeUnitID && bState.battleState === "Ongoing") {
        // Double tap pada unit aktif untuk End Turn
        if (clickedUnitId === activeUnit.id) {
            if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId && (currentTime - lastTapTimeOnActiveUnit) < DOUBLE_TAP_END_TURN_THRESHOLD) {
                wsLogger("IDLE_ACTION: Double tap End Turn terdeteksi. Mengirim perintah.");
                sendCommandToTasker("PLAYER_END_TURN", { actorId: activeUnit.id });
                resetDoubleTapState();
            } else {
                wsLogger("IDLE_ACTION: Tap pertama pada unit aktif. Menunggu tap kedua untuk End Turn.");
                lastTapTimeOnActiveUnit = currentTime;
                lastTappedActiveUnitId = clickedUnitId;
                isWaitingForSecondTapEndTurn = true;
                isWaitingForSecondTapBasicAttack = false; // Reset state lain
                ui_showEndTurnHint(clickedUnitId, true);
                setTimeout(() => {
                    if (isWaitingForSecondTapEndTurn && lastTappedActiveUnitId === clickedUnitId) {
                        resetDoubleTapState();
                    }
                }, DOUBLE_TAP_END_TURN_THRESHOLD + 50);
            }
            return;
        }

        // Double tap pada target musuh untuk Basic Attack
        let validBasicAttackTargets = getValidBasicAttackTargetIdsForUI(activeUnit, bState.units);
        if (validBasicAttackTargets.includes(clickedUnitId)) {
            if (isWaitingForSecondTapBasicAttack && lastTappedTargetUnitId === clickedUnitId && (currentTime - lastTapTimeOnTarget) < DOUBLE_TAP_BASIC_ATTACK_THRESHOLD) {
                wsLogger("IDLE_ACTION: Double tap Basic Attack terdeteksi. Mengirim perintah.");
                sendCommandToTasker("PLAYER_BASIC_ATTACK", { actorId: activeUnit.id, targetId: clickedUnitId });
                resetDoubleTapState();
            } else {
                wsLogger("IDLE_ACTION: Tap pertama pada target Basic Attack. Menunggu tap kedua.");
                lastTapTimeOnTarget = currentTime;
                lastTappedTargetUnitId = clickedUnitId;
                isWaitingForSecondTapBasicAttack = true;
                isWaitingForSecondTapEndTurn = false; // Reset state lain
                if (typeof ui_highlightPotentialBasicAttackTarget === "function") ui_highlightPotentialBasicAttackTarget(clickedUnitId, true);
                if (getUnitById(clickedUnitId)?.type === "Enemy") scrollToEnemyInCarousel(clickedUnitId);
            }
            return;
        }

        // Jika klik di tempat lain saat idle, reset state double tap
        resetDoubleTapState();
    }
}


/**
 * Menangani klik pada tombol aksi (skill).
 * @param {MouseEvent} event
 */
function handleActionButtonClick(event) {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('disabled')) return;

    if (wsMode !== "idle") {
        wsLogger("ACTION_BUTTON_CLICK: Mode tidak idle. Membatalkan aksi sebelumnya.");
        handleActionCancel();
    }
    resetDoubleTapState();

    const commandId = button.dataset.commandId;
    const activeUnit = getActiveUnit();
    if (!activeUnit) return;

    const commandObject = activeUnit.commands.find(cmd => cmd.commandId === commandId);
    if (!commandObject) return;

    wsLogger(`ACTION_BUTTON_CLICK: Tombol skill '${commandObject.name}' ditekan.`);
    
    selectedActionDetails = {
        commandId: commandId,
        commandObject: commandObject,
        actionType: commandObject.type,
        spCost: commandObject.spCost || 0,
        actorId: activeUnit.id,
        actorName: activeUnit.name,
        buttonText: button.textContent
    };

    const validTargets = getValidPrimaryTargets(activeUnit, commandObject, bState);

    if (validTargets.length > 0) {
        sendSoundCommand({ sfx_name: "ui_tap" });
        
        const isReviveSkill = commandObject.targetingParams?.selection?.pattern?.shape === "AnyDefeatedAlly";
        wsMode = isReviveSkill ? "selecting_revive_target" : "selecting_primary_target";
        validPrimaryTargetIds = validTargets;

        wsLogger(`ACTION_BUTTON_CLICK: Ditemukan ${validTargets.length} target valid. wsMode diubah menjadi '${wsMode}'.`);
        button.classList.add('skill-button-active');
        addLogEntry(isReviveSkill ? "Pilih teman yang akan dihidupkan." : "Pilih target utama untuk skill.", "system-info");

        if (isReviveSkill && typeof ui_renderReviveTargetingMode === "function") {
             ui_renderReviveTargetingMode(validPrimaryTargetIds);
        } else if (typeof ui_renderSelectPrimaryTargetMode === "function") {
            ui_renderSelectPrimaryTargetMode(validPrimaryTargetIds, getAllUnitFramesOnMap());
        }
    } else {
        wsLogger("ACTION_BUTTON_CLICK_WARN: Tidak ada target valid untuk skill ini.");
        sendSoundCommand({ sfx_name: "ui_error" });
        if(typeof ui_createFeedbackPopup === "function") {
            ui_createFeedbackPopup(button, 'No Target', 'info-popup', { verticalOrigin: 'top', yOffset: -10, verticalAnimation: -100 });
        }
    }
}

/**
 * Mengeksekusi aksi setelah dikonfirmasi.
 */
function handleActionConfirm() {
    if (wsMode !== "confirming_effect_area" || !selectedActionDetails) return;
    wsLogger("ACTION_CONFIRM: Aksi dikonfirmasi. Membangun dan mengirim perintah ke Tasker.");

    const commandPayload = {
        actorId: selectedActionDetails.actorId,
        commandId: selectedActionDetails.commandId,
        primaryTargetId: selectedPrimaryTargetId,
        affectedTargetIds: currentAffectedTargetIds
    };
    sendCommandToTasker("PLAYER_ACTION", commandPayload);
    exitTargetingMode();
}

/**
 * Membatalkan proses targeting.
 */
function handleActionCancel() {
    wsLogger("ACTION_CANCEL: Aksi dibatalkan oleh pengguna atau sistem.");
    addLogEntry("Aksi dibatalkan.", "system-info");
    exitTargetingMode();
}

/**
 * Menangani klik di mana saja di body untuk membatalkan targeting.
 * Berjalan pada fase capture untuk menangkap klik sebelum elemen lain.
 * @param {MouseEvent} event
 */
function handleGlobalClickToCancelTargeting(event) {
    if (wsMode !== "idle") {
        const isClickOnActionArea =
            (elPseudomapTrack && elPseudomapTrack.contains(event.target)) ||
            (elActionButtonsGroup && elActionButtonsGroup.contains(event.target.closest('button')));

        if (!isClickOnActionArea) {
             wsLogger("GLOBAL_CLICK_CANCEL: Klik di luar area relevan terdeteksi. Membatalkan aksi.");
             handleActionCancel();
        }
    }
}

/**
 * Mereset semua state yang berhubungan dengan targeting ke kondisi awal.
 */
function exitTargetingMode() {
    wsLogger("EXIT_TARGETING_MODE: Mereset semua state targeting. wsMode diubah ke 'idle'.");
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
}

/**
 * Mereset state double tap.
 */
function resetDoubleTapState() {
    if (isWaitingForSecondTapEndTurn || isWaitingForSecondTapBasicAttack) {
         wsLogger("RESET_DOUBLE_TAP: Mereset state double tap dan highlight.");
    }
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
}


// --- FUNGSI-FUNGSI LAIN (tidak ada perubahan) ---
function handleToggleStatsPanel(explicitShow = null) {
    if (!elStatsPanel || !elPanelOverlay) {
        wsLogger("EVENT_HANDLER_STATS: Elemen panel statistik atau overlay tidak ditemukan.");
        return;
    }
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

function handleClosePanelOnClickOutside(event) {
    if (elStatsPanel && elStatsPanel.classList.contains('is-visible')) {
        const isClickInsidePanel = elStatsPanel.contains(event.target);
        const isClickOnTrigger = elBattleOptionsTrigger ? elBattleOptionsTrigger.contains(event.target) : false;
        if (!isClickInsidePanel && !isClickOnTrigger) {
            handleToggleStatsPanel(false);
        }
    }
}

function handleEnemyCarouselClick(event) {
    if (wsMode !== "idle") {
        handleActionCancel();
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
    if (!bState || !bState.units) { return; }
    const enemies = bState.units.filter(unit => unit.type === "Enemy" && unit.status !== "Defeated");
    if (enemies.length <= 1) return;
    const prevIndex = currentEnemyIndex;
    currentEnemyIndex = (currentEnemyIndex + direction + enemies.length) % enemies.length;
    if (prevIndex !== currentEnemyIndex) {
        if (typeof renderEnemyStage === "function") renderEnemyStage();
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
    const cardGap = cardGapStyle && cardGapStyle !== 'normal' ? parseInt(cardGapStyle) : 10;
    const cardWidthWithGap = cardWidth + cardGap;
    const deckContainerWidth = elPlayerHeroesDeck.offsetWidth;
    const cardsThatFitInView = Math.max(1, Math.floor(deckContainerWidth / cardWidthWithGap));
    const maxStartIndex = Math.max(0, playerHeroes.length - cardsThatFitInView);
    const prevStartIndex = currentPlayerHeroStartIndex;
    currentPlayerHeroStartIndex = Math.max(0, Math.min(currentPlayerHeroStartIndex + direction, maxStartIndex));
    if (prevStartIndex !== currentPlayerHeroStartIndex) {
        const newScrollOffsetPx = currentPlayerHeroStartIndex * cardWidthWithGap;
        elPlayerHeroesCarousel.style.transform = `translateX(-${newScrollOffsetPx}px)`;
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
    setTimeout(() => { if(circle && circle.parentNode) circle.parentNode.removeChild(circle); }, 600);
}

function handleCopyWsLog() {
    if (typeof getAccumulatedWsLog === "function") {
        const logText = getAccumulatedWsLog();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(logText).then(() => {
                alert("Log copied to clipboard!");
            }).catch(err => {
                tryManuallyCopyLog(logText);
            });
        } else {
            tryManuallyCopyLog(logText);
        }
    }
}

function tryManuallyCopyLog(logText) {
    prompt("Copy all text from below (Ctrl+C / Cmd+C):", logText);
}

function handleClearWsLog() {
    if (typeof clearAccumulatedWsLog === "function") {
        if (confirm("Are you sure you want to clear the WS Log?")) {
            clearAccumulatedWsLog();
        }
    }
}

function handleToggleWsLoggerScreen(explicitShow = null) {
    if (!elWsLoggerScreen) return;
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

function handleHeroCardClickForUltimate(event) {
    const card = event.target.closest('.character-card.player-card');
    if (!card) return; // Jika yang diklik bukan kartu, abaikan

    const unitId = card.dataset.unitId;
    const unit = getUnitById(unitId);

    // Cek Kondisi:
    // 1. Apakah unit ada?
    // 2. Apakah gauge-nya penuh?
    // 3. Apakah ini giliran unit tersebut?
    // 4. Apakah state game sedang 'Ongoing'?
    if (unit && unit.stats.gauge >= unit.stats.maxGauge && unit.id === bState.activeUnitID && bState.battleState === "Ongoing") {
        
        // Cari command Ultimate dari daftar command unit
        const ultimateCommand = unit.commands.find(cmd => cmd.isUltimate === true);
        if (!ultimateCommand) {
            wsLogger(`ULTIMATE_ERROR: Unit ${unit.name} siap ultimate, tapi tidak ada command 'isUltimate:true' ditemukan.`);
            return;
        }

        wsLogger(`ULTIMATE_ACTIVATE: ${unit.name} mengaktifkan ultimate: ${ultimateCommand.name}`);
        sendSoundCommand({ sfx_name: "ui_ultimate_activate" }); // Efek suara baru (opsional)

        // Kirim perintah ke Tasker. Mirip dengan klik tombol skill biasa.
        // Kita perlu payload yang sama seperti handleActionButtonClick, jadi kita buat di sini.
        const commandPayload = {
            actorId: unit.id,
            commandId: ultimateCommand.commandId,
            // Ultimate biasanya menargetkan area, jadi kita perlu menghitung target yang terkena efek
            // Untuk Ultimate AoE seperti contoh kita, kita bisa langsung kirim tanpa target spesifik
            // karena script backend akan menanganinya.
            affectedTargetIds: [] // Kosongkan, biarkan backend (process_skill.js) yang menentukan target AoE
        };
        
        // Kita set wsMode ke confirming_effect_area agar UI bisa menyorot area yang terkena dampak
        // Ini akan memberikan feedback visual kepada pemain sebelum konfirmasi
        selectedActionDetails = {
            commandId: ultimateCommand.commandId,
            commandObject: ultimateCommand,
            actorId: unit.id
        };
        
        selectedPrimaryTargetId = unit.id; // Karena origin-nya Caster
        currentAffectedTargetIds = getAreaAffectedTargets(selectedPrimaryTargetId, unit, ultimateCommand, bState);
        
        if (currentAffectedTargetIds.length > 0) {
            wsMode = "confirming_effect_area";
            addLogEntry(`ULTIMATE: ${ultimateCommand.name}. Tekan target yang disorot untuk konfirmasi.`, "system-info");
            ui_renderConfirmAreaMode(selectedPrimaryTargetId, currentAffectedTargetIds, getAllUnitFramesOnMap());
        } else {
             wsLogger("ULTIMATE_WARN: Tidak ada target valid untuk ultimate. Mungkin bug di targetingParams.");
             exitTargetingMode();
        }
    }
}

wsLogger("EVENT_HANDLER_JS: event_handlers.js (with debug logging) loaded.");
