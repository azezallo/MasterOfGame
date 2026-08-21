import { MapConfig } from './config';
import { generateTemperatureMap } from './layers/temperature';
import { generateMoistureMap } from './layers/moisture';
import { generateBiomeMap } from './layers/biomes';
import { generateRivers, applyRiverMoisture } from './layers/hydrology';
import { generateMagicMap } from './layers/magic';
import { generatePoliticalMap } from './layers/political';
import { renderMapToImage } from './render/mapRenderer';
import { generateRegionalMaps } from './render/regionalRenderer';
import { generateProvinceMaps } from './render/provinceRenderer';
import * as fs from 'fs';
import * as path from 'path';

import { generateHeightmap } from './layers/elevation';
import { compressPayload } from './compression';
import { WorldData } from './types';

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
    const { riverMap, lakesMap, riverPaths } = generateRivers(MapConfig, heightmap);
    
    console.log('Applying river moisture...');
    applyRiverMoisture(MapConfig, moistureMap, riverMap, lakesMap);
    
    console.log('Generating biome map...');
    const biomeMap = generateBiomeMap(MapConfig, heightmap, tempMap, moistureMap);
    
    console.log('Generating magic map...');
    const manaMap = generateMagicMap(MapConfig);
    
    console.log('Generating political map...');
    const politicalMap = generatePoliticalMap(MapConfig, heightmap);
    
    const payload: WorldData = {
        config: MapConfig,
        elevation: heightmap,
        temperature: tempMap,
        moisture: moistureMap,
        biomes: biomeMap,
        rivers: riverMap,
        riverPaths: riverPaths,
        lakes: lakesMap,
        magic: manaMap,
        political: politicalMap
    };
    
    // Calculate dynamic compression based on map size
    const minDim = Math.min(MapConfig.width, MapConfig.height);
    const scaleRatio = Math.min(1.0, minDim / 500);
    const globalFactor = Math.round(3 + (10 - 3) * scaleRatio);
    const regionalFactor = Math.round(2 + (5 - 2) * scaleRatio);

    console.log(`Compressing Payload by ${regionalFactor}x for Regional Maps...`);
    const regionalPayload = compressPayload(payload, regionalFactor, true); // keepRoadsAndCities = true
    
    console.log(`Generating Regional Maps (Level 2) from ${regionalFactor}x compressed data...`);
    await generateRegionalMaps(regionalPayload);
    
    console.log(`Compressing Global Map by ${globalFactor}x...`);
    const compressedPayload = compressPayload(payload, globalFactor, false); // Global map, no roads/cities
    
    // Export UNCOMPRESSED original data as source of truth
    exportData(payload, 'map_data.js');
    
    // Export COMPRESSED data for the global SVG viewer
    exportData(compressedPayload, 'global_map_data.js');
    
    console.log('Generating Province Maps (Level 3) from uncompressed data...');
    await generateProvinceMaps(payload);
    
    console.log('Rendering static map background for Global Map...');
    await renderMapToImage(compressedPayload);
}

main().catch(console.error);
