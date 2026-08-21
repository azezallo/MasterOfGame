import { MapGenerationConfig } from '../types';
import { PerlinNoise } from '../math/perlin';

export function generateHeightmap(config: MapGenerationConfig) {
    const { width, height, elevation, islandMask } = config;
    const perlin = new PerlinNoise(elevation.seed);
    
    const mapData: number[][] = [];

    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            // Get height value using FBM
            let val = perlin.fbm(
                x, 
                y, 
                elevation.octaves, 
                elevation.persistence, 
                elevation.lacunarity, 
                elevation.scale
            );
            
            // Apply island mask if enabled (forces edges to be 0)
            if (islandMask) {
                // Normalized coordinates from -1 to 1
                const nx = (x / width) * 2 - 1;
                const ny = (y / height) * 2 - 1;
                
                // Calculate distance from center (0 at center, 1 at edges)
                const distance = Math.sqrt(nx * nx + ny * ny);
                
                // Subtract a penalty based on distance to lower the terrain at the edges
                const penalty = Math.pow(distance, 3); // Adjust exponent for different cliff shapes
                
                val = Math.max(0, val - penalty);
            }
            
            row.push(val);
        }
        mapData.push(row);
    }
    
    return mapData;
}
