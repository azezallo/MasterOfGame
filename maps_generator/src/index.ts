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

function compressPayload(payload: any, factor: number) {
    const origWidth = payload.config.width;
    const origHeight = payload.config.height;
    const newWidth = Math.ceil(origWidth / factor);
    const newHeight = Math.ceil(origHeight / factor);

    const newElevation = Array(newHeight).fill(0).map(() => Array(newWidth).fill(0));
    const newBiomes = Array(newHeight).fill(0).map(() => Array(newWidth).fill('OCEAN'));
    const newFactionMap = Array(newHeight).fill(0).map(() => Array(newWidth).fill(null));
    const newLakes = Array(newHeight).fill(0).map(() => Array(newWidth).fill(false));

    for (let ny = 0; ny < newHeight; ny++) {
        for (let nx = 0; nx < newWidth; nx++) {
            const startX = nx * factor;
            const startY = ny * factor;
            const endX = Math.min(startX + factor, origWidth);
            const endY = Math.min(startY + factor, origHeight);

            let maxElev = 0;
            const biomeCounts = new Map<string, number>();
            const factionCounts = new Map<number, number>();
            let hasLake = false;

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
                    
                    if (payload.lakes[y][x]) hasLake = true;
                }
            }

            newElevation[ny][nx] = maxElev;
            newLakes[ny][nx] = hasLake;

            // Biome logic: Land > Ocean priority
            let bestBiome = 'OCEAN';
            let bestBiomeCount = -1;
            for (const [b, count] of biomeCounts.entries()) {
                if (b === 'OCEAN') continue; // Skip ocean for max finding
                if (count > bestBiomeCount) {
                    bestBiomeCount = count;
                    bestBiome = b;
                }
            }
            if (bestBiomeCount === -1) {
                bestBiome = 'OCEAN'; // Only ocean present
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
        }
    }

    // Filter settlements (only capitals)
    const newSettlements = payload.political.settlements
        .filter((s: any) => s.type === 'capital')
        .map((s: any) => ({
            ...s,
            x: Math.floor(s.x / factor),
            y: Math.floor(s.y / factor)
        }));
        
    // Generate new settlementMap for capitals only
    const newSettlementMap = Array(newHeight).fill(0).map(() => Array(newWidth).fill(null));
    for (const s of newSettlements) {
        if (s.y >= 0 && s.y < newHeight && s.x >= 0 && s.x < newWidth) {
            newSettlementMap[s.y][s.x] = 'capital';
        }
    }

    return {
        config: {
            ...payload.config,
            width: newWidth,
            height: newHeight
        },
        elevation: newElevation,
        biomes: newBiomes,
        lakes: newLakes,
        political: {
            factionMap: newFactionMap,
            settlementMap: newSettlementMap,
            roadMap: null, // No roads on global map
            settlements: newSettlements
        }
    };
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
    
    console.log('Generating Regional Maps (Level 2) from HIGH-RES data...');
    await generateRegionalMaps(payload);
    
    console.log('Compressing Global Map by 10x...');
    const compressedPayload = compressPayload(payload, 10);
    
    exportData(compressedPayload);
    
    console.log('Rendering static map background for Global Map...');
    await renderMapToImage(compressedPayload);
}

main().catch(console.error);
