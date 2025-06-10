// js/targeting_handler.js
// Logika untuk menentukan target yang valid berdasarkan targetingParams.
// Versi dengan AoE Radius Melingkar dan Circular SpecificPositions

/**
 * Mendapatkan semua unit yang masih aktif (belum kalah) dari state.
 * @param {Array<object>} allUnitsFromState - Array unit dari bState.units.
 * @returns {Array<object>} Array unit yang aktif.
 */
function getAliveUnits(allUnitsFromState) {
    if (!allUnitsFromState || !Array.isArray(allUnitsFromState)) {
        wsLogger("TARGETING_HANDLER_ERROR: allUnitsFromState is invalid in getAliveUnits.");
        return [];
    }
    return allUnitsFromState.filter(unit => unit.status !== "Defeated");
}

/**
 * Fungsi utama untuk mendapatkan daftar ID unit yang valid sebagai target utama (Tahap 1).
 * @param {object} actorUnit - Objek unit yang melakukan aksi.
 * @param {object} command - Objek command yang berisi targetingParams.
 * @param {Array<object>} allUnitsFromState - Array semua unit dari bState.units.
 * @returns {Array<string>} Array berisi ID unit yang valid sebagai target utama.
 */
function getValidPrimaryTargets(actorUnit, command, allUnitsFromState) {
    if (!actorUnit || !command || !command.targetingParams || !command.targetingParams.selection) {
        wsLogger("TARGETING_HANDLER_ERROR: Missing actorUnit or command targetingParams in getValidPrimaryTargets.");
        return [];
    }

    const aliveUnits = getAliveUnits(allUnitsFromState);
    if (aliveUnits.length === 0) {
        wsLogger("TARGETING_HANDLER: No alive units found.");
        return [];
    }

    // Urutkan unit berdasarkan pseudoPos untuk logika melingkar yang konsisten jika diperlukan nanti
    // Ini penting untuk kalkulasi melingkar yang benar.
    const sortedAliveUnits = [...aliveUnits].sort((a, b) => a.pseudoPos - b.pseudoPos);
    const actorIndexInSorted = sortedAliveUnits.findIndex(u => u.id === actorUnit.id);

    if (actorIndexInSorted === -1 && command.targetingParams.selection.pattern.shape !== "AnyDefeatedAlly") { // Jangan error jika memang tidak perlu aktor di sorted list (misal Revive)
        wsLogger(`TARGETING_HANDLER_ERROR: Actor unit ${actorUnit.name} not found in sorted alive units for a skill that requires it.`);
        return [];
    }

    const selectionParams = command.targetingParams.selection;
    const pattern = selectionParams.pattern;
    const targetableTypes = selectionParams.targetableTypes || ["Enemy"];

    let potentialTargetIds = [];

    wsLogger(`TARGETING_HANDLER: Actor: ${actorUnit.name} (psPos: ${actorUnit.pseudoPos}, index in sorted: ${actorIndexInSorted}), Skill: ${command.name}, Shape: ${pattern.shape}, TargetTypes: ${targetableTypes.join(', ')}`);

    switch (pattern.shape) {
        case "Adjacent":
        case "WithinDistance":
            const maxDistance = pattern.distance;
            // const numUnitsSorted = sortedAliveUnits.length; // Tidak terpakai

            for (let i = 0; i < sortedAliveUnits.length; i++) {
                if (i === actorIndexInSorted && pattern.shape !== "Self") continue; // Jangan target diri sendiri kecuali skill Self

                const targetUnit = sortedAliveUnits[i];
                let dist = Math.abs(targetUnit.pseudoPos - actorUnit.pseudoPos); // Jarak linear sederhana

                if (pattern.shape === "Adjacent" && maxDistance === 1) {
                    const linearDist = targetUnit.pseudoPos - actorUnit.pseudoPos;
                    if (Math.abs(linearDist) === 1) {
                         if (targetableTypes.includes(targetUnit.type)) {
                            potentialTargetIds.push(targetUnit.id);
                            wsLogger(`TARGETING_HANDLER [Adjacent Linear]: Found ${targetUnit.name} at psPos ${targetUnit.pseudoPos}`);
                        }
                    }
                }
                else if (dist <= maxDistance) { // Untuk WithinDistance
                     if (targetableTypes.includes(targetUnit.type)) {
                        let isValidDirection = false;
                        if (!pattern.direction || pattern.direction === "Both") {
                            isValidDirection = true;
                        } else if (pattern.direction === "Forward" && targetUnit.pseudoPos > actorUnit.pseudoPos) {
                            isValidDirection = true;
                        } else if (pattern.direction === "Backward" && targetUnit.pseudoPos < actorUnit.pseudoPos) {
                            isValidDirection = true;
                        }

                        if (isValidDirection) {
                            potentialTargetIds.push(targetUnit.id);
                            wsLogger(`TARGETING_HANDLER [${pattern.shape} Linear]: Found ${targetUnit.name} at psPos ${targetUnit.pseudoPos}`);
                        }
                    }
                }
            }
            break;

        case "SpecificPosition": 
        case "SpecificPositions": 
            const targetPositions = pattern.positions || (pattern.distance ? [pattern.distance] : []); 
            const direction = pattern.direction || "Both"; 
            const useCircular = pattern.circular || false;
            const numTotalAlive = sortedAliveUnits.length;

            if (actorIndexInSorted === -1) { // Aktor harus ada di sorted list untuk tipe targeting ini
                wsLogger(`TARGETING_HANDLER_ERROR [${pattern.shape}]: Actor unit ${actorUnit.name} not found in sorted alive units, required for this targeting type.`);
                break;
            }

            if (numTotalAlive <= 1 && !useCircular && pattern.shape !== "Self") { 
                 wsLogger(`TARGETING_HANDLER [${pattern.shape}]: Not enough units (${numTotalAlive}) for non-circular targeting or not Self.`);
                 break;
            }

            targetPositions.forEach(posOffset => {
                let targetIndex = -1;

                if (direction === "Forward" || direction === "Both") {
                    if (useCircular && numTotalAlive > 0) { // Pastikan numTotalAlive > 0 untuk modulo
                        targetIndex = (actorIndexInSorted + posOffset) % numTotalAlive;
                        if (targetIndex < 0) targetIndex += numTotalAlive; 
                    } else {
                        const targetPseudoPos = actorUnit.pseudoPos + posOffset;
                        const foundUnit = sortedAliveUnits.find(u => u.pseudoPos === targetPseudoPos);
                        if (foundUnit) targetIndex = sortedAliveUnits.indexOf(foundUnit);
                    }

                    if (targetIndex !== -1 && targetIndex !== actorIndexInSorted) {
                        const targetUnit = sortedAliveUnits[targetIndex];
                        if (targetUnit && targetableTypes.includes(targetUnit.type)) {
                            potentialTargetIds.push(targetUnit.id);
                            wsLogger(`TARGETING_HANDLER [${pattern.shape} Fwd circ:${useCircular}]: Found ${targetUnit.name} (index ${targetIndex}, psPos ${targetUnit.pseudoPos}) at offset ${posOffset}`);
                        }
                    }
                }

                if (direction === "Backward" || (direction === "Both" && posOffset !== 0) ) { 
                    let backwardTargetIndex = -1;
                    if (useCircular && numTotalAlive > 0) { // Pastikan numTotalAlive > 0 untuk modulo
                        backwardTargetIndex = (actorIndexInSorted - posOffset + numTotalAlive) % numTotalAlive;
                    } else {
                        const targetPseudoPos = actorUnit.pseudoPos - posOffset;
                        const foundUnit = sortedAliveUnits.find(u => u.pseudoPos === targetPseudoPos);
                        if (foundUnit) backwardTargetIndex = sortedAliveUnits.indexOf(foundUnit);
                    }

                     if (backwardTargetIndex !== -1 && backwardTargetIndex !== actorIndexInSorted) {
                        const targetUnit = sortedAliveUnits[backwardTargetIndex];
                        if (targetUnit && targetableTypes.includes(targetUnit.type)) {
                            potentialTargetIds.push(targetUnit.id);
                            wsLogger(`TARGETING_HANDLER [${pattern.shape} Bwd circ:${useCircular}]: Found ${targetUnit.name} (index ${backwardTargetIndex}, psPos ${targetUnit.pseudoPos}) at offset -${posOffset}`);
                        }
                    }
                }
            });
            break;

        case "Self":
            if (actorIndexInSorted === -1) {
                wsLogger(`TARGETING_HANDLER_ERROR [Self]: Actor unit ${actorUnit.name} not found in sorted alive units.`);
                break;
           }
           // BUGFIX: Cek apakah "Self" ada di targetableTypes, bukan actorUnit.type
           if (targetableTypes.includes("Self")) {
               potentialTargetIds.push(actorUnit.id);
               wsLogger(`TARGETING_HANDLER [Self]: Target is self: ${actorUnit.name}`);
           }
           break;

        case "AnyDefeatedAlly":
            // Tidak bergantung pada sortedAliveUnits atau actorIndexInSorted
            const defeatedAllies = allUnitsFromState.filter(u => u.type === "Ally" && u.status === "Defeated");
            defeatedAllies.forEach(ally => potentialTargetIds.push(ally.id));
            wsLogger(`TARGETING_HANDLER [AnyDefeatedAlly]: Found ${defeatedAllies.length} defeated allies.`);
            break;

        default:
            wsLogger(`TARGETING_HANDLER_WARN: Unknown or unhandled pattern shape for selection: ${pattern.shape}`);
            if (targetableTypes.includes("Enemy") && actorIndexInSorted !== -1) {
                const closestEnemy = sortedAliveUnits.find(u => u.type === "Enemy" && u.id !== actorUnit.id);
                if (closestEnemy) {
                    potentialTargetIds.push(closestEnemy.id);
                    wsLogger(`TARGETING_HANDLER_WARN: Fallback to closest enemy: ${closestEnemy.name}`);
                }
            }
            break;
    }

    const uniqueTargetIds = [...new Set(potentialTargetIds)];
    wsLogger(`TARGETING_HANDLER: Valid primary targets for ${command.name}: ${uniqueTargetIds.join(', ') || 'None'}`);
    return uniqueTargetIds;
}


/**
 * Mendapatkan semua unit yang akan terkena efek berdasarkan target utama yang dipilih dan area efek skill (Tahap 2).
 */
function getAreaAffectedTargets(primaryTargetId, actorUnit, command, allUnitsFromState) {
    if (!command || !command.targetingParams || !command.targetingParams.area) {
        wsLogger("TARGETING_HANDLER_ERROR: Missing command targetingParams.area in getAreaAffectedTargets.");
        return primaryTargetId ? [primaryTargetId] : [];
    }

    const aliveUnits = getAliveUnits(allUnitsFromState);
    if (aliveUnits.length === 0) return [];

    const sortedAliveUnits = [...aliveUnits].sort((a, b) => a.pseudoPos - b.pseudoPos);
    const numUnits = sortedAliveUnits.length;

    const primaryTargetUnit = sortedAliveUnits.find(u => u.id === primaryTargetId);
    const areaParams = command.targetingParams.area;
    const affectedTypes = areaParams.affectedTypes || ["Enemy"]; 
    let originUnitForAoE = null;
    const actorInSortedForAoE = sortedAliveUnits.find(u => u.id === actorUnit.id);


    if (areaParams.origin === "SelectedTarget") {
        if (!primaryTargetUnit) {
            wsLogger("TARGETING_HANDLER_ERROR: Primary target not found for SelectedTarget origin AoE.");
            return [];
        }
        originUnitForAoE = primaryTargetUnit;
    } else if (areaParams.origin === "Caster") {
        if (!actorInSortedForAoE) { // Gunakan actorInSortedForAoE yang sudah dicari
             wsLogger("TARGETING_HANDLER_ERROR: Caster unit not found in sortedAliveUnits for Caster origin AoE.");
            return [];
        }
        originUnitForAoE = actorInSortedForAoE;
    } else {
        wsLogger(`TARGETING_HANDLER_WARN: Unknown area origin: ${areaParams.origin}. Defaulting to SelectedTarget if possible.`);
        originUnitForAoE = primaryTargetUnit || actorInSortedForAoE; // Fallback ke actor jika primaryTargetUnit tidak ada
    }

    if (!originUnitForAoE) {
         wsLogger("TARGETING_HANDLER_ERROR: Origin unit for AoE could not be determined.");
        return [];
    }

    const originIndex = sortedAliveUnits.findIndex(u => u.id === originUnitForAoE.id);
    if (originIndex === -1) {
        wsLogger(`TARGETING_HANDLER_ERROR: Origin unit ${originUnitForAoE.name} not found in sorted list for AoE.`);
        return [];
    }

    let affectedTargetIds = [];
    wsLogger(`TARGETING_HANDLER_AOE: Origin: ${originUnitForAoE.name} (psPos: ${originUnitForAoE.pseudoPos}, index: ${originIndex}), Shape: ${areaParams.shape}, AffectedTypes: ${affectedTypes.join(', ')}`);

    switch (areaParams.shape) {
        case "SingleOnSelected":
            if (primaryTargetUnit && affectedTypes.includes(primaryTargetUnit.type)) {
                affectedTargetIds.push(primaryTargetUnit.id);
                wsLogger(`TARGETING_HANDLER_AOE [SingleOnSelected]: Affected: ${primaryTargetUnit.name}`);
            } else if (primaryTargetUnit && affectedTypes.includes("Self") && primaryTargetUnit.id === actorUnit.id){
                // Kasus khusus jika skill Self tapi area originnya SelectedTarget (yang adalah Caster)
                affectedTargetIds.push(primaryTargetUnit.id);
                wsLogger(`TARGETING_HANDLER_AOE [SingleOnSelected Self]: Affected: ${primaryTargetUnit.name}`);
            }
            break;

        case "RadiusAroundOrigin":
            const radiusDistance = areaParams.distance || 0;
            if (numUnits > 0) {
                for (let i = 0; i < numUnits; i++) {
                    const currentUnit = sortedAliveUnits[i];
                    const diff = Math.abs(i - originIndex);
                    const circularDistance = Math.min(diff, numUnits - diff);

                    if (circularDistance <= radiusDistance) {
                        // Cek apakah tipe unit ini termasuk dalam affectedTypes ATAU
                        // jika affectedTypes mengandung "Self" dan unit saat ini adalah caster
                        if (affectedTypes.includes(currentUnit.type) || (affectedTypes.includes("Self") && currentUnit.id === actorUnit.id) ) {
                            affectedTargetIds.push(currentUnit.id);
                            wsLogger(`TARGETING_HANDLER_AOE [RadiusAroundOrigin D:${radiusDistance}]: Unit ${currentUnit.name} (index ${i}, psPos ${currentUnit.pseudoPos}) is within circular radius of ${originUnitForAoE.name}. CircDist: ${circularDistance}`);
                        }
                    }
                }
            }
            break;
        
        case "LineThroughTarget": 
            if (primaryTargetUnit) { // Membutuhkan primaryTargetUnit sebagai acuan
                 // Target utama selalu kena jika tipenya sesuai (atau jika affectedTypes adalah "Self" dan primaryTarget adalah caster)
                if (affectedTypes.includes(primaryTargetUnit.type) || (affectedTypes.includes("Self") && primaryTargetUnit.id === actorUnit.id) ) {
                    affectedTargetIds.push(primaryTargetUnit.id); 
                    wsLogger(`TARGETING_HANDLER_AOE [LineThroughTarget]: Primary target ${primaryTargetUnit.name} affected.`);
                }

                const primaryTargetIndexInSorted = sortedAliveUnits.findIndex(u => u.id === primaryTargetUnit.id);
                if (primaryTargetIndexInSorted !== -1) { // Pastikan primary target ditemukan di sorted list
                    const lineDistance = areaParams.distance || 1; 

                    // Target di depan primaryTarget (relatif dalam sortedAliveUnits)
                    const nextTargetIndex = primaryTargetIndexInSorted + lineDistance;
                    if (nextTargetIndex >= 0 && nextTargetIndex < numUnits) { 
                        const nextTarget = sortedAliveUnits[nextTargetIndex];
                        if (nextTarget && affectedTypes.includes(nextTarget.type)) {
                            affectedTargetIds.push(nextTarget.id);
                            wsLogger(`TARGETING_HANDLER_AOE [LineThroughTarget]: Forward pierce hit ${nextTarget.name}.`);
                        }
                    }
                    // Target di belakang primaryTarget (relatif dalam sortedAliveUnits)
                    const prevTargetIndex = primaryTargetIndexInSorted - lineDistance;
                    if (prevTargetIndex >= 0 && prevTargetIndex < numUnits) { 
                        const prevTarget = sortedAliveUnits[prevTargetIndex];
                        if (prevTarget && affectedTypes.includes(prevTarget.type)) {
                            affectedTargetIds.push(prevTarget.id);
                             wsLogger(`TARGETING_HANDLER_AOE [LineThroughTarget]: Backward pierce hit ${prevTarget.name}.`);
                        }
                    }
                }
            } else {
                 wsLogger(`TARGETING_HANDLER_AOE_WARN [LineThroughTarget]: Primary target ID ${primaryTargetId} not found in sorted units.`);
            }
            break;

        default:
            wsLogger(`TARGETING_HANDLER_WARN: Unknown or unhandled area shape: ${areaParams.shape}`);
            if (primaryTargetUnit && affectedTypes.includes(primaryTargetUnit.type)) {
                affectedTargetIds.push(primaryTargetUnit.id);
            } else if (primaryTargetUnit && affectedTypes.includes("Self") && primaryTargetUnit.id === actorUnit.id){
                 affectedTargetIds.push(primaryTargetUnit.id);
            }
            break;
    }

    const uniqueAffectedIds = [...new Set(affectedTargetIds)];
    wsLogger(`TARGETING_HANDLER_AOE: Final affected targets for ${command.name}: ${uniqueAffectedIds.join(', ') || 'None'}`);
    return uniqueAffectedIds;
}

wsLogger("TARGETING_HANDLER_JS: targeting_handler.js (v4: Improved Circular & AoE Logic) loaded.");
