import { MapGenerationConfig } from '../types';
import { PerlinNoise } from '../math/perlin';

export function generateMoistureMap(config: MapGenerationConfig, elevationMap: number[][]): number[][] {
    const { width, height, moisture, oceanLevel } = config;
    const perlin = new PerlinNoise(moisture.seed);
    
    const moistureMap: number[][] = [];

    // Step 1: Base ambient moisture using Perlin Noise
    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            // Base moisture
            let val = perlin.fbm(
                x, 
                y, 
                moisture.octaves, 
                moisture.persistence, 
                moisture.lacunarity, 
                moisture.scale
            );
            
            // Water naturally has max moisture
            if (elevationMap[y][x] <= oceanLevel) {
                val = 1.0;
            }
            
            row.push(val * 0.5); // Base noise only contributes 50% max, the rest is from wind
        }
        moistureMap.push(row);
    }

    // Step 2: Rain Shadow Simulation (Wind blowing from West to East)
    // We do a simple directional sweep.
    // If windDirection is (1, 0), we sweep left to right.
    const wx = Math.sign(moisture.windDirection.x);
    // For simplicity in this demo, we assume wind is purely horizontal (wx = 1 or -1).
    
    if (wx !== 0) {
        for (let y = 0; y < height; y++) {
            let airMoisture = 0.5; // Start with some moisture
            
            const startX = wx > 0 ? 0 : width - 1;
            const endX = wx > 0 ? width : -1;
            
            for (let x = startX; x !== endX; x += wx) {
                const elev = elevationMap[y][x];
                
                if (elev <= oceanLevel) {
                    // Over ocean: Air picks up moisture
                    airMoisture += 0.1;
                } else {
                    // Over land: Air drops moisture depending on elevation change
                    const prevX = x - wx;
                    const prevElev = prevX >= 0 && prevX < width ? elevationMap[y][prevX] : oceanLevel;
                    
                    const elevDiff = elev - prevElev;
                    let rainDemand = 0;
                    
                    if (elevDiff > 0) {
                        // Hitting a slope (Orographic lift). Drops heavy rain.
                        rainDemand = elevDiff * 5.0; 
                    } else {
                        // Flat land or going downhill. Drops base rain.
                        rainDemand = 0.02;
                    }
                    
                    // The actual rain dropped cannot exceed what the air holds
                    const actualRain = Math.min(airMoisture, rainDemand);
                    
                    // Subtract rain from air capacity
                    airMoisture -= actualRain;
                    
                    // Add rain to the land's moisture map
                    moistureMap[y][x] += actualRain * 1.5; // Multiplier for visual effect
                }
                
                // Cap air moisture
                airMoisture = Math.max(0, Math.min(1.0, airMoisture));
                
                // Cap land moisture
                moistureMap[y][x] = Math.max(0, Math.min(1.0, moistureMap[y][x]));
            }
        }
    }

    return moistureMap;
}
