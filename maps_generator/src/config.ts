export interface MapGenerationConfig {
    width: number;
    height: number;
    oceanLevel: number;
    elevation: {
        seed: number;
        octaves: number;
        persistence: number;
        lacunarity: number;
        scale: number;
    };
    temperature: {
        seed: number; // Used to determine the base global temperature of this local map
    };
    moisture: {
        seed: number;
        octaves: number;
        persistence: number;
        lacunarity: number;
        scale: number;
        windDirection: { x: number, y: number }; // Used for rain shadow simulation
    };
    hydrology: {
        riverCount: number;
        minRiverStartElevation: number;
        riverMoistureBonus: number;
    };
    islandMask: boolean;
}

export const MapConfig: MapGenerationConfig = {
    // Map dimensions (1 pixel = 1 km)
    width: 500,
    height: 500,
    
    oceanLevel: 0.35, // Below this height is water

    // Perlin noise FBM settings for elevation
    elevation: {
        seed: 12345,
        octaves: 6,
        persistence: 0.4,
        lacunarity: 2.0,
        scale: 0.015 // Lower scale means "zoomed in", larger features
    },
    
    // Thermodynamics settings
    temperature: {
        seed: 9999, // Determines base temperature (e.g. if the map is near equator or pole)
    },
    
    moisture: {
        seed: 5555,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        scale: 0.02,
        windDirection: { x: 1, y: 0 } // Wind blows from West to East
    },
    
    hydrology: {
        riverCount: 20,
        minRiverStartElevation: 0.5,
        riverMoistureBonus: 0.5
    },
    
    // If true, forces the edges of the map to drop off into the ocean
    islandMask: true
};
