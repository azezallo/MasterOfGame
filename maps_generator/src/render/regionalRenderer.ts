import { createCanvas, loadImage, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Scale is 2x for Regional Maps
const TILE_SIZE = 30;
const BASE_ASSET_HEIGHT = 130;

async function loadImagesFromDir(dirPath: string): Promise<Image[]> {
    const images: Image[] = [];
    if (!fs.existsSync(dirPath)) return images;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            const imgPath = path.join(dirPath, file);
            try {
                const img = await loadImage(imgPath);
                images.push(img);
            } catch (e) {
                console.error(`Failed to load image ${imgPath}:`, e);
            }
        }
    }
    return images;
}

function pseudoRandom(seed: number, index: number): number {
    const s = Math.sin(seed + index * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

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
    
    const assetsDir = path.join(__dirname, '..', '..', 'viewer', 'assets');
    const assets = {
        mounts: await loadImagesFromDir(path.join(assetsDir, 'mounts')),
        hills: await loadImagesFromDir(path.join(assetsDir, 'hills')),
        trees: await loadImagesFromDir(path.join(assetsDir, 'trees')),
        pines: await loadImagesFromDir(path.join(assetsDir, 'pines_trees')),
        jungles: await loadImagesFromDir(path.join(assetsDir, 'jungles')),
        swamps: await loadImagesFromDir(path.join(assetsDir, 'swamp')),
        deserts: await loadImagesFromDir(path.join(assetsDir, 'deserts')),
        capitals: await loadImagesFromDir(path.join(assetsDir, 'capitals')),
        cities: await loadImagesFromDir(path.join(assetsDir, 'cities')),
        shrubland: await loadImagesFromDir(path.join(assetsDir, 'shrubland')),
        villages: await loadImagesFromDir(path.join(assetsDir, 'villages')) // Fallback to cities if missing
    };
    if (assets.villages.length === 0) assets.villages = assets.cities;

    let bgImg: Image | null = null;
    try {
        const bgPath = path.join(assetsDir, 'map_bg.jpg');
        if (fs.existsSync(bgPath)) {
            bgImg = await loadImage(bgPath);
        }
    } catch(e) {}

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
            const pattern = ctx.createPattern(bgImg, 'repeat');
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
        
        // Water
        ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
        for (let y = 0; y < regionHeight; y++) {
            for (let x = 0; x < regionWidth; x++) {
                if (localPayload.elevation[y][x] <= localPayload.config.oceanLevel || localPayload.lakes[y][x]) {
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
                
                if (biome === 'SNOW') { targetAssetList = assets.mounts; density = 0.15; }
                else if (biome === 'TUNDRA' || biome === 'TAIGA') { targetAssetList = assets.pines; density = 0.15; sizeMult = 0.8; }
                else if (biome === 'BARE' || biome === 'CLIFF') { targetAssetList = assets.mounts; density = 0.15; sizeMult = 1.2; }
                else if (biome === 'TEMPERATE_DECIDUOUS_FOREST' || biome === 'TEMPERATE_RAIN_FOREST' || biome === 'TROPICAL_SEASONAL_FOREST') { targetAssetList = assets.trees; density = 0.15; sizeMult = 0.8; }
                else if (biome === 'TROPICAL_RAIN_FOREST') { targetAssetList = assets.jungles; density = 0.18; sizeMult = 0.9; }
                else if (biome === 'TEMPERATE_DESERT' || biome === 'SUBTROPICAL_DESERT' || biome === 'SCORCHED' || biome === 'BEACH') { targetAssetList = assets.deserts; density = 0.05; sizeMult = 0.9; }
                else if (biome === 'SWAMP') { targetAssetList = assets.swamps; density = 0.1; sizeMult = 0.7; }
                else if (biome === 'GRASSLAND') { targetAssetList = assets.hills; density = 0.04; sizeMult = 0.6; }
                else if (biome === 'SHRUBLAND') { targetAssetList = assets.shrubland; density = 0.1; sizeMult = 0.6; }
                
                if (targetAssetList && targetAssetList.length > 0) {
                    if (pseudoRandom(hashSeed(gx, gy, 1), 0) < density) {
                        const imgIndex = Math.floor(pseudoRandom(hashSeed(gx, gy, 2), 0) * targetAssetList.length);
                        const img = targetAssetList[imgIndex];
                        
                        const jitterX = (pseudoRandom(hashSeed(gx, gy, 3), 0) - 0.5) * TILE_SIZE * 2;
                        const jitterY = (pseudoRandom(hashSeed(gx, gy, 4), 0) - 0.5) * TILE_SIZE * 2;
                        
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
        
        // Roads
        if (localPayload.political.roadMap) {
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 6; // Thicker on regional map
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8;
            
            ctx.beginPath();
            for (let y = 0; y < regionHeight; y++) {
                for (let x = 0; x < regionWidth; x++) {
                    if (localPayload.political.roadMap[y][x]) {
                        const cx1 = x * TILE_SIZE + TILE_SIZE / 2;
                        const cy1 = y * TILE_SIZE + TILE_SIZE / 2;
                        
                        if (x < regionWidth - 1 && localPayload.political.roadMap[y][x+1]) { ctx.moveTo(cx1, cy1); ctx.lineTo(cx1 + TILE_SIZE, cy1); }
                        if (y < regionHeight - 1 && localPayload.political.roadMap[y+1][x]) { ctx.moveTo(cx1, cy1); ctx.lineTo(cx1, cy1 + TILE_SIZE); }
                        if (x < regionWidth - 1 && y < regionHeight - 1 && localPayload.political.roadMap[y+1][x+1]) { ctx.moveTo(cx1, cy1); ctx.lineTo(cx1 + TILE_SIZE, cy1 + TILE_SIZE); }
                        if (x > 0 && y < regionHeight - 1 && localPayload.political.roadMap[y+1][x-1]) { ctx.moveTo(cx1, cy1); ctx.lineTo(cx1 - TILE_SIZE, cy1 + TILE_SIZE); }
                    }
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // Settlements
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
