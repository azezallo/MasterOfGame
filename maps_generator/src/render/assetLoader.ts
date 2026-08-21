import { Image, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

export async function loadImagesFromDir(dirPath: string): Promise<Image[]> {
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
