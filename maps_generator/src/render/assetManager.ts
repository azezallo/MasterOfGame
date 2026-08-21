import { Image, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

export interface Assets {
    mounts: Image[];
    hills: Image[];
    trees: Image[];
    pines: Image[];
    jungles: Image[];
    swamps: Image[];
    deserts: Image[];
    capitals: Image[];
    cities: Image[];
    shrubland: Image[];
    villages: Image[];
    monsters: Image[];
    bare_rocks: Image[];
    beach: Image[];
    cliffs: Image[];
    cold_desert: Image[];
    scorched: Image[];
    snow: Image[];
    tropical_season_forest: Image[];
    tundra: Image[];
    wind_rose: Image[];
    bgImg: Image | null;
}

async function loadImagesFromDir(dirPath: string): Promise<Image[]> {
    if (!fs.existsSync(dirPath)) return [];
    
    const files = fs.readdirSync(dirPath);
    const images: Image[] = [];
    
    for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            try {
                const img = await loadImage(path.join(dirPath, file));
                images.push(img);
            } catch (e) {
                console.warn(`Failed to load image: ${file}`);
            }
        }
    }
    
    return images;
}

class AssetManager {
    private static instance: AssetManager;
    private assets: Assets | null = null;
    
    private constructor() {}
    
    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }
    
    public async loadAllAssets(): Promise<Assets> {
        if (this.assets) return this.assets;
        
        console.log('Loading assets into AssetManager...');
        const assetsDir = path.join(__dirname, '..', '..', 'viewer', 'assets');
        
        const assets: Assets = {
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
            villages: await loadImagesFromDir(path.join(assetsDir, 'villages')),
            monsters: await loadImagesFromDir(path.join(assetsDir, 'monsters_and_ships')),
            bare_rocks: await loadImagesFromDir(path.join(assetsDir, 'bare_rocks')),
            beach: await loadImagesFromDir(path.join(assetsDir, 'beach')),
            cliffs: await loadImagesFromDir(path.join(assetsDir, 'cliffs')),
            cold_desert: await loadImagesFromDir(path.join(assetsDir, 'cold_desert')),
            scorched: await loadImagesFromDir(path.join(assetsDir, 'scorched')),
            snow: await loadImagesFromDir(path.join(assetsDir, 'snow')),
            tropical_season_forest: await loadImagesFromDir(path.join(assetsDir, 'tropical_season_forest')),
            tundra: await loadImagesFromDir(path.join(assetsDir, 'tundra')),
            wind_rose: await loadImagesFromDir(path.join(assetsDir, 'wind_rose')),
            bgImg: null
        };
        
        if (assets.villages.length === 0) {
            assets.villages = assets.cities;
        }
        
        try {
            const bgPath = path.join(assetsDir, 'map_bg.jpg');
            if (fs.existsSync(bgPath)) {
                assets.bgImg = await loadImage(bgPath);
            }
        } catch(e) {
            console.log("No map_bg.jpg found.");
        }
        
        this.assets = assets;
        return this.assets;
    }
}

export default AssetManager.getInstance();
