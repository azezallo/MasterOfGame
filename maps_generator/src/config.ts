import { MapGenerationConfig } from './types';

export const MapConfig: MapGenerationConfig = {
    // Map dimensions (1 pixel = 1 km)
    width: 300,
    height: 300,
    
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
    
    magic: {
        seed: 7777,
        peaksCount: 3,
        valleysCount: 3,
        minDistance: 15,
        blurPasses: 30
    },
    
    political: {
        seed: 8887,
        factionCount: 5,
        citiesPerFaction: 3,
        villagesPerCity: 4,
        maxInfluenceRadius: 45
    },
    
    // If true, forces the edges of the map to drop off into the ocean
    islandMask: true,
    
    // Visual rendering settings
    render: {
        backgroundScale: 0.5 // Scale for map_bg.jpg texture
    }
};
