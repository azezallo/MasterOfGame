import { createCanvas, loadImage, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load all images from a directory
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

// Random helper
function pseudoRandom(seed: number, index: number): number {
    const s = Math.sin(seed + index * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

export async function renderMapToImage(mapData: any) {
    console.log('Starting high-res map rendering...');
    const TILE_SIZE = 4; // Scale 1:4 (4 pixels per config tile)
    const width = mapData.config.width;
    const height = mapData.config.height;
    
    const canvasWidth = width * TILE_SIZE;
    const canvasHeight = height * TILE_SIZE;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    const assetsDir = path.join(__dirname, '..', '..', 'viewer', 'assets');
    
    // 1. Draw Background
    try {
        const bgPath = path.join(assetsDir, 'map_bg.jpg');
        if (fs.existsSync(bgPath)) {
            const bgImg = await loadImage(bgPath);
            // Tile the background if it's smaller than the canvas
            const pattern = ctx.createPattern(bgImg, 'repeat');
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
        console.log("No map_bg.jpg found, using solid color.");
        ctx.fillStyle = '#e8d5a1';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // 2. Load Assets
    console.log('Loading assets...');
    const assets = {
        mounts: await loadImagesFromDir(path.join(assetsDir, 'mounts')),
        hills: await loadImagesFromDir(path.join(assetsDir, 'hills')),
        trees: await loadImagesFromDir(path.join(assetsDir, 'trees')),
        pines: await loadImagesFromDir(path.join(assetsDir, 'pines_trees')),
        jungles: await loadImagesFromDir(path.join(assetsDir, 'jungles')),
        swamps: await loadImagesFromDir(path.join(assetsDir, 'swamp')),
        deserts: await loadImagesFromDir(path.join(assetsDir, 'deserts')),
        capitals: await loadImagesFromDir(path.join(assetsDir, 'capitals')),
        cities: await loadImagesFromDir(path.join(assetsDir, 'cities'))
    };
    
    // 3. Draw Water Base (for ocean and lakes)
    // We draw a semi-transparent blue overlay on the parchment for water
    ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mapData.elevation[y][x] <= mapData.config.oceanLevel || mapData.lakes[y][x]) {
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // 4. Asset Scattering (Sorted by Y to respect depth)
    // We create a list of objects to draw, then sort them by Y coordinate
    const drawQueue: {img: Image, x: number, y: number, w: number, h: number}[] = [];
    
    let seedIndex = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mapData.elevation[y][x] <= mapData.config.oceanLevel && !mapData.lakes[y][x]) continue; // Skip ocean
            if (mapData.political && mapData.political.settlementMap[y][x]) continue; // Skip settlements (rendered in SVG later)
            if (mapData.political && mapData.political.roadMap[y][x]) continue; // Avoid placing big trees directly on roads
            
            const biome = mapData.biomes[y][x];
            let targetAssetList: Image[] | null = null;
            let density = 0; // Probability to place an asset here
            let sizeMult = 1.0;
            
            if (biome === 'SNOW') {
                targetAssetList = assets.mounts;
                density = 0.6;
                sizeMult = 1.0;
            } else if (biome === 'TUNDRA' || biome === 'TAIGA') {
                targetAssetList = assets.pines;
                density = 0.7;
                sizeMult = 0.8;
            } else if (biome === 'MOUNTAIN') {
                targetAssetList = assets.mounts;
                density = 0.8;
                sizeMult = 1.2;
            } else if (biome === 'FOREST') {
                targetAssetList = assets.trees;
                density = 0.7;
                sizeMult = 0.8;
            } else if (biome === 'JUNGLE') {
                targetAssetList = assets.jungles;
                density = 0.8;
                sizeMult = 0.9;
            } else if (biome === 'DESERT') {
                targetAssetList = assets.deserts;
                density = 0.2; // Sparse
                sizeMult = 0.8;
            } else if (biome === 'SWAMP') {
                targetAssetList = assets.swamps;
                density = 0.4;
                sizeMult = 0.7;
            } else if (biome === 'GRASSLAND' || biome === 'SAVANNA') {
                targetAssetList = assets.hills;
                density = 0.15; // Sparse hills
                sizeMult = 0.6;
            }
            
            if (targetAssetList && targetAssetList.length > 0) {
                // Determine if we place an asset here based on pseudo-random density
                if (pseudoRandom(mapData.config.political.seed, seedIndex++) < density) {
                    const imgIndex = Math.floor(pseudoRandom(mapData.config.political.seed, seedIndex++) * targetAssetList.length);
                    const img = targetAssetList[imgIndex];
                    
                    // Jitter position so they don't align perfectly to the grid
                    const jitterX = (pseudoRandom(mapData.config.political.seed, seedIndex++) - 0.5) * TILE_SIZE * 2;
                    const jitterY = (pseudoRandom(mapData.config.political.seed, seedIndex++) - 0.5) * TILE_SIZE * 2;
                    
                    // Use a base height instead of width to prevent tall assets from becoming massive
                    const baseAssetHeight = 24; 
                    const drawH = baseAssetHeight * sizeMult;
                    const drawW = (img.width / img.height) * drawH;
                    
                    const drawX = x * TILE_SIZE + jitterX - drawW/2 + TILE_SIZE/2;
                    const drawY = y * TILE_SIZE + jitterY - drawH + TILE_SIZE/2;
                    
                    drawQueue.push({
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
    
    // Draw Roads directly to ctx before scattered objects so they appear under trees and cities
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
                    
                    if (x < width - 1 && mapData.political.roadMap[y][x+1]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo((x+1) * TILE_SIZE + TILE_SIZE / 2, cy1);
                    }
                    if (y < height - 1 && mapData.political.roadMap[y+1][x]) {
                        ctx.moveTo(cx1, cy1);
                        ctx.lineTo(cx1, (y+1) * TILE_SIZE + TILE_SIZE / 2);
                    }
                }
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
    
    // Add Settlements to drawQueue
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
                
                const baseAssetHeight = 24;
                const drawH = baseAssetHeight * sizeMult;
                const drawW = (img.width / img.height) * drawH;
                
                const drawX = s.x * TILE_SIZE - drawW/2 + TILE_SIZE/2;
                const drawY = s.y * TILE_SIZE - drawH + TILE_SIZE/2; // Center base on tile
                
                drawQueue.push({
                    img, 
                    x: drawX, 
                    y: drawY, 
                    w: drawW, 
                    h: drawH
                });
            }
        }
    }
    
    // Sort by Y coordinate for correct depth overlapping
    drawQueue.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    
    console.log(`Drawing ${drawQueue.length} scattered assets...`);
    for (const item of drawQueue) {
        ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
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
