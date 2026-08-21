import { MapGenerationConfig } from '../types';
import { Settlement, PoliticalResult, Faction } from '../types';
import { pseudoRandom } from '../math/random';
import { distance } from '../math/utils';
import { generateSettlementName, generateFaction } from './nameGenerator';

// Simple A* pathfinding
function findPath(startX: number, startY: number, endX: number, endY: number, config: MapGenerationConfig, elevationMap: number[][]): {x: number, y: number}[] {
    const { width, height, oceanLevel } = config;
    
    const openSet = new Map<string, {x: number, y: number, f: number, g: number, parent: any}>();
    const closedSet = new Set<string>();
    
    const startKey = `${startX},${startY}`;
    openSet.set(startKey, {x: startX, y: startY, f: 0, g: 0, parent: null});
    
    const maxIterations = 5000;
    let iterations = 0;
    
    while (openSet.size > 0 && iterations < maxIterations) {
        iterations++;
        
        let currentKey = '';
        let lowestF = Infinity;
        for (const [key, node] of openSet.entries()) {
            if (node.f < lowestF) {
                lowestF = node.f;
                currentKey = key;
            }
        }
        
        const current = openSet.get(currentKey)!;
        
        if (current.x === endX && current.y === endY) {
            const path = [];
            let curr = current;
            while (curr.parent) {
                path.push({x: curr.x, y: curr.y});
                curr = curr.parent;
            }
            return path;
        }
        
        openSet.delete(currentKey);
        closedSet.add(currentKey);
        
        const neighbors = [
            {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0},
            {dx: 1, dy: -1}, {dx: 1, dy: 1}, {dx: -1, dy: 1}, {dx: -1, dy: -1}
        ];
        
        for (const dir of neighbors) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            const nKey = `${nx},${ny}`;
            
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (closedSet.has(nKey)) continue;
            
            const elev = elevationMap[ny][nx];
            let cost = 1;
            
            if (elev < oceanLevel) cost = 10;
            else if (elev > 0.8) cost = 5;
            else cost = 1;
            
            if (Math.abs(dir.dx) + Math.abs(dir.dy) === 2) cost *= 1.414;
            
            const tentativeG = current.g + cost;
            
            if (!openSet.has(nKey) || tentativeG < openSet.get(nKey)!.g) {
                const h = distance(nx, ny, endX, endY);
                openSet.set(nKey, {
                    x: nx, y: ny, 
                    g: tentativeG, 
                    f: tentativeG + h, 
                    parent: current
                });
            }
        }
    }
    
    return [];
}

export function generatePoliticalMap(config: MapGenerationConfig, elevationMap: number[][]): PoliticalResult {
    const { width, height, oceanLevel, political } = config;
    
    const settlementMap: ('capital' | 'city' | 'village' | null)[][] = Array(height).fill(null).map(() => Array(width).fill(null));
    const factionMap: (number | null)[][] = Array(height).fill(null).map(() => Array(width).fill(null));
    const provinceMap: (number | null)[][] = Array(height).fill(null).map(() => Array(width).fill(null));
    const roadMap: boolean[][] = Array(height).fill(false).map(() => Array(width).fill(false));
    const settlements: Settlement[] = [];
    const factions: Faction[] = [];
    
    let seedIndex = 0;
    
    const landTiles: {x: number, y: number}[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (elevationMap[y][x] > oceanLevel) {
                landTiles.push({x, y});
            }
        }
    }
    
    if (landTiles.length === 0) return { settlementMap, factionMap, provinceMap, roadMap, settlements, factions };

    // 1. Generate Capitals (Faction Centers)
    let factionsCreated = 0;
    let nameIdCounter = 0;
    while (factionsCreated < political.factionCount && seedIndex < 1000) {
        const idx = Math.floor(pseudoRandom(political.seed, seedIndex++) * landTiles.length);
        const tile = landTiles[idx];
        
        let tooClose = false;
        for (const s of settlements) {
            if (distance(tile.x, tile.y, s.x, s.y) < 15) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            settlements.push({
                x: tile.x, y: tile.y,
                type: 'capital',
                name: generateSettlementName(political.seed, nameIdCounter++),
                factionId: factionsCreated
            });
            
            const factionData = generateFaction(political.seed, factionsCreated);
            let actualGov = factionData.expectedGov;
            
            // 10% chance of a government mismatch (historical remnant)
            const mismatchRand = pseudoRandom(political.seed + 1000, factionsCreated * 300);
            if (mismatchRand < 0.10) {
                const govs: import('../types').GovernmentType[] = ['monarchy', 'republic', 'theocracy', 'tribal', 'federation'];
                const filtered = govs.filter(g => g !== factionData.expectedGov);
                actualGov = filtered[Math.floor(pseudoRandom(political.seed + 1000, factionsCreated * 301) * filtered.length)];
            }
            
            factions.push({
                id: factionsCreated,
                name: factionData.name,
                government: actualGov
            });
            factionsCreated++;
        }
    }

    // 2. Generate Voronoi Faction Borders with Wildlands constraint
    for (const tile of landTiles) {
        let closestFaction: number | null = null;
        let minDistance = Infinity;
        
        for (const cap of settlements) {
            const d = distance(tile.x, tile.y, cap.x, cap.y);
            if (d < minDistance) {
                minDistance = d;
                closestFaction = cap.factionId;
            }
        }
        
        if (minDistance <= political.maxInfluenceRadius) {
            factionMap[tile.y][tile.x] = closestFaction;
        }
    }

    // 2.5 Partition Wildlands into manageable chunks
    const wildTiles: {x: number, y: number}[] = [];
    for (const tile of landTiles) {
        if (factionMap[tile.y][tile.x] === null) {
            wildTiles.push(tile);
        }
    }

    const wildRegions = new Set<number>();
    
    if (wildTiles.length > 0) {
        const expectedArea = Math.PI * Math.pow(political.maxInfluenceRadius, 2) * 0.25;
        const numWildRegions = Math.max(2, Math.floor(wildTiles.length / expectedArea));
        
        const wildAnchors: {x: number, y: number, id: number}[] = [];
        
        for (let i = 1; i <= numWildRegions; i++) {
            const idx = Math.floor(pseudoRandom(political.seed, seedIndex++) * wildTiles.length);
            const id = -i;
            wildAnchors.push({x: wildTiles[idx].x, y: wildTiles[idx].y, id});
            wildRegions.add(id);
        }
        
        for (let pass = 0; pass < 3; pass++) {
            const anchorSums = new Map<number, {x: number, y: number, count: number}>();
            for (const a of wildAnchors) anchorSums.set(a.id, {x: 0, y: 0, count: 0});
            
            for (const tile of wildTiles) {
                let closestAnchor = -1;
                let minDistance = Infinity;
                for (const anchor of wildAnchors) {
                    const d = distance(tile.x, tile.y, anchor.x, anchor.y);
                    if (d < minDistance) {
                        minDistance = d;
                        closestAnchor = anchor.id;
                    }
                }
                const sum = anchorSums.get(closestAnchor)!;
                sum.x += tile.x;
                sum.y += tile.y;
                sum.count++;
                
                if (pass === 2) {
                    factionMap[tile.y][tile.x] = closestAnchor;
                }
            }
            
            if (pass < 2) {
                for (const a of wildAnchors) {
                    const sum = anchorSums.get(a.id)!;
                    if (sum.count > 0) {
                        a.x = Math.floor(sum.x / sum.count);
                        a.y = Math.floor(sum.y / sum.count);
                    }
                }
            }
        }
    }
    
    // 3. Partition Factions and Wildlands into Provinces (Lloyd's relaxation)
    let globalProvinceCounter = 1;
    const newSettlements: Settlement[] = [];
    
    // Group tiles by Faction/Wildland
    const regionTiles = new Map<number, {x: number, y: number}[]>();
    for (const tile of landTiles) {
        const regionId = factionMap[tile.y][tile.x];
        if (regionId !== null) {
            if (!regionTiles.has(regionId)) regionTiles.set(regionId, []);
            regionTiles.get(regionId)!.push(tile);
        }
    }

    // Process each region
    for (const [regionId, tiles] of regionTiles.entries()) {
        const isWild = regionId < 0;
        
        // Determine number of provinces
        let numProvinces = isWild ? 3 + Math.floor(pseudoRandom(political.seed, seedIndex++) * 3) : (political.citiesPerFaction + 1);
        // Ensure we don't request more provinces than tiles
        numProvinces = Math.min(numProvinces, tiles.length);
        
        const anchors: {x: number, y: number, id: number, isFixed: boolean, settlement?: Settlement}[] = [];
        
        if (!isWild) {
            // Find the capital
            const capital = settlements.find(s => s.factionId === regionId && s.type === 'capital');
            if (capital) {
                capital.provinceId = globalProvinceCounter;
                anchors.push({
                    x: capital.x, y: capital.y, 
                    id: globalProvinceCounter++, 
                    isFixed: true,
                    settlement: capital
                });
            }
        }
        
        // Add random anchors for the rest of the provinces
        while (anchors.length < numProvinces) {
            const idx = Math.floor(pseudoRandom(political.seed, seedIndex++) * tiles.length);
            anchors.push({
                x: tiles[idx].x, y: tiles[idx].y, 
                id: globalProvinceCounter++, 
                isFixed: false
            });
        }
        
        // Lloyd's relaxation for provinces (3 passes)
        for (let pass = 0; pass < 3; pass++) {
            const anchorSums = new Map<number, {x: number, y: number, count: number}>();
            for (const a of anchors) anchorSums.set(a.id, {x: 0, y: 0, count: 0});
            
            for (const tile of tiles) {
                let closestAnchor = -1;
                let minDistance = Infinity;
                for (const anchor of anchors) {
                    const d = distance(tile.x, tile.y, anchor.x, anchor.y);
                    if (d < minDistance) {
                        minDistance = d;
                        closestAnchor = anchor.id;
                    }
                }
                const sum = anchorSums.get(closestAnchor)!;
                sum.x += tile.x;
                sum.y += tile.y;
                sum.count++;
                
                if (pass === 2) {
                    provinceMap[tile.y][tile.x] = closestAnchor;
                }
            }
            
            if (pass < 2) {
                for (const a of anchors) {
                    if (!a.isFixed) {
                        const sum = anchorSums.get(a.id)!;
                        if (sum.count > 0) {
                            a.x = Math.floor(sum.x / sum.count);
                            a.y = Math.floor(sum.y / sum.count);
                        }
                    }
                }
            }
        }
        
        // Create City settlements at the final anchor positions (for factions only)
        if (!isWild) {
            const capital = settlements.find(s => s.factionId === regionId && s.type === 'capital');
            for (const a of anchors) {
                if (!a.isFixed) {
                    const city: Settlement = {
                        x: a.x, y: a.y,
                        type: 'city',
                        name: generateSettlementName(political.seed, nameIdCounter++),
                        factionId: regionId,
                        provinceId: a.id,
                        parentId: capital ? {x: capital.x, y: capital.y} : undefined
                    };
                    newSettlements.push(city);
                }
            }
        }
    }

    settlements.push(...newSettlements);

    // 4. Place Villages
    const villages: Settlement[] = [];
    for (const s of settlements) {
        if (s.type === 'capital' || s.type === 'city') {
            for (let i = 0; i < political.villagesPerCity; i++) {
                const angle = pseudoRandom(political.seed, seedIndex++) * Math.PI * 2;
                const dist = (s.type === 'capital' ? 3 : 2) + pseudoRandom(political.seed, seedIndex++) * 3;
                const vx = Math.floor(s.x + Math.cos(angle) * dist);
                const vy = Math.floor(s.y + Math.sin(angle) * dist);
                
                if (vx >= 0 && vx < width && vy >= 0 && vy < height && elevationMap[vy][vx] > oceanLevel) {
                    // Find which province this village falls into and ensure it belongs to the same faction
                    const fId = factionMap[vy][vx];
                    const pId = provinceMap[vy][vx];
                    if (fId === s.factionId) {
                        villages.push({
                            x: vx, y: vy,
                            type: 'village',
                            name: generateSettlementName(political.seed, nameIdCounter++),
                            factionId: s.factionId,
                            provinceId: pId !== null ? pId : undefined,
                            parentId: {x: s.x, y: s.y}
                        });
                    }
                }
            }
        }
    }
    settlements.push(...villages);
    
    // 5. Mark settlement tiles (Multi-tile support)
    for (const s of settlements) {
        if (s.type === 'capital') {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = s.x + dx;
                    const ny = s.y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && elevationMap[ny][nx] > oceanLevel) {
                        settlementMap[ny][nx] = 'capital';
                    }
                }
            }
        } else if (s.type === 'city') {
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    const nx = s.x + dx;
                    const ny = s.y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && elevationMap[ny][nx] > oceanLevel) {
                        settlementMap[ny][nx] = 'city';
                    }
                }
            }
        } else if (s.type === 'village') {
            settlementMap[s.y][s.x] = 'village';
        }
    }
    
    // 6. Connect with Roads
    const roadPaths: {x: number, y: number}[][] = [];
    
    for (const s of settlements) {
        if (s.parentId) {
            const path = findPath(s.x, s.y, s.parentId.x, s.parentId.y, config, elevationMap);
            if (path.length > 0) roadPaths.push(path);
            for (const p of path) {
                roadMap[p.y][p.x] = true;
            }
        }
    }
    
    // 7. Connect Capitals together (International Trade Routes)
    const capitals = settlements.filter(s => s.type === 'capital');
    for (let i = 0; i < capitals.length; i++) {
        const c1 = capitals[i];
        const c2 = capitals[(i + 1) % capitals.length];
        const path = findPath(c1.x, c1.y, c2.x, c2.y, config, elevationMap);
        if (path.length > 0) roadPaths.push(path);
        for (const p of path) {
            roadMap[p.y][p.x] = true;
        }
    }
    
    return {
        factionMap,
        provinceMap,
        settlementMap,
        roadMap,
        roadPaths,
        settlements,
        factions
    };
}
