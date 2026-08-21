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
        seed: number;
    };
    moisture: {
        seed: number;
        octaves: number;
        persistence: number;
        lacunarity: number;
        scale: number;
        windDirection: { x: number, y: number };
    };
    hydrology: {
        riverCount: number;
        minRiverStartElevation: number;
        riverMoistureBonus: number;
    };
    magic: {
        seed: number;
        peaksCount: number;
        valleysCount: number;
        minDistance: number;
        blurPasses: number;
    };
    political: {
        seed: number;
        factionCount: number;
        citiesPerFaction: number;
        villagesPerCity: number;
        maxInfluenceRadius: number;
    };
    islandMask: boolean;
    render: {
        backgroundScale: number;
    };
}

export enum BiomeType {
    OCEAN = 'OCEAN',
    BEACH = 'BEACH',
    CLIFF = 'CLIFF',
    SCORCHED = 'SCORCHED',
    BARE = 'BARE',
    TUNDRA = 'TUNDRA',
    SNOW = 'SNOW',
    TAIGA = 'TAIGA',
    SHRUBLAND = 'SHRUBLAND',
    GRASSLAND = 'GRASSLAND',
    SWAMP = 'SWAMP',
    TEMPERATE_DESERT = 'TEMPERATE_DESERT',
    TEMPERATE_DECIDUOUS_FOREST = 'TEMPERATE_DECIDUOUS_FOREST',
    TEMPERATE_RAIN_FOREST = 'TEMPERATE_RAIN_FOREST',
    SUBTROPICAL_DESERT = 'SUBTROPICAL_DESERT',
    TROPICAL_SEASONAL_FOREST = 'TROPICAL_SEASONAL_FOREST',
    TROPICAL_RAIN_FOREST = 'TROPICAL_RAIN_FOREST'
}

export interface Settlement {
    x: number;
    y: number;
    type: 'capital' | 'city' | 'village';
    name: string;
    factionId: number;
    provinceId?: number;
    parentId?: {x: number, y: number};
}

export type GovernmentType = 'monarchy' | 'republic' | 'theocracy' | 'tribal' | 'federation';

export interface Faction {
    id: number;
    name: string;
    government: GovernmentType;
}

export interface PoliticalResult {
    settlementMap: ('capital' | 'city' | 'village' | null)[][];
    factionMap: (number | null)[][];
    provinceMap: (number | null)[][];
    roadMap: boolean[][];
    roadPaths?: {x: number, y: number}[][];
    settlements: Settlement[];
    factions: Faction[];
}

export interface WorldData {
    config: MapGenerationConfig;
    elevation: number[][];
    temperature: number[][];
    moisture: number[][];
    biomes: BiomeType[][];
    rivers: boolean[][];
    riverPaths?: {x: number, y: number}[][];
    lakes: boolean[][];
    magic: number[][];
    political: PoliticalResult;
}

export interface CompressedWorldData extends Omit<WorldData, 'rivers'> {
    rivers?: boolean[][];
}
