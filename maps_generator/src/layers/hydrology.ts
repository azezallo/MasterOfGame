import { MapGenerationConfig } from '../config';

export interface HydrologyResult {
    riverMap: boolean[][];
    lakesMap: boolean[][];
}

// Random number generator using a simple hash based on seed and coordinates
function pseudoRandom(seed: number, x: number, y: number, step: number): number {
    const s = Math.sin(seed + x * 12.9898 + y * 78.233 + step * 43.123) * 43758.5453;
    return s - Math.floor(s);
}

export function generateRivers(config: MapGenerationConfig, elevationMap: number[][]): HydrologyResult {
    const { width, height, oceanLevel, hydrology, elevation } = config;
    
    // Initialize empty maps
    const riverMap: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));
    const lakesMap: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));

    // Determine possible spring locations (high elevation)
    const possibleSprings: { x: number, y: number }[] = [];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (elevationMap[y][x] >= hydrology.minRiverStartElevation) {
                possibleSprings.push({ x, y });
            }
        }
    }

    // Shuffle and pick N river starting points
    const springs: { x: number, y: number }[] = [];
    let step = 0;
    
    for (let i = 0; i < hydrology.riverCount; i++) {
        if (possibleSprings.length === 0) break;
        
        // Pick a random index based on our pseudoRandom function
        const randIndex = Math.floor(pseudoRandom(elevation.seed, i, i, step++) * possibleSprings.length);
        springs.push(possibleSprings[randIndex]);
        
        // Remove the picked spring to avoid duplicates
        possibleSprings.splice(randIndex, 1);
    }

    // 8-directional neighbors
    const directions = [
        { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
    ];

    for (const spring of springs) {
        let currentX = spring.x;
        let currentY = spring.y;
        
        // Prevent infinite loops if river gets stuck in a cycle
        let failsafe = 0;
        
        while (failsafe < width * height) {
            riverMap[currentY][currentX] = true;
            
            // Reached ocean?
            if (elevationMap[currentY][currentX] <= oceanLevel) {
                break;
            }

            let nextX = -1;
            let nextY = -1;
            let candidates: { x: number, y: number, elev: number }[] = [];

            // Find neighbors that go downhill
            for (const dir of directions) {
                const nx = currentX + dir.dx;
                const ny = currentY + dir.dy;

                // Check bounds
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborElev = elevationMap[ny][nx];
                    
                    // The water wants to go down.
                    if (neighborElev < elevationMap[currentY][currentX]) {
                        candidates.push({ x: nx, y: ny, elev: neighborElev });
                    }
                }
            }

            if (candidates.length > 0) {
                // Sort by steepest (lowest elevation first)
                candidates.sort((a, b) => a.elev - b.elev);
                
                // Usually take the steepest path, but sometimes meander (take the 2nd steepest)
                let choice = candidates[0];
                if (candidates.length > 1) {
                    const meanderChance = pseudoRandom(elevation.seed, currentX, currentY, failsafe);
                    if (meanderChance > 0.6) {
                        choice = candidates[1];
                    }
                }
                nextX = choice.x;
                nextY = choice.y;
            }

            if (nextX === -1 && nextY === -1) {
                // We reached a local minimum (a sink/depression).
                // Create a small lake of 1-2 tiles (for now we just mark the current tile as a lake).
                lakesMap[currentY][currentX] = true;
                break; 
            }

            currentX = nextX;
            currentY = nextY;
            failsafe++;
        }
    }

    return { riverMap, lakesMap };
}

export function applyRiverMoisture(config: MapGenerationConfig, moistureMap: number[][], riverMap: boolean[][], lakesMap: boolean[][]) {
    const { width, height, hydrology } = config;
    const { riverMoistureBonus } = hydrology;

    // Create a copy of the moisture map to apply changes without cascading them immediately in the same pass
    const newMoistureMap = moistureMap.map(row => [...row]);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (riverMap[y][x] || lakesMap[y][x]) {
                // Apply moisture bonus to a 2-tile radius
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        // Check bounds
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const distance = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance (square)
                            
                            if (distance === 0) {
                                newMoistureMap[ny][nx] += riverMoistureBonus; // 100% bonus for the river itself
                            } else if (distance === 1) {
                                // Ragged inner banks: random multiplier between 0.8 and 1.2
                                const noise = pseudoRandom(hydrology.minRiverStartElevation, nx, ny, 1);
                                newMoistureMap[ny][nx] += riverMoistureBonus * (0.8 + noise * 0.4); 
                            } else if (distance === 2) {
                                // Ragged outer banks: 50% chance to have some moisture spread
                                const noise = pseudoRandom(hydrology.minRiverStartElevation, nx, ny, 2);
                                if (noise > 0.5) {
                                    newMoistureMap[ny][nx] += riverMoistureBonus * 0.4;
                                }
                            }
                            
                            // Cap moisture at 1.0
                            newMoistureMap[ny][nx] = Math.min(1.0, newMoistureMap[ny][nx]);
                        }
                    }
                }
            }
        }
    }

    // Update the original moisture map
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            moistureMap[y][x] = newMoistureMap[y][x];
        }
    }
}
