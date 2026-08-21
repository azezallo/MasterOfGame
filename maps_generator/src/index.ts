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
    
    console.log('Generating Province Maps (Level 3) from uncompressed data...');
    await generateProvinceMaps(payload);
    
    console.log('Rendering static map background for Global Map...');
    await renderMapToImage(compressedPayload);
}

main().catch(console.error);
