import AssetManager from './assetManager';
import { pseudoRandom } from '../math/random';
import { BiomeType } from '../types';
import { createCanvas, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Scale is 2x for Regional Maps, but we compressed by 5x, so base height should be ~32
const TILE_SIZE = 30;
const BASE_ASSET_HEIGHT = 32;

export async function generateRegionalMaps(payload: any) {
    console.log('Generating Regional Maps (Level 2)...');
    
    const { width, height } = payload.config;
    
    // Find all unique regions in factionMap
    const regions = new Set<number>();
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const r = payload.political.factionMap[y][x];
            if (r !== null) {
                regions.add(r);
            }
        }
    }
    
    // Load Assets via singleton
    const assets = await AssetManager.loadAllAssets();
    const bgImg = assets.bgImg;

    const outDir = path.join(__dirname, '..', '..', 'out');

    for (const regionId of Array.from(regions)) {
        console.log(`Processing Region ${regionId}...`);
        
        // Find bounding box
        let minX = width, maxX = 0, minY = height, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (payload.political.factionMap[y][x] === regionId) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        // Add padding
        const padding = 10;
        minX = Math.max(0, minX - padding);
        maxX = Math.min(width - 1, maxX + padding);
        minY = Math.max(0, minY - padding);
        maxY = Math.min(height - 1, maxY + padding);
        
        const regionWidth = maxX - minX + 1;
        const regionHeight = maxY - minY + 1;
        
        // Extract sliced matrices
        const sliceMatrix = (matrix: any[][]) => {
            if (!matrix) return [];
            const sliced = [];
            for (let y = minY; y <= maxY; y++) {
                sliced.push(matrix[y].slice(minX, maxX + 1));
            }
            return sliced;
        };
        
        const localPayload = {
            config: {
                ...payload.config,
                width: regionWidth,
                height: regionHeight,
            },
            offset: { x: minX, y: minY },
            regionId,
            elevation: sliceMatrix(payload.elevation),
            temperature: sliceMatrix(payload.temperature),
            moisture: sliceMatrix(payload.moisture),
            biomes: sliceMatrix(payload.biomes),
            rivers: sliceMatrix(payload.rivers),
            lakes: sliceMatrix(payload.lakes),
            magic: sliceMatrix(payload.magic),
            political: {
                factionMap: sliceMatrix(payload.political.factionMap),
                provinceMap: sliceMatrix(payload.political.provinceMap),
                settlementMap: sliceMatrix(payload.political.settlementMap),
                roadMap: sliceMatrix(payload.political.roadMap),
                roadPaths: payload.political.roadPaths,
                factions: payload.political.factions,
                settlements: payload.political.settlements
                    .filter((s: any) => s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY)
                    .map((s: any) => ({
                        ...s,
                        localX: s.x - minX,
                        localY: s.y - minY,
                        parentLocalId: s.parentId ? { localX: s.parentId.x - minX, localY: s.parentId.y - minY } : undefined
                    }))
            }
        };
        
        // Render Image
        const canvasWidth = regionWidth * TILE_SIZE;
        const canvasHeight = regionHeight * TILE_SIZE;
        
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        if (bgImg) {
            const scale = localPayload.config.render.backgroundScale;
            const offCanvas = createCanvas(Math.max(1, bgImg.width * scale), Math.max(1, bgImg.height * scale));
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(bgImg, 0, 0, bgImg.width * scale, bgImg.height * scale);
            
            const pattern = ctx.createPattern(offCanvas, 'repeat');
            if (pattern) {
                // Shift pattern based on offset so it aligns continuously? 
                // Pattern origin is always 0,0, but it's okay for parchment.
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        } else {
            ctx.fillStyle = '#e8d5a1';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        const DEBUG_BIOME_COLORS = false; // Set to true to debug biome generation compression
        
        // Water and Biomes
        if (DEBUG_BIOME_COLORS) {
            const BIOME_COLORS: {[key: string]: string} = {
                OCEAN: '#1C2E4A', BEACH: '#E6D2B5', CLIFF: '#5C5346', SCORCHED: '#555555',
                BARE: '#888888', TUNDRA: '#C5D0D9', SNOW: '#FFFFFF', TAIGA: '#99AA77',
                SHRUBLAND: '#889977', GRASSLAND: '#88AA55', TEMPERATE_DESERT: '#C9D29B',
                TEMPERATE_DECIDUOUS_FOREST: '#679459', TEMPERATE_RAIN_FOREST: '#448855',
                SUBTROPICAL_DESERT: '#D2B98B', TROPICAL_SEASONAL_FOREST: '#559944',
                TROPICAL_RAIN_FOREST: '#337755', SWAMP: '#2f4f4f'
            };
            
            for (let y = 0; y < regionHeight; y++) {
                for (let x = 0; x < regionWidth; x++) {
                    const biome = localPayload.biomes[y][x];
                    if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel || localPayload.lakes[y][x]) {
                        ctx.fillStyle = BIOME_COLORS.OCEAN;
                    } else {
                        ctx.fillStyle = BIOME_COLORS[biome] || '#ff00ff';
                    }
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        } else {
            ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
            for (let y = 0; y < regionHeight; y++) {
                for (let x = 0; x < regionWidth; x++) {
                    if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel || localPayload.lakes[y][x]) {
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
        
        // Asset Scattering
        const envQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
        const cityQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
        
        // We must re-calculate seedIndex to match global exactly to prevent layout shifts!
        // The global seedIndex advances linearly over the whole map.
        // It's very hard to reproduce exact seedIndex for arbitrary (x,y) if the global loop does `for y { for x { ... } }`.
        // To be safe, we will just use a consistent hash of (x,y) for scattering instead of a running seedIndex!
        // Wait, mapRenderer uses a running seedIndex. If we just render regional, assets might be different.
        // For now, let's use a local running seedIndex, meaning the assets will randomize differently. 
        // This is a known issue but acceptable for a prototype (the region looks different than global, but better).
        // Let's use a seeded pseudoRandom based on global (global_x * 10000 + global_y) to be consistent!
        
        const hashSeed = (gx: number, gy: number, extra: number) => {
            return payload.config.political.seed + gx * 1000 + gy * 10 + extra;
        };

        for (let y = 0; y < regionHeight; y++) {
            for (let x = 0; x < regionWidth; x++) {
                const gx = x + minX;
                const gy = y + minY;
                
                if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel && !localPayload.lakes[y][x]) continue;
                if (localPayload.political.settlementMap[y][x]) continue;
                if (localPayload.political.roadMap[y][x]) continue;
                
                const biome = localPayload.biomes[y][x];
                let targetAssetList: Image[] | null = null;
                let density = 0;
                let sizeMult = 1.0;
                
                if (biome === BiomeType.SNOW) { targetAssetList = assets.snow.length > 0 ? assets.snow : assets.mounts; density = 1.2; }
                else if (biome === BiomeType.TUNDRA) { targetAssetList = assets.tundra.length > 0 ? assets.tundra : assets.pines; density = 1.8; sizeMult = 1.1; }
                else if (biome === BiomeType.TAIGA) { targetAssetList = assets.pines; density = 2.4; sizeMult = 1.1; }
                else if (biome === BiomeType.BARE) { targetAssetList = assets.bare_rocks.length > 0 ? assets.bare_rocks : assets.mounts; density = 1.2; sizeMult = 1.2; }
                else if (biome === BiomeType.CLIFF) { targetAssetList = assets.cliffs.length > 0 ? assets.cliffs : assets.mounts; density = 1.5; sizeMult = 1.2; }
                else if (biome === BiomeType.TEMPERATE_DECIDUOUS_FOREST || biome === BiomeType.TEMPERATE_RAIN_FOREST) { targetAssetList = assets.trees; density = 2.4; sizeMult = 1.1; }
                else if (biome === BiomeType.TROPICAL_SEASONAL_FOREST) { targetAssetList = assets.tropical_season_forest.length > 0 ? assets.tropical_season_forest : assets.trees; density = 2.4; sizeMult = 1.1; }
                else if (biome === BiomeType.TROPICAL_RAIN_FOREST) { targetAssetList = assets.jungles; density = 2.7; sizeMult = 1.2; }
                else if (biome === BiomeType.SUBTROPICAL_DESERT) { targetAssetList = assets.deserts; density = 0.4; sizeMult = 1.2; }
                else if (biome === BiomeType.TEMPERATE_DESERT) { targetAssetList = assets.cold_desert.length > 0 ? assets.cold_desert : assets.deserts; density = 0.4; sizeMult = 1.2; }
                else if (biome === BiomeType.SCORCHED) { targetAssetList = assets.scorched.length > 0 ? assets.scorched : assets.deserts; density = 0.6; sizeMult = 1.1; }
                else if (biome === BiomeType.BEACH) { targetAssetList = assets.beach.length > 0 ? assets.beach : assets.deserts; density = 0.6; sizeMult = 1.0; }
                else if (biome === BiomeType.SWAMP) { targetAssetList = assets.swamps; density = 0.8; sizeMult = 0.7; }
                else if (biome === BiomeType.GRASSLAND) { targetAssetList = assets.hills; density = 0.4; sizeMult = 0.6; }
                else if (biome === BiomeType.SHRUBLAND) { targetAssetList = assets.shrubland; density = 1.0; sizeMult = 0.9; }
                
                if (targetAssetList && targetAssetList.length > 0) {
                    let assetsToSpawn = Math.floor(density);
                    if (pseudoRandom(hashSeed(gx, gy, 1), 0) < (density - assetsToSpawn)) {
                        assetsToSpawn++;
                    }
                    
                    for (let i = 0; i < assetsToSpawn; i++) {
                        const imgIndex = Math.floor(pseudoRandom(hashSeed(gx, gy, 2 + i), 0) * targetAssetList.length);
                        const img = targetAssetList[imgIndex];
                        
                        // Jitter position so they don't align perfectly to the grid,
                        // but limit to 0.8 to prevent spilling out of the tile and into the ocean.
                        const jitterX = (pseudoRandom(hashSeed(gx, gy, 3 + i), 0) - 0.5) * TILE_SIZE * 0.8;
                        const jitterY = (pseudoRandom(hashSeed(gx, gy, 4 + i), 0) - 0.5) * TILE_SIZE * 0.8;
                        
                        const drawH = BASE_ASSET_HEIGHT * sizeMult;
                        const drawW = (img.width / img.height) * drawH;
                        
                        const drawX = x * TILE_SIZE + jitterX - drawW/2 + TILE_SIZE/2;
                        const drawY = y * TILE_SIZE + jitterY - drawH + TILE_SIZE/2;
                        
                        envQueue.push({ img, x: drawX, y: drawY, w: drawW, h: drawH });
                    }
                }
            }
        }
        
        // Ocean Assets Scattering (Monsters & Ships)
        const placedMonsters: {x: number, y: number, w: number, h: number}[] = [];
        
        for (let y = 0; y < regionHeight; y++) {
            for (let x = 0; x < regionWidth; x++) {
                const gx = x + minX;
                const gy = y + minY;
                
                const isWater = (localPayload.elevation[y][x] <= localPayload.config.oceanLevel && !localPayload.lakes[y][x]);
                if (!isWater) continue;
                
                // Check that we are far enough from shore (radius 2)
                let nearShore = false;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < regionHeight && nx >= 0 && nx < regionWidth) {
                            if (localPayload.elevation[ny][nx] > localPayload.config.oceanLevel) {
                                nearShore = true;
                            }
                        }
                    }
                }
                
                if (!nearShore && assets.monsters && assets.monsters.length > 0) {
                    // Density for 1-2 monsters per regional map (assume typical water portion of a region -> 0.0025)
                    if (pseudoRandom(hashSeed(gx, gy, 1234), 0) < 0.0025) {
                        const imgIndex = Math.floor(pseudoRandom(hashSeed(gx, gy, 1235), 0) * assets.monsters.length);
                        const img = assets.monsters[imgIndex];
                        
                        const sizeMult = 4.0;
                        const drawH = BASE_ASSET_HEIGHT * sizeMult;
                        const drawW = (img.width / img.height) * drawH;
                        
                        const jitterX = (pseudoRandom(hashSeed(gx, gy, 1236), 0) - 0.5) * TILE_SIZE * 0.8;
                        const jitterY = (pseudoRandom(hashSeed(gx, gy, 1237), 0) - 0.5) * TILE_SIZE * 0.8;
                        
                        const drawX = x * TILE_SIZE - drawW/2 + TILE_SIZE/2 + jitterX;
                        const drawY = y * TILE_SIZE - drawH + TILE_SIZE/2 + jitterY;
                        
                        let intersects = false;
                        for (const pm of placedMonsters) {
                            const padding = 20; // minimum distance between monsters
                            if (drawX < pm.x + pm.w + padding &&
                                drawX + drawW > pm.x - padding &&
                                drawY < pm.y + pm.h + padding &&
                                drawY + drawH > pm.y - padding) {
                                intersects = true;
                                break;
                            }
                        }
                        
                        if (!intersects) {
                            placedMonsters.push({x: drawX, y: drawY, w: drawW, h: drawH});
                            envQueue.push({ img, x: drawX, y: drawY, w: drawW, h: drawH });
                        }
                    }
                }
            }
        }
        
        envQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
        for (const item of envQueue) {
            ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
        }
        
        // Roads (drawn using actual path points for winding roads)
        if (localPayload.political.roadPaths) {
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8;
            
            ctx.beginPath();
            for (const path of localPayload.political.roadPaths) {
                if (!path || path.length === 0) continue;
                
                // Only draw the path if at least one point is inside our bounding box,
                // or just let Canvas clip it (Canvas clipping is very fast).
                // But we need to convert global (compressed) x, y to local.
                let first = true;
                for (const p of path) {
                    const localX = p.x - minX;
                    const localY = p.y - minY;
                    const cx = localX * TILE_SIZE + TILE_SIZE / 2;
                    const cy = localY * TILE_SIZE + TILE_SIZE / 2;
                    
                    if (first) {
                        ctx.moveTo(cx, cy);
                        first = false;
                    } else {
                        ctx.lineTo(cx, cy);
                    }
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // Add Settlements to cityQueue
        if (localPayload.political.settlements) {
            for (const s of localPayload.political.settlements) {
                if (s.type === 'village') continue; // Do not render villages on regional map (wait for province map)
                
                let targetAssetList: Image[] | null = null;
                let sizeMult = 1.0;
                
                if (s.type === 'capital') { targetAssetList = assets.capitals; sizeMult = 1.8; }
                else if (s.type === 'city') { targetAssetList = assets.cities; sizeMult = 1.2; }
                else if (s.type === 'village') { targetAssetList = assets.villages; sizeMult = 0.7; }
                
                if (targetAssetList && targetAssetList.length > 0) {
                    // Seed consistently
                    const imgIndex = Math.floor(pseudoRandom(s.x * 1000 + s.y, 0) * targetAssetList.length);
                    const img = targetAssetList[imgIndex];
                    
                    const drawH = BASE_ASSET_HEIGHT * sizeMult;
                    const drawW = (img.width / img.height) * drawH;
                    
                    const drawX = s.localX * TILE_SIZE - drawW/2 + TILE_SIZE/2;
                    const drawY = s.localY * TILE_SIZE - drawH + TILE_SIZE/2;
                    
                    cityQueue.push({ img, x: drawX, y: drawY, w: drawW, h: drawH });
                }
            }
        }
        
        cityQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
        for (const item of cityQueue) {
            ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
        }
        
        // Save Image
        const outImgPath = path.join(outDir, `region_${regionId}.jpg`);
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        fs.writeFileSync(outImgPath, buffer);
        
        // Save JSON
        const outDataPath = path.join(outDir, `region_${regionId}_data.js`);
        const scriptContent = `const regionData = ${JSON.stringify(localPayload, null, 2)};`;
        fs.writeFileSync(outDataPath, scriptContent, 'utf-8');
    }
    
    console.log('Finished generating Regional Maps.');
}
