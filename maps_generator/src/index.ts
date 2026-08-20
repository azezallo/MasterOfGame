import { PerlinNoise } from './math/perlin';
import { MapConfig, MapGenerationConfig } from './config';
import { generateTemperatureMap } from './layers/temperature';
import { generateMoistureMap } from './layers/moisture';
import { generateBiomeMap } from './layers/biomes';
import { generateRivers, applyRiverMoisture } from './layers/hydrology';
import { generateMagicMap } from './layers/magic';
import { generatePoliticalMap } from './layers/political';
import { renderMapToImage } from './render/mapRenderer';
import { generateRegionalMaps } from './render/regionalRenderer';
import * as fs from 'fs';
import * as path from 'path';

function generateHeightmap(config: MapGenerationConfig) {
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

function exportData(payload: any) {
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    const outPath = path.join(outDir, 'map_data.js');
    
    const scriptContent = `const mapData = ${JSON.stringify(payload, null, 2)};`;
    
    fs.writeFileSync(outPath, scriptContent, 'utf-8');
    console.log(`Successfully exported map data to ${outPath}`);
}

async function main() {
    console.log('Generating elevation map...');
    const heightmap = generateHeightmap(MapConfig);
    
    console.log('Generating temperature map...');
    const tempMap = generateTemperatureMap(MapConfig, heightmap);
    
    console.log('Generating moisture map...');
    const moistureMap = generateMoistureMap(MapConfig, heightmap);
    
    console.log('Generating rivers...');
    const { riverMap, lakesMap } = generateRivers(MapConfig, heightmap);
    
    console.log('Applying river moisture...');
    applyRiverMoisture(MapConfig, moistureMap, riverMap, lakesMap);
    
    console.log('Generating biome map...');
    const biomeMap = generateBiomeMap(MapConfig, heightmap, tempMap, moistureMap);
    
    console.log('Generating magic map...');
    const manaMap = generateMagicMap(MapConfig);
    
    console.log('Generating political map...');
    const politicalMap = generatePoliticalMap(MapConfig, heightmap);
    
    const payload = {
        config: MapConfig,
        elevation: heightmap,
        temperature: tempMap,
        moisture: moistureMap,
        biomes: biomeMap,
        rivers: riverMap,
        lakes: lakesMap,
        magic: manaMap,
        political: politicalMap
    };
    
    exportData(payload);
    
    console.log('Rendering static map background...');
    await renderMapToImage(payload);
    
    await generateRegionalMaps(payload);
}

main().catch(console.error);
