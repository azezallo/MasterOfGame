import AssetManager from './assetManager';
import { pseudoRandom } from '../math/random';
import { BiomeType } from '../types';
import { createCanvas, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Scale for Province Maps (1 cell = 1 km = 1 tile)
const TILE_SIZE = 40;
const BASE_ASSET_HEIGHT = 42;

export async function generateProvinceMaps(payload: any) {
    console.log('Generating Province Maps (Level 3)...');
    
    const { width, height } = payload.config;
    
    // Find all unique provinces in provinceMap
    const provinces = new Set<number>();
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = payload.political.provinceMap[y][x];
            if (p !== null) {
                provinces.add(p);
            }
        }
    }
    
    // Load Assets via singleton
    const assets = await AssetManager.loadAllAssets();
    const bgImg = assets.bgImg;


    const outDir = path.join(__dirname, '..', '..', 'out');

    for (const provinceId of Array.from(provinces)) {
        console.log(`Processing Province ${provinceId}...`);
        
        // Find bounding box
        let minX = width, maxX = 0, minY = height, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (payload.political.provinceMap[y][x] === provinceId) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        // Add padding (extra space around the province to see surroundings)
        const padding = 15;
        minX = Math.max(0, minX - padding);
        maxX = Math.min(width - 1, maxX + padding);
        minY = Math.max(0, minY - padding);
        maxY = Math.min(height - 1, maxY + padding);
        
        const provinceWidth = maxX - minX + 1;
        const provinceHeight = maxY - minY + 1;
        
        // Extract sliced matrices
        const sliceMatrix = (matrix: any[][]) => {
            if (!matrix) return [];
            const sliced = [];
            for (let y = minY; y <= maxY; y++) {
                sliced.push(matrix[y].slice(minX, maxX + 1));
            }
            return sliced;
        };
        
        // Keep uncompressed data structure but scoped to bounding box
        const localPayload = {
            config: {
                ...payload.config,
                width: provinceWidth,
                height: provinceHeight,
            },
            offset: { x: minX, y: minY },
            provinceId,
            elevation: sliceMatrix(payload.elevation),
            temperature: sliceMatrix(payload.temperature),
            moisture: sliceMatrix(payload.moisture),
            biomes: sliceMatrix(payload.biomes),
            rivers: sliceMatrix(payload.rivers),
            riverPaths: payload.riverPaths,
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
        const canvasWidth = provinceWidth * TILE_SIZE;
        const canvasHeight = provinceHeight * TILE_SIZE;
        
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        if (bgImg) {
            const scale = localPayload.config.render.backgroundScale;
            const offCanvas = createCanvas(Math.max(1, bgImg.width * scale), Math.max(1, bgImg.height * scale));
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(bgImg, 0, 0, bgImg.width * scale, bgImg.height * scale);
            
            const pattern = ctx.createPattern(offCanvas, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        } else {
            ctx.fillStyle = '#e8d5a1';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        // Water and Biomes
        ctx.fillStyle = 'rgba(100, 150, 200, 0.4)'; // Ocean color
        const riverColor = 'rgba(74, 163, 255, 0.7)'; // River color

        for (let y = 0; y < provinceHeight; y++) {
            for (let x = 0; x < provinceWidth; x++) {
                // Ocean / Lakes
                if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel || localPayload.lakes[y][x]) {
                    ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
        
        // Draw Rivers as continuous lines
        if (localPayload.riverPaths) {
            ctx.strokeStyle = riverColor;
            ctx.lineWidth = TILE_SIZE * 0.4; // Make it look like a nice river
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            for (const path of localPayload.riverPaths) {
                if (!path || path.length === 0) continue;
                
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
        }
        
        // Asset Scattering
        const envQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
        const cityQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
        
        const hashSeed = (gx: number, gy: number, extra: number) => {
            return payload.config.political.seed + gx * 1000 + gy * 10 + extra;
        };

        for (let y = 0; y < provinceHeight; y++) {
            for (let x = 0; x < provinceWidth; x++) {
                const gx = x + minX;
                const gy = y + minY;
                
                if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel && !localPayload.lakes[y][x]) continue;
                if (localPayload.political.settlementMap[y][x]) continue;
                if (localPayload.political.roadMap[y][x]) continue;
                if (localPayload.rivers && localPayload.rivers[y][x]) continue; // No trees in rivers
                
                const biome = localPayload.biomes[y][x];
                let targetAssetList: Image[] | null = null;
                let density = 0;
                let sizeMult = 1.0;
                
                if (biome === BiomeType.SNOW) { targetAssetList = assets.snow.length > 0 ? assets.snow : assets.mounts; density = 0.5; }
                else if (biome === BiomeType.TUNDRA) { targetAssetList = assets.tundra.length > 0 ? assets.tundra : assets.pines; density = 0.8; sizeMult = 1.1; }
                else if (biome === BiomeType.TAIGA) { targetAssetList = assets.pines; density = 1.0; sizeMult = 1.1; }
                else if (biome === BiomeType.BARE) { targetAssetList = assets.bare_rocks.length > 0 ? assets.bare_rocks : assets.mounts; density = 0.5; sizeMult = 1.2; }
                else if (biome === BiomeType.CLIFF) { targetAssetList = assets.cliffs.length > 0 ? assets.cliffs : assets.mounts; density = 0.7; sizeMult = 1.2; }
                else if (biome === BiomeType.TEMPERATE_DECIDUOUS_FOREST || biome === BiomeType.TEMPERATE_RAIN_FOREST) { targetAssetList = assets.trees; density = 1.0; sizeMult = 1.1; }
                else if (biome === BiomeType.TROPICAL_SEASONAL_FOREST) { targetAssetList = assets.tropical_season_forest.length > 0 ? assets.tropical_season_forest : assets.trees; density = 1.0; sizeMult = 1.1; }
                else if (biome === BiomeType.TROPICAL_RAIN_FOREST) { targetAssetList = assets.jungles; density = 1.2; sizeMult = 1.2; }
                else if (biome === BiomeType.SUBTROPICAL_DESERT) { targetAssetList = assets.deserts; density = 0.2; sizeMult = 1.2; }
                else if (biome === BiomeType.TEMPERATE_DESERT) { targetAssetList = assets.cold_desert.length > 0 ? assets.cold_desert : assets.deserts; density = 0.2; sizeMult = 1.2; }
                else if (biome === BiomeType.SCORCHED) { targetAssetList = assets.scorched.length > 0 ? assets.scorched : assets.deserts; density = 0.3; sizeMult = 1.1; }
                else if (biome === BiomeType.BEACH) { targetAssetList = assets.beach.length > 0 ? assets.beach : assets.deserts; density = 0.3; sizeMult = 1.0; }
                else if (biome === BiomeType.SWAMP) { targetAssetList = assets.swamps; density = 0.5; sizeMult = 0.7; }
                else if (biome === BiomeType.GRASSLAND) { targetAssetList = assets.hills; density = 0.2; sizeMult = 0.6; }
                else if (biome === BiomeType.SHRUBLAND) { targetAssetList = assets.shrubland; density = 0.5; sizeMult = 0.9; }
                
                // For province, density is lower per tile because a tile is 1km. 
                // We'll scale density so we don't have millions of trees.
                
                if (targetAssetList && targetAssetList.length > 0) {
                    let assetsToSpawn = Math.floor(density);
                    if (pseudoRandom(hashSeed(gx, gy, 1), 0) < (density - assetsToSpawn)) {
                        assetsToSpawn++;
                    }
                    
                    for (let i = 0; i < assetsToSpawn; i++) {
                        const imgIndex = Math.floor(pseudoRandom(hashSeed(gx, gy, 2 + i), 0) * targetAssetList.length);
                        const img = targetAssetList[imgIndex];
                        
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
        
        envQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
        for (const item of envQueue) {
            ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
        }
        
        // Roads (drawn using actual path points for winding roads)
        if (localPayload.political.roadPaths) {
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8;
            
            ctx.beginPath();
            for (const path of localPayload.political.roadPaths) {
                if (!path || path.length === 0) continue;
                
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
        
        // Settlements
        if (localPayload.political.settlements) {
            for (const s of localPayload.political.settlements) {
                let targetAssetList: Image[] | null = null;
                
                // Base dimensions in TILE_SIZE blocks
                let cellW = 1;
                let cellH = 1;
                
                // Because capital is 3x3, its center is root. So it occupies s.x-1 to s.x+1.
                // In local coords, s.localX is the root.
                // It spans 3 tiles width, 3 tiles height.
                
                if (s.type === 'capital') { 
                    targetAssetList = assets.capitals; 
                    cellW = 3; cellH = 3; 
                }
                else if (s.type === 'city') { 
                    targetAssetList = assets.cities; 
                    cellW = 2; cellH = 2; 
                }
                else if (s.type === 'village') { 
                    targetAssetList = assets.villages; 
                    cellW = 1; cellH = 1; 
                }
                
                if (targetAssetList && targetAssetList.length > 0) {
                    const imgIndex = Math.floor(pseudoRandom(s.x * 1000 + s.y, 0) * targetAssetList.length);
                    const img = targetAssetList[imgIndex];
                    
                    // We want the icon to cover the allocated tiles
                    // A city is 2x2. Root is (localX, localY). 
                    // In political.ts, city marks dy=0..1, dx=0..1. 
                    // So its center is localX + 0.5, localY + 0.5.
                    // Capital is dy=-1..1, dx=-1..1. Its center is localX, localY.
                    
                    let cx = s.localX * TILE_SIZE + TILE_SIZE / 2;
                    let cy = s.localY * TILE_SIZE + TILE_SIZE / 2;
                    
                    if (s.type === 'city') {
                        cx += TILE_SIZE / 2; // Shift right by half a tile
                        cy += TILE_SIZE / 2; // Shift down by half a tile
                    }
                    
                    const targetWidth = cellW * TILE_SIZE;
                    const drawH = (img.height / img.width) * targetWidth;
                    const drawW = targetWidth;
                    
                    const drawX = cx - drawW / 2;
                    // Usually assets are drawn with their bottom at the center, but here we want it to cover the tiles
                    // So bottom is cy + cellH*TILE_SIZE/2
                    const drawY = cy + (cellH * TILE_SIZE) / 2 - drawH;
                    
                    cityQueue.push({ img, x: drawX, y: drawY, w: drawW, h: drawH });
                }
            }
        }
        
        cityQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
        for (const item of cityQueue) {
            ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
        }
        
        // Save Image
        const outImgPath = path.join(outDir, `province_${provinceId}.jpg`);
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        fs.writeFileSync(outImgPath, buffer);
        
        // Save JSON
        const outDataPath = path.join(outDir, `province_${provinceId}_data.js`);
        const scriptContent = `const provinceData = ${JSON.stringify(localPayload)};`;
        fs.writeFileSync(outDataPath, scriptContent, 'utf-8');
    }
    
    console.log('Finished generating Province Maps.');
}
