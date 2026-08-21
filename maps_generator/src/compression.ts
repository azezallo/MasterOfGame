import { WorldData, CompressedWorldData, BiomeType, Settlement } from './types';

export function compressPayload(payload: WorldData, factor: number, keepRoadsAndCities: boolean = false): CompressedWorldData {
    const origWidth = payload.config.width;
    const origHeight = payload.config.height;
    const newWidth = Math.ceil(origWidth / factor);
    const newHeight = Math.ceil(origHeight / factor);

    const newElevation = Array(newHeight).fill(0).map(() => Array(newWidth).fill(0));
    const newBiomes = Array(newHeight).fill(0).map(() => Array(newWidth).fill(BiomeType.OCEAN));
    const newFactionMap = Array(newHeight).fill(0).map(() => Array(newWidth).fill(null));
    const newLakes = Array(newHeight).fill(0).map(() => Array(newWidth).fill(false));
    const newRoadMap = keepRoadsAndCities ? Array(newHeight).fill(0).map(() => Array(newWidth).fill(false)) : null;
    const newProvinceMap = keepRoadsAndCities ? Array(newHeight).fill(0).map(() => Array(newWidth).fill(null)) : null;

    for (let ny = 0; ny < newHeight; ny++) {
        for (let nx = 0; nx < newWidth; nx++) {
            const startX = nx * factor;
            const startY = ny * factor;
            const endX = Math.min(startX + factor, origWidth);
            const endY = Math.min(startY + factor, origHeight);

            let maxElev = 0;
            const biomeCounts = new Map<BiomeType, number>();
            const factionCounts = new Map<number, number>();
            const provinceCounts = new Map<string, number>();
            let hasLake = false;
            let hasRoad = false;

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const e = payload.elevation[y][x];
                    if (e > maxElev) maxElev = e;

                    const b = payload.biomes[y][x];
                    biomeCounts.set(b, (biomeCounts.get(b) || 0) + 1);

                    const f = payload.political.factionMap[y][x];
                    if (f !== null) {
                        factionCounts.set(f, (factionCounts.get(f) || 0) + 1);
                    }
                    
                    if (keepRoadsAndCities && payload.political.provinceMap) {
                        const pId = payload.political.provinceMap[y][x];
                        if (pId !== null && pId !== undefined) {
                            const pKey = typeof pId === 'object' ? JSON.stringify(pId) : String(pId);
                            provinceCounts.set(pKey, (provinceCounts.get(pKey) || 0) + 1);
                        }
                    }
                    
                    if (payload.lakes[y][x]) hasLake = true;
                    if (keepRoadsAndCities && payload.political.roadMap && payload.political.roadMap[y][x]) hasRoad = true;
                }
            }

            newElevation[ny][nx] = maxElev;
            newLakes[ny][nx] = hasLake;
            if (keepRoadsAndCities && newRoadMap) newRoadMap[ny][nx] = hasRoad;

            // Biome logic: Land > Ocean priority
            let bestBiome = BiomeType.OCEAN;
            let bestBiomeCount = -1;
            for (const [b, count] of biomeCounts.entries()) {
                if (b === BiomeType.OCEAN) continue; // Skip ocean for max finding
                if (count > bestBiomeCount) {
                    bestBiomeCount = count;
                    bestBiome = b;
                }
            }
            if (bestBiomeCount === -1) {
                bestBiome = BiomeType.OCEAN; // Only ocean present
            }
            newBiomes[ny][nx] = bestBiome;

            // Faction logic
            let bestFaction = null;
            let bestFactionCount = -1;
            for (const [f, count] of factionCounts.entries()) {
                if (count > bestFactionCount) {
                    bestFactionCount = count;
                    bestFaction = f;
                }
            }
            newFactionMap[ny][nx] = bestFaction;
            
            // Province logic
            if (keepRoadsAndCities && newProvinceMap) {
                let bestProvince = null;
                let bestProvCount = -1;
                for (const [pKey, count] of provinceCounts.entries()) {
                    if (count > bestProvCount) {
                        bestProvCount = count;
                        bestProvince = pKey;
                    }
                }
                newProvinceMap[ny][nx] = bestProvince ? JSON.parse(bestProvince) : null;
            }
        }
    }

    // Filter settlements
    const newSettlements = payload.political.settlements
        .filter((s) => keepRoadsAndCities ? (s.type !== 'village') : (s.type === 'capital'))
        .map((s) => ({
            ...s,
            x: Math.floor(s.x / factor),
            y: Math.floor(s.y / factor),
            parentId: s.parentId ? {
                x: Math.floor(s.parentId.x / factor),
                y: Math.floor(s.parentId.y / factor)
            } : undefined
        }));
        
    // Generate new settlementMap
    const newSettlementMap = Array(newHeight).fill(0).map(() => Array(newWidth).fill(null));
    for (const s of newSettlements) {
        if (s.y >= 0 && s.y < newHeight && s.x >= 0 && s.x < newWidth) {
            newSettlementMap[s.y][s.x] = s.type;
        }
    }

    // Process roadPaths
    const newRoadPaths = keepRoadsAndCities && payload.political.roadPaths 
        ? payload.political.roadPaths.map((path) => 
            path.map(p => ({ x: p.x / factor, y: p.y / factor }))
          )
        : undefined;

    return {
        config: {
            ...payload.config,
            width: newWidth,
            height: newHeight
        },
        elevation: newElevation,
        temperature: Array(newHeight).fill(0).map(() => Array(newWidth).fill(0)),
        moisture: Array(newHeight).fill(0).map(() => Array(newWidth).fill(0)),
        biomes: newBiomes,
        lakes: newLakes,
        magic: Array(newHeight).fill(0).map(() => Array(newWidth).fill(0)),
        political: {
            factionMap: newFactionMap,
            provinceMap: newProvinceMap as any, // because it could be null depending on keepRoadsAndCities
            settlementMap: newSettlementMap,
            roadMap: newRoadMap || Array(newHeight).fill(0).map(() => Array(newWidth).fill(false)),
            roadPaths: newRoadPaths,
            settlements: newSettlements
        }
    };
}
