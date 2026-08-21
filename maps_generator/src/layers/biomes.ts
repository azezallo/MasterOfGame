import { MapGenerationConfig } from '../types';
import { BiomeType } from '../types';

export function getBiome(config: MapGenerationConfig, elevation: number, temperature: number, moisture: number, slope: number): BiomeType {
    if (elevation < config.oceanLevel) return BiomeType.OCEAN;
    
    // Coastline logic
    if (elevation < config.oceanLevel + 0.03) {
        // If the slope is steep near the water, it's a rocky cliff, not a sandy beach
        if (slope > 0.015) {
            return BiomeType.CLIFF;
        }
        return BiomeType.BEACH;
    }

    // Adjust these thresholds to tweak biome distribution
    
    // Very Cold
    if (temperature < 0.25) {
        if (moisture < 0.16) return BiomeType.BARE;
        if (moisture < 0.50) return BiomeType.TUNDRA;
        return BiomeType.SNOW;
    }
    
    // Cold
    if (temperature < 0.50) {
        if (moisture < 0.33) return BiomeType.SHRUBLAND;
        return BiomeType.TAIGA;
    }
    
    // Temperate (Medium)
    if (temperature < 0.75) {
        if (moisture < 0.16) return BiomeType.TEMPERATE_DESERT;
        if (moisture < 0.50) return BiomeType.GRASSLAND;
        if (moisture < 0.83) return BiomeType.TEMPERATE_DECIDUOUS_FOREST;
        return BiomeType.TEMPERATE_RAIN_FOREST;
    }
    
    // Hot (Subtropical/Tropical)
    if (moisture < 0.16) return BiomeType.SCORCHED;
    if (moisture < 0.33) return BiomeType.SUBTROPICAL_DESERT;
    if (moisture < 0.66) return BiomeType.TROPICAL_SEASONAL_FOREST;
    return BiomeType.TROPICAL_RAIN_FOREST;
}

export function generateBiomeMap(config: MapGenerationConfig, elevationMap: number[][], tempMap: number[][], moistureMap: number[][]): BiomeType[][] {
    const biomeMap: BiomeType[][] = [];
    
    for (let y = 0; y < config.height; y++) {
        const row: BiomeType[] = [];
        for (let x = 0; x < config.width; x++) {
            
            // Calculate slope (max elevation difference with adjacent tiles)
            let maxSlope = 0;
            const currentElev = elevationMap[y][x];
            
            if (x > 0) maxSlope = Math.max(maxSlope, Math.abs(currentElev - elevationMap[y][x - 1]));
            if (x < config.width - 1) maxSlope = Math.max(maxSlope, Math.abs(currentElev - elevationMap[y][x + 1]));
            if (y > 0) maxSlope = Math.max(maxSlope, Math.abs(currentElev - elevationMap[y - 1][x]));
            if (y < config.height - 1) maxSlope = Math.max(maxSlope, Math.abs(currentElev - elevationMap[y + 1][x]));

            row.push(getBiome(config, currentElev, tempMap[y][x], moistureMap[y][x], maxSlope));
        }
        biomeMap.push(row);
    }
    
    return biomeMap;
}
