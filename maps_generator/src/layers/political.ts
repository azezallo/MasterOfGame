import { MapGenerationConfig } from '../config';

export interface Settlement {
    x: number;
    y: number;
    type: 'capital' | 'city' | 'village';
    factionId: number;
    parentId?: {x: number, y: number}; // The city/capital this village reports to, or the capital this city reports to
}

export interface PoliticalResult {
    settlementMap: ('capital' | 'city' | 'village' | null)[][];
    factionMap: (number | null)[][];
    roadMap: boolean[][];
    settlements: Settlement[];
}

function pseudoRandom(seed: number, index: number): number {
    const s = Math.sin(seed + index * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// Simple A* pathfinding
function findPath(startX: number, startY: number, endX: number, endY: number, config: MapGenerationConfig, elevationMap: number[][]): {x: number, y: number}[] {
    const { width, height, oceanLevel } = config;
    
    // Using a simple object map instead of PriorityQueue for simplicity (slower but okay for small maps)
    const openSet = new Map<string, {x: number, y: number, f: number, g: number, parent: any}>();
    const closedSet = new Set<string>();
    
    const startKey = `${startX},${startY}`;
    openSet.set(startKey, {x: startX, y: startY, f: 0, g: 0, parent: null});
    
    const maxIterations = 5000;
    let iterations = 0;
    
    while (openSet.size > 0 && iterations < maxIterations) {
        iterations++;
        
        // Find node with lowest f
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
            // Reconstruct path
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
            
            // Heuristics: Water is very expensive (bridge), mountains are expensive
            if (elev < oceanLevel) cost = 10; // Avoid water if possible
            else if (elev > 0.8) cost = 5; // Avoid high mountains
            else cost = 1; // Plains/Forests are okay
            
            if (Math.abs(dir.dx) + Math.abs(dir.dy) === 2) cost *= 1.414; // Diagonal
            
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
    
    return []; // No path found
}

export function generatePoliticalMap(config: MapGenerationConfig, elevationMap: number[][]): PoliticalResult {
    const { width, height, oceanLevel, political } = config;
    let seedIndex = 0;
    
    const settlementMap: ('capital' | 'city' | 'village' | null)[][] = Array(height).fill(0).map(() => Array(width).fill(null));
    const factionMap: (number | null)[][] = Array(height).fill(0).map(() => Array(width).fill(null));
    const roadMap: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));
    
    const settlements: Settlement[] = [];
    const landTiles: {x: number, y: number}[] = [];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (elevationMap[y][x] > oceanLevel) {
                landTiles.push({x, y});
            }
        }
    }
    
    if (landTiles.length === 0) return { settlementMap, factionMap, roadMap, settlements };

    // 1. Generate Capitals (Faction Centers)
    let factionsCreated = 0;
    while (factionsCreated < political.factionCount && seedIndex < 1000) {
        const idx = Math.floor(pseudoRandom(political.seed, seedIndex++) * landTiles.length);
        const tile = landTiles[idx];
        
        // Ensure distance from other capitals
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
                factionId: factionsCreated
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
        
        // If the closest capital is too far, it's wildlands (null)
        if (minDistance <= political.maxInfluenceRadius) {
            factionMap[tile.y][tile.x] = closestFaction;
        }
    }
    
    // 3. Place Cities and Villages
    const newSettlements: Settlement[] = [];
    
    for (const cap of settlements) {
        // Place Cities for this faction
        const factionCities: Settlement[] = [];
        let citiesPlaced = 0;
        let attempts = 0;
        
        while (citiesPlaced < political.citiesPerFaction && attempts < 100) {
            attempts++;
            const idx = Math.floor(pseudoRandom(political.seed, seedIndex++) * landTiles.length);
            const tile = landTiles[idx];
            
            if (factionMap[tile.y][tile.x] === cap.factionId) {
                if (distance(tile.x, tile.y, cap.x, cap.y) > 5) {
                    const city: Settlement = {
                        x: tile.x, y: tile.y,
                        type: 'city',
                        factionId: cap.factionId,
                        parentId: {x: cap.x, y: cap.y}
                    };
                    factionCities.push(city);
                    newSettlements.push(city);
                    citiesPlaced++;
                }
            }
        }
        
        // Place Villages around Capital
        for (let i = 0; i < political.villagesPerCity; i++) {
            const angle = pseudoRandom(political.seed, seedIndex++) * Math.PI * 2;
            const dist = 3 + pseudoRandom(political.seed, seedIndex++) * 3; // 3 to 6 tiles away
            const vx = Math.floor(cap.x + Math.cos(angle) * dist);
            const vy = Math.floor(cap.y + Math.sin(angle) * dist);
            
            if (vx >= 0 && vx < width && vy >= 0 && vy < height && elevationMap[vy][vx] > oceanLevel) {
                newSettlements.push({
                    x: vx, y: vy,
                    type: 'village',
                    factionId: cap.factionId,
                    parentId: {x: cap.x, y: cap.y}
                });
            }
        }
        
        // Place Villages around each City
        for (const city of factionCities) {
            for (let i = 0; i < political.villagesPerCity; i++) {
                const angle = pseudoRandom(political.seed, seedIndex++) * Math.PI * 2;
                const dist = 2 + pseudoRandom(political.seed, seedIndex++) * 2; // 2 to 4 tiles away
                const vx = Math.floor(city.x + Math.cos(angle) * dist);
                const vy = Math.floor(city.y + Math.sin(angle) * dist);
                
                if (vx >= 0 && vx < width && vy >= 0 && vy < height && elevationMap[vy][vx] > oceanLevel) {
                    newSettlements.push({
                        x: vx, y: vy,
                        type: 'village',
                        factionId: city.factionId,
                        parentId: {x: city.x, y: city.y}
                    });
                }
            }
        }
    }
    
    settlements.push(...newSettlements);
    
    // 4. Mark settlement tiles (Multi-tile support)
    for (const s of settlements) {
        if (s.type === 'capital') {
            // 3x3
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
            // 2x2
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
            // 1x1
            settlementMap[s.y][s.x] = 'village';
        }
    }
    
    // 5. Connect with Roads
    for (const s of settlements) {
        if (s.parentId) {
            const path = findPath(s.x, s.y, s.parentId.x, s.parentId.y, config, elevationMap);
            for (const p of path) {
                roadMap[p.y][p.x] = true;
            }
        }
    }
    
    // 6. Connect Capitals together (International Trade Routes)
    const capitals = settlements.filter(s => s.type === 'capital');
    for (let i = 0; i < capitals.length; i++) {
        const c1 = capitals[i];
        // Connect each capital to the next one in the array to form a complete network loop
        const c2 = capitals[(i + 1) % capitals.length];
        
        const path = findPath(c1.x, c1.y, c2.x, c2.y, config, elevationMap);
        for (const p of path) {
            roadMap[p.y][p.x] = true;
        }
    }
    
    return { settlementMap, factionMap, roadMap, settlements };
}
