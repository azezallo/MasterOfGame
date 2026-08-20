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

function compressPayload(payload: any, factor: number, keepRoadsAndCities: boolean = false) {
    const origWidth = payload.config.width;
    const origHeight = payload.config.height;
    const newWidth = Math.ceil(origWidth / factor);
    const newHeight = Math.ceil(origHeight / factor);

    const newElevation = Array(newHeight).fill(0).map(() => Array(newWidth).fill(0));
    const newBiomes = Array(newHeight).fill(0).map(() => Array(newWidth).fill('OCEAN'));
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
            const biomeCounts = new Map<string, number>();
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
                            const pKey = typeof pId === 'object' ? JSON.stringify(pId) : pId;
                            provinceCounts.set(pKey, (provinceCounts.get(pKey) || 0) + 1);
                        }
                    }
                    
                    if (payload.lakes[y][x]) hasLake = true;
                    if (keepRoadsAndCities && payload.political.roadMap && payload.political.roadMap[y][x]) hasRoad = true;
                }
            }

            newElevation[ny][nx] = maxElev;
            newLakes[ny][nx] = hasLake;
            if (keepRoadsAndCities) newRoadMap![ny][nx] = hasRoad;

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
            
            // Province logic
            if (keepRoadsAndCities) {
                let bestProvince = null;
                let bestProvCount = -1;
                for (const [pKey, count] of provinceCounts.entries()) {
                    if (count > bestProvCount) {
                        bestProvCount = count;
                        bestProvince = pKey;
                    }
                }
                newProvinceMap![ny][nx] = bestProvince ? JSON.parse(bestProvince) : null;
            }
        }
    }

    // Filter settlements
    const newSettlements = payload.political.settlements
        .filter((s: any) => keepRoadsAndCities ? (s.type !== 'village') : (s.type === 'capital'))
        .map((s: any) => ({
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
        ? payload.political.roadPaths.map((path: any[]) => 
            path.map(p => ({ x: p.x / factor, y: p.y / factor }))
          )
        : null;

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
        rivers: Array(newHeight).fill(0).map(() => Array(newWidth).fill(null)),
        magic: Array(newHeight).fill(0).map(() => Array(newWidth).fill(0)),
        political: {
            factionMap: newFactionMap,
            provinceMap: newProvinceMap,
            settlementMap: newSettlementMap,
            roadMap: newRoadMap,
            roadPaths: newRoadPaths,
            settlements: newSettlements
        }
    };
}

function exportData(payload: any, filename: string = 'map_data.js') {
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, filename);
    const json = JSON.stringify(payload);
    fs.writeFileSync(outFile, `const mapData = ${json};`);
    console.log(`Successfully exported map data to ${outFile}`);
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
    
    console.log('Compressing Payload by 5x for Regional Maps...');
    const regionalPayload = compressPayload(payload, 5, true); // keepRoadsAndCities = true
    
    console.log('Generating Regional Maps (Level 2) from 5x compressed data...');
    await generateRegionalMaps(regionalPayload);
    
    console.log('Compressing Global Map by 10x...');
    const compressedPayload = compressPayload(payload, 10, false); // Global map, no roads/cities
    
    // Export UNCOMPRESSED original data as source of truth
    exportData(payload, 'map_data.js');
    
    // Export COMPRESSED data for the global SVG viewer
    exportData(compressedPayload, 'global_map_data.js');
    
    console.log('Rendering static map background for Global Map...');
    await renderMapToImage(compressedPayload);
}

main().catch(console.error);
