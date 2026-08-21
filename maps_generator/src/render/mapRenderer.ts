import { createCanvas, loadImage, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import AssetManager from './assetManager';

// Change scale: 1 grid unit = 15 pixels in the final image
const TILE_SIZE = 15;
const BASE_ASSET_HEIGHT = 25;

// Random helper
function pseudoRandom(seed: number, index: number): number {
    const s = Math.sin(seed + index * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

export async function renderMapToImage(mapData: any) {
    console.log('Starting high-res map rendering...');
    const width = mapData.config.width;
    const height = mapData.config.height;
    
    const canvasWidth = width * TILE_SIZE;
    const canvasHeight = height * TILE_SIZE;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Load Assets via singleton
    const assets = await AssetManager.loadAllAssets();
    
    // 1. Draw Background
    try {
        if (assets.bgImg) {
            const bgImg = assets.bgImg;
            const scale = mapData.config.render.backgroundScale;
            const offCanvas = createCanvas(Math.max(1, bgImg.width * scale), Math.max(1, bgImg.height * scale));
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(bgImg, 0, 0, bgImg.width * scale, bgImg.height * scale);
            const pattern = ctx.createPattern(offCanvas, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        } else {
            // Fallback
            ctx.fillStyle = '#e8d5a1'; // Parchment color
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    } catch (e) {
        console.log("Error drawing map_bg.jpg, using solid color.");
        ctx.fillStyle = '#e8d5a1';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // 3. Draw Water Base with Bilinear Smoothing
    const waterCanvas = createCanvas(canvasWidth, canvasHeight);
    const waterCtx = waterCanvas.getContext('2d');
    const imgData = waterCtx.createImageData(canvasWidth, canvasHeight);
    const data = imgData.data;
    
    for (let py = 0; py < canvasHeight; py++) {
        for (let px = 0; px < canvasWidth; px++) {
            // Shift coordinates by -0.5 so grid points are in the center of the TILE_SIZE block
            const cx = px / TILE_SIZE - 0.5;
            const cy = py / TILE_SIZE - 0.5;
            
            const ix1 = Math.max(0, Math.floor(cx));
            const iy1 = Math.max(0, Math.floor(cy));
            const ix2 = Math.min(ix1 + 1, width - 1);
            const iy2 = Math.min(iy1 + 1, height - 1);
            
            const tx = cx - ix1;
            const ty = cy - iy1;
            
            const e11 = mapData.elevation[iy1][ix1];
            const e21 = mapData.elevation[iy1][ix2];
            const e12 = mapData.elevation[iy2][ix1];
            const e22 = mapData.elevation[iy2][ix2];
            
            const elev = e11 * (1 - tx) * (1 - ty) +
                         e21 * tx * (1 - ty) +
                         e12 * (1 - tx) * ty +
                         e22 * tx * ty;
                         
            const l11 = mapData.lakes[iy1][ix1] ? 1 : 0;
            const l21 = mapData.lakes[iy1][ix2] ? 1 : 0;
            const l12 = mapData.lakes[iy2][ix1] ? 1 : 0;
            const l22 = mapData.lakes[iy2][ix2] ? 1 : 0;
            
            const lakeVal = l11 * (1 - tx) * (1 - ty) +
                            l21 * tx * (1 - ty) +
                            l12 * (1 - tx) * ty +
                            l22 * tx * ty;
                            
            if (elev <= mapData.config.oceanLevel || lakeVal > 0.5) {
                const idx = (py * canvasWidth + px) * 4;
                data[idx] = 100;     // R
                data[idx+1] = 150;   // G
                data[idx+2] = 200;   // B
                data[idx+3] = 255;   // Alpha
            }
        }
    }
    waterCtx.putImageData(imgData, 0, 0);
    
    // Draw the water onto main canvas with opacity
    ctx.globalAlpha = 0.4;
    ctx.drawImage(waterCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
    
    // 4. Asset Scattering (Sorted by Y to respect depth)
    // We create a list of objects to draw, then sort them by Y coordinate
    const envQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
    const cityQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
    
    let seedIndex = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mapData.elevation[y][x] <= mapData.config.oceanLevel && !mapData.lakes[y][x]) continue; // Skip ocean
            if (mapData.political && mapData.political.settlementMap && mapData.political.settlementMap[y][x]) continue;
            if (mapData.political && mapData.political.roadMap && mapData.political.roadMap[y][x]) continue;
            
            const biome = mapData.biomes[y][x];
            let targetAssetList: Image[] | null = null;
            let density = 0; // Probability to place an asset here
            let sizeMult = 1.0;
            
            if (biome === 'SNOW') {
                targetAssetList = assets.snow.length > 0 ? assets.snow : assets.mounts;
                density = 0.15;
                sizeMult = 1.0;
            } else if (biome === 'TUNDRA') {
                targetAssetList = assets.tundra.length > 0 ? assets.tundra : assets.pines;
                density = 0.25;
                sizeMult = 1.1;
            } else if (biome === 'TAIGA') {
                targetAssetList = assets.pines;
                density = 0.35;
                sizeMult = 1.1;
            } else if (biome === 'BARE') {
                targetAssetList = assets.bare_rocks.length > 0 ? assets.bare_rocks : assets.mounts;
                density = 0.15;
                sizeMult = 1.2;
            } else if (biome === 'CLIFF') {
                targetAssetList = assets.cliffs.length > 0 ? assets.cliffs : assets.mounts;
                density = 0.2;
                sizeMult = 1.2;
            } else if (biome === 'TEMPERATE_DECIDUOUS_FOREST' || biome === 'TEMPERATE_RAIN_FOREST') {
                targetAssetList = assets.trees;
                density = 0.35;
                sizeMult = 1.1;
            } else if (biome === 'TROPICAL_SEASONAL_FOREST') {
                targetAssetList = assets.tropical_season_forest.length > 0 ? assets.tropical_season_forest : assets.trees;
                density = 0.35;
                sizeMult = 1.1;
            } else if (biome === 'TROPICAL_RAIN_FOREST') {
                targetAssetList = assets.jungles;
                density = 0.4;
                sizeMult = 1.2;
            } else if (biome === 'SUBTROPICAL_DESERT') {
                targetAssetList = assets.deserts;
                density = 0.05;
                sizeMult = 0.9;
            } else if (biome === 'TEMPERATE_DESERT') {
                targetAssetList = assets.cold_desert.length > 0 ? assets.cold_desert : assets.deserts;
                density = 0.05;
                sizeMult = 0.9;
            } else if (biome === 'SCORCHED') {
                targetAssetList = assets.scorched.length > 0 ? assets.scorched : assets.deserts;
                density = 0.1;
                sizeMult = 1.0;
            } else if (biome === 'BEACH') {
                targetAssetList = assets.beach.length > 0 ? assets.beach : assets.deserts;
                density = 0.1;
                sizeMult = 0.9;
            } else if (biome === 'SWAMP') { 
                targetAssetList = assets.swamps;
                density = 0.1;
                sizeMult = 0.7;
            } else if (biome === 'GRASSLAND') {
                targetAssetList = assets.hills;
                density = 0.04;
                sizeMult = 0.6;
            } else if (biome === 'SHRUBLAND') {
                targetAssetList = assets.shrubland;
                density = 0.15;
                sizeMult = 1.1;
            }
            
            if (targetAssetList && targetAssetList.length > 0) {
                // Determine if we place an asset here based on pseudo-random density
                // Multiplied by 4.0 for the global map because smaller icons make it look empty
                if (pseudoRandom(mapData.config.political.seed, seedIndex++) < (density * 4.0)) {
                    const imgIndex = Math.floor(pseudoRandom(mapData.config.political.seed, seedIndex++) * targetAssetList.length);
                    const img = targetAssetList[imgIndex];
                    
                    // Jitter position so they don't align perfectly to the grid
                    // limit to 0.8 to prevent spilling into water
                    const jitterX = (pseudoRandom(mapData.config.political.seed, seedIndex++) - 0.5) * TILE_SIZE * 0.8;
                    const jitterY = (pseudoRandom(mapData.config.political.seed, seedIndex++) - 0.5) * TILE_SIZE * 0.8;
                    
                    // Use a base height instead of width to prevent tall assets from becoming massive
                    const drawH = BASE_ASSET_HEIGHT * sizeMult;
                    const drawW = (img.width / img.height) * drawH;
                    
                    const drawX = x * TILE_SIZE + jitterX - drawW/2 + TILE_SIZE/2;
                    const drawY = y * TILE_SIZE + jitterY - drawH + TILE_SIZE/2;
                    
                    envQueue.push({
                        img, 
                        x: drawX, 
                        y: drawY, 
                        w: drawW, 
                        h: drawH
                    });
                }
            }
        }
    }
    
    // 4.5. Ocean Assets Scattering
    let monsterSeedIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isWater = (mapData.elevation[y][x] <= mapData.config.oceanLevel && !mapData.lakes[y][x]);
            if (!isWater) continue;
            
            // Check that we are far enough from shore (radius 2)
            let nearShore = false;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        if (mapData.elevation[ny][nx] > mapData.config.oceanLevel) {
                            nearShore = true;
                        }
                    } else {
                        nearShore = true;
                    }
                }
            }
            
            // Keep away from the wind rose in the top right corner
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const canvasWidth = width * TILE_SIZE;
            const expectedWrSize = Math.min(150, Math.max(50, canvasWidth * 0.15));
            const exclusionZone = expectedWrSize * 1.5; // Give it a little buffer
            if (px > canvasWidth - exclusionZone && py < exclusionZone) {
                nearShore = true; // Act as if it's near shore to prevent monster spawn
            }
            
            if (!nearShore && assets.monsters && assets.monsters.length > 0) {
                // Determine if we place an asset here
                if (pseudoRandom(mapData.config.political.seed + 1234, monsterSeedIndex++) < 0.005) {
                    const imgIndex = Math.floor(pseudoRandom(mapData.config.political.seed + 1234, monsterSeedIndex++) * assets.monsters.length);
                    const img = assets.monsters[imgIndex];
                    
                    const baseMonsterScale = 2.0;
                    // Scale down monsters on very small maps (if canvas < 1000px, gradually shrink to 1.0)
                    const sizeMult = Math.max(1.0, Math.min(baseMonsterScale, baseMonsterScale * (canvasWidth / 1000)));
                    const drawH = BASE_ASSET_HEIGHT * sizeMult;
                    const drawW = (img.width / img.height) * drawH;
                    
                    const offsetX = (pseudoRandom(mapData.config.political.seed + 1234, monsterSeedIndex++) - 0.5) * TILE_SIZE * 0.8;
                    const offsetY = (pseudoRandom(mapData.config.political.seed + 1234, monsterSeedIndex++) - 0.5) * TILE_SIZE * 0.8;
                    
                    const drawX = x * TILE_SIZE - drawW/2 + TILE_SIZE/2 + offsetX;
                    const drawY = y * TILE_SIZE - drawH + TILE_SIZE/2 + offsetY;
                    
                    envQueue.push({
                        img, 
                        x: drawX, 
                        y: drawY, 
                        w: drawW, 
                        h: drawH
                    });
                }
            }
        }
    }
    
    // Sort environment by Y coordinate for correct depth overlapping
    envQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    
    console.log(`Drawing ${envQueue.length} scattered environment assets...`);
    for (const item of envQueue) {
        ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
    }
    
    // Draw Roads directly to ctx AFTER scattered environment objects so they appear on top of trees
    if (mapData.political && mapData.political.roadMap) {
        ctx.strokeStyle = '#5c3a21'; // Brown dirt road
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mapData.political.roadMap[y][x]) {
                    const cx1 = x * TILE_SIZE + TILE_SIZE / 2;
                    const cy1 = y * TILE_SIZE + TILE_SIZE / 2;
                    
                    // Right
                    if (x < width - 1 && mapData.political.roadMap[y][x+1]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo(cx1 + TILE_SIZE, cy1);
                    }
                    // Down
                    if (y < height - 1 && mapData.political.roadMap[y+1][x]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo(cx1, cy1 + TILE_SIZE);
                    }
                    // Down-Right
                    if (x < width - 1 && y < height - 1 && mapData.political.roadMap[y+1][x+1]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo(cx1 + TILE_SIZE, cy1 + TILE_SIZE);
                    }
                    // Down-Left
                    if (x > 0 && y < height - 1 && mapData.political.roadMap[y+1][x-1]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo(cx1 - TILE_SIZE, cy1 + TILE_SIZE);
                    }
                }
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
    
    // Add Settlements to cityQueue
    if (mapData.political && mapData.political.settlements) {
        for (const s of mapData.political.settlements) {
            if (s.type === 'village') continue; // Do not render villages on global map
            
            let targetAssetList: Image[] | null = null;
            let sizeMult = 1.0;
            
            if (s.type === 'capital') {
                targetAssetList = assets.capitals;
                sizeMult = 1.8; // Larger than trees
            } else if (s.type === 'city') {
                targetAssetList = assets.cities;
                sizeMult = 1.2;
            }
            
            if (targetAssetList && targetAssetList.length > 0) {
                const imgIndex = Math.floor(pseudoRandom(mapData.config.political.seed, seedIndex++) * targetAssetList.length);
                const img = targetAssetList[imgIndex];

                const drawH = BASE_ASSET_HEIGHT * sizeMult;
                const drawW = (img.width / img.height) * drawH;
                
                const drawX = s.x * TILE_SIZE - drawW/2 + TILE_SIZE/2;
                const drawY = s.y * TILE_SIZE - drawH + TILE_SIZE/2; // Center base on tile
                
                cityQueue.push({
                    img, 
                    x: drawX, 
                    y: drawY, 
                    w: drawW, 
                    h: drawH
                });
            }
        }
    }
    
    // Sort cities by Y coordinate and draw them ON TOP of everything
    cityQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    
    console.log(`Drawing ${cityQueue.length} cities...`);
    for (const item of cityQueue) {
        ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
    }
    
    // Draw Wind Rose
    if (assets.wind_rose && assets.wind_rose.length > 0) {
        const imgIndex = Math.floor(pseudoRandom(mapData.config.political.seed, 9999) * assets.wind_rose.length);
        const windRoseImg = assets.wind_rose[imgIndex];
        
        // Dynamically scale the wind rose to a maximum of 150px or 15% of the canvas width
        const wrSize = Math.min(150, Math.max(50, canvasWidth * 0.15)); 
        
        // Draw in top right corner
        const padding = Math.min(20, canvasWidth * 0.05);
        const wrX = canvasWidth - wrSize - padding;
        const wrY = padding;
        ctx.drawImage(windRoseImg, wrX, wrY, wrSize, wrSize);
    }
    
    // 5. Save to file
    const outDir = path.join(__dirname, '..', '..', 'out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    const outPath = path.join(outDir, 'rendered_map.jpg'); // Saving as JPG
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    fs.writeFileSync(outPath, buffer);
    console.log(`Successfully exported rendered map to ${outPath}`);
}
