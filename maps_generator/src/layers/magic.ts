import { MapGenerationConfig } from '../types';
import { pseudoRandom } from '../math/random';
import { distance } from '../math/utils';

export function generateMagicMap(config: MapGenerationConfig): number[][] {
    const { width, height, magic } = config;
    
    // Initialize the map with neutral magic (0.5)
    let manaMap: number[][] = Array(height).fill(0).map(() => Array(width).fill(0.5));
    
    // Keep track of locked cells (cores)
    const lockedMap: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));
    
    const cores: {x: number, y: number}[] = [];
    
    function isValidCoreLocation(x: number, y: number) {
        for (const core of cores) {
            if (distance(x, y, core.x, core.y) < magic.minDistance) {
                return false;
            }
        }
        return true;
    }

    let seedIndex = 0;
    
    // Store cores with their values
    const allCores: {x: number, y: number, value: number}[] = [];
    
    // Place Peaks (1.0)
    let peaksPlaced = 0;
    while (peaksPlaced < magic.peaksCount && seedIndex < 1000) {
        const x = Math.floor(pseudoRandom(magic.seed, seedIndex++) * width);
        const y = Math.floor(pseudoRandom(magic.seed, seedIndex++) * height);
        
        if (isValidCoreLocation(x, y)) {
            cores.push({x, y});
            allCores.push({x, y, value: 1.0});
            peaksPlaced++;
        }
    }
    
    // Place Valleys (0.0)
    let valleysPlaced = 0;
    while (valleysPlaced < magic.valleysCount && seedIndex < 1000) {
        const x = Math.floor(pseudoRandom(magic.seed, seedIndex++) * width);
        const y = Math.floor(pseudoRandom(magic.seed, seedIndex++) * height);
        
        if (isValidCoreLocation(x, y)) {
            cores.push({x, y});
            allCores.push({x, y, value: 0.0});
            valleysPlaced++;
        }
    }
    
    // Calculate Mana Density using Inverse Distance Weighting (IDW)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumValue = 0;
            let sumWeight = 0;
            let exactCoreValue = -1;
            
            for (const core of allCores) {
                const d = distance(x, y, core.x, core.y);
                if (d < 0.1) {
                    exactCoreValue = core.value;
                    break;
                }
                
                // weight = 1 / distance^2 (power controls how steep the peaks are)
                const weight = 1.0 / Math.pow(d, 2);
                sumValue += core.value * weight;
                sumWeight += weight;
            }
            
            if (exactCoreValue !== -1) {
                manaMap[y][x] = exactCoreValue;
            } else if (sumWeight > 0) {
                manaMap[y][x] = sumValue / sumWeight;
            }
        }
    }
    
    return manaMap;
}
