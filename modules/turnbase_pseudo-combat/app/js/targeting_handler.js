// js/targeting_handler.js (Final Refactor)
// This version includes a definitive fix for SpecificPosition targeting
// and robust handling of the turn order array.

/**
 * Helper: Mengambil semua unit yang masih hidup, diurutkan berdasarkan _turnOrder.
 * Fungsi ini krusial dan sekarang memiliki fallback untuk testing.
 * @param {object} bState - Objek battle state lengkap.
 * @returns {Array<object>} Array objek unit yang sudah diurutkan.
 */
function getOrderedAliveUnits(bState) {
    if (!bState || !bState.units) {
        wsLogger("TARGETING_HANDLER_ERROR: bState atau bState.units tidak valid.");
        return [];
    }

    // Metode utama: Gunakan _turnOrder jika ada (untuk battle sesungguhnya)
    if (bState._turnOrder && Array.isArray(bState._turnOrder) && bState._turnOrder.length > 0) {
        wsLogger("TARGETING_HANDLER_TRACE: Menggunakan bState._turnOrder untuk mengurutkan unit.");
        return bState._turnOrder
            .map(id => bState.units.find(u => u.id === id && u.status !== 'Defeated'))
            .filter(Boolean); // Menghapus unit null jika ada yg tidak ditemukan
    }

    // Metode darurat (fallback): Jika _turnOrder tidak ada (untuk testing di PC)
    wsLogger("TARGETING_HANDLER_WARN: bState._turnOrder tidak ditemukan. Membuat urutan darurat dari pseudoPos.");
    const aliveUnits = bState.units.filter(u => u.status !== 'Defeated');
    return aliveUnits.sort((a, b) => a.pseudoPos - b.pseudoPos);
}

/**
 * Helper: Menghitung jarak sirkular terpendek antara dua posisi.
 * @param {number} pos1 - Posisi pertama (pseudoPos).
 * @param {number} pos2 - Posisi kedua (pseudoPos).
 * @param {number} arrayLength - Jumlah total item dalam lingkaran.
 * @returns {number} Jarak terpendek.
 */
function getCircularDistance(pos1, pos2, arrayLength) {
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, arrayLength - diff);
}


/**
 * Fungsi Utama: Mendapatkan daftar ID target utama yang valid (Tahap 1).
 * VERSI FINAL DENGAN LOGIKA YANG DIPERBAIKI.
 * @param {object} actorUnit - Unit yang melakukan aksi.
 * @param {object} command - Objek command yang berisi targetingParams.
 * @param {object} bState - Objek battle state LENGKAP.
 * @returns {Array<string>} Array berisi ID target utama yang valid.
 */
function getValidPrimaryTargets(actorUnit, command, bState) {
    if (!actorUnit || !command?.targetingParams?.selection) {
        wsLogger("TARGETING_HANDLER_ERROR: Aktor atau parameter command tidak ada.");
        return [];
    }

    const selectionParams = command.targetingParams.selection;
    const pattern = selectionParams.pattern;
    const targetableTypes = selectionParams.targetableTypes || ["Enemy"];

    // Kasus khusus untuk revive (sudah benar)
    if (pattern.shape === "AnyDefeatedAlly") {
        const defeatedAllies = bState.units.filter(u => u.type === "Ally" && u.status === "Defeated");
        wsLogger(`TARGETING_HANDLER [AnyDefeatedAlly]: Ditemukan ${defeatedAllies.length} teman yang kalah.`);
        return defeatedAllies.map(ally => ally.id);
    }

    const orderedUnits = getOrderedAliveUnits(bState);
    if (orderedUnits.length === 0) return [];

    const numAlive = orderedUnits.length;
    const actorPseudoPos = actorUnit.pseudoPos;

    let potentialTargetIds = [];
    wsLogger(`TARGETING_HANDLER: Aktor: ${actorUnit.name} (psPos: ${actorPseudoPos}), Skill: ${command.name}, Shape: ${pattern.shape}`);

    switch (pattern.shape) {
        case "Adjacent":
        case "WithinDistance":
            const maxDistance = pattern.distance || 1;
            const validTargets = orderedUnits.filter(targetUnit => {
                if (targetUnit.id === actorUnit.id) return false;
                if (!targetableTypes.includes(targetUnit.type)) return false;
                const distance = getCircularDistance(actorPseudoPos, targetUnit.pseudoPos, numAlive);
                return distance <= maxDistance;
            });
            potentialTargetIds = validTargets.map(u => u.id);
            break;

        case "SpecificPosition":
        case "SpecificPositions":
            const positions = pattern.positions || [pattern.distance || 1];
            const direction = pattern.direction || "Both";

            positions.forEach(offset => {
                // Maju (Forward)
                if (direction === "Forward" || direction === "Both") {
                    const targetIndex = (actorPseudoPos + offset) % numAlive;
                    const targetUnit = orderedUnits.find(u => u.pseudoPos === targetIndex);
                    if (targetUnit && targetUnit.id !== actorUnit.id && targetableTypes.includes(targetUnit.type)) {
                        potentialTargetIds.push(targetUnit.id);
                    }
                }
                // Mundur (Backward)
                if (direction === "Backward" || direction === "Both") {
                    const targetIndex = (actorPseudoPos - offset + numAlive) % numAlive;
                    const targetUnit = orderedUnits.find(u => u.pseudoPos === targetIndex);
                    if (targetUnit && targetUnit.id !== actorUnit.id && targetableTypes.includes(targetUnit.type)) {
                        potentialTargetIds.push(targetUnit.id);
                    }
                }
            });
            break;

        case "Self":
            if (targetableTypes.includes("Self") || targetableTypes.includes(actorUnit.type)) {
                potentialTargetIds.push(actorUnit.id);
            }
            break;

        default:
             wsLogger(`TARGETING_HANDLER_WARN: Shape pattern tidak dikenal: ${pattern.shape}`);
             break;
    }

    const uniqueTargetIds = [...new Set(potentialTargetIds)];
    wsLogger(`TARGETING_HANDLER: Target utama yang valid untuk ${command.name}: [${uniqueTargetIds.join(', ')}]`);
    return uniqueTargetIds;
}

/**
 * Mendapatkan semua unit yang terkena efek area (AoE) berdasarkan target utama (Tahap 2).
 * @param {string} primaryTargetId - ID target utama yang dipilih.
 * @param {object} actorUnit - Unit yang melakukan aksi.
 * @param {object} command - Objek command.
 * @param {object} bState - Objek battle state LENGKAP.
 * @returns {Array<string>} Array berisi semua ID unit yang terkena efek.
 */
function getAreaAffectedTargets(primaryTargetId, actorUnit, command, bState) {
    if (!command?.targetingParams?.area) {
        // Jika tidak ada parameter area, target yang terkena hanya target utama.
        return primaryTargetId ? [primaryTargetId] : [];
    }

    const orderedUnits = getOrderedAliveUnits(bState);
    if (orderedUnits.length === 0) return [];

    const numAlive = orderedUnits.length;
    const areaParams = command.targetingParams.area;
    const affectedTypes = areaParams.affectedTypes || ["Enemy"];
    let affectedTargetIds = [];

    let originUnit = null;
    if (areaParams.origin === "Caster") {
        originUnit = actorUnit;
    } else { // Default ke "SelectedTarget"
        originUnit = orderedUnits.find(u => u.id === primaryTargetId);
    }

    if (!originUnit) {
        wsLogger("TARGETING_HANDLER_AOE_ERROR: Tidak dapat menentukan unit asal untuk AoE.");
        return [];
    }

    const originPseudoPos = originUnit.pseudoPos;
    wsLogger(`TARGETING_HANDLER_AOE: Asal: ${originUnit.name} (psPos: ${originPseudoPos}), Shape: ${areaParams.shape}`);

    switch (areaParams.shape) {
        case "SingleOnSelected":
            const primaryTargetUnit = orderedUnits.find(u => u.id === primaryTargetId);
            if (primaryTargetUnit && affectedTypes.includes(primaryTargetUnit.type)) {
                affectedTargetIds.push(primaryTargetId);
            }
            break;

        case "RadiusAroundOrigin":
            const radius = areaParams.distance || 0;
            orderedUnits.forEach(targetUnit => {
                const distance = getCircularDistance(originPseudoPos, targetUnit.pseudoPos, numAlive);
                if (distance <= radius && affectedTypes.includes(targetUnit.type)) {
                    affectedTargetIds.push(targetUnit.id);
                }
            });
            break;

        default:
             wsLogger(`TARGETING_HANDLER_AOE_WARN: Area shape tidak dikenal: ${areaParams.shape}`);
             // Fallback untuk hanya mengenai unit asal jika tipenya cocok
             if (affectedTypes.includes(originUnit.type)) {
                affectedTargetIds.push(originUnit.id);
             }
             break;
    }

    const uniqueAffectedIds = [...new Set(affectedTargetIds)];
    wsLogger(`TARGETING_HANDLER_AOE: Target akhir yang terkena efek: [${uniqueAffectedIds.join(', ')}]`);
    return uniqueAffectedIds;
}

wsLogger("TARGETING_HANDLER_JS: targeting_handler.js (Final Refactor) loaded.");
