import { MapGenerationConfig } from '../config';

export function generateTemperatureMap(config: MapGenerationConfig, elevationMap: number[][]): number[][] {
    const { width, height, temperature, oceanLevel } = config;
    
    // We use the seed to determine the base climate of this small map region.
    // 0.0 = Arctic, 1.0 = Equatorial.
    // We use a simple hash function on the seed to get a value between 0.1 and 0.9.
    const x = Math.sin(temperature.seed) * 10000;
    const baseTemp = Math.abs(x - Math.floor(x)); 
    
    // We assume 1 pixel = 1 km. A 100km span only changes temperature slightly.
    // We map Y=0 to Y=height to a small gradient, e.g., 0.05 difference.
    const gradientSpan = 0.05; 

    const tempMap: number[][] = [];

    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            
            // Latitude gradient (Y axis)
            // If the map is in northern hemisphere, north (Y=0) is colder, south (Y=height) is warmer.
            // Let's just assume Y=0 is North, Y=height is South.
            const latEffect = (y / height) * gradientSpan;
            let currentTemp = baseTemp + latEffect - (gradientSpan / 2);

            // Elevation modifier.
            // Temperature drops as elevation rises.
            const elevation = elevationMap[y][x];
            
            // If it's land (above oceanLevel), apply altitude cooling.
            if (elevation > oceanLevel) {
                // Normalize land elevation to 0.0 - 1.0
                const landElevation = (elevation - oceanLevel) / (1 - oceanLevel);
                // The higher the mountain, the colder it gets.
                currentTemp -= (landElevation * 0.6); 
            }

            // Clamp between 0.0 and 1.0
            currentTemp = Math.max(0, Math.min(1, currentTemp));
            
            row.push(currentTemp);
        }
        tempMap.push(row);
    }

    return tempMap;
}
