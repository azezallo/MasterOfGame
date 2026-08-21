import { pseudoRandom } from '../math/random';

const PREFIXES = [
    "Ash", "Oak", "River", "Stone", "Iron", "Storm", "High", "Low", 
    "Dawn", "Dusk", "White", "Black", "Silver", "Gold", "Wind", 
    "Barrow", "Frost", "Fire", "Summer", "Winter", "Moon", "Sun",
    "Grim", "Deep", "Swift", "Broad", "Fair", "Dark", "Green", "Red",
    "Blue", "Grey", "North", "South", "East", "West", "Kings", "Queens",
    "Dragon", "Bear", "Wolf", "Raven", "Eagle", "Falcon", "Hawk"
];

const SUFFIXES = [
    "ton", "ville", "burg", "grad", "wood", "stone", "ford", "bridge", 
    "port", "haven", "keep", "watch", "fall", "peak", "valley", "stead", 
    "dor", "gard", "heim", "gate", "mouth", "cliff", "hill", "run",
    "marsh", "swamp", "lake", "sea", "bay", "cove", "glen", "dale",
    "moor", "field", "meadow", "brook", "stream", "river", "water"
];

const SYLLABLES = [
    "ka", "ra", "ma", "na", "pa", "ta", "sa", "la", "da", "fa",
    "ko", "ro", "mo", "no", "po", "to", "so", "lo", "do", "fo",
    "ki", "ri", "mi", "ni", "pi", "ti", "si", "li", "di", "fi",
    "ku", "ru", "mu", "nu", "pu", "tu", "su", "lu", "du", "fu",
    "ke", "re", "me", "ne", "pe", "te", "se", "le", "de", "fe",
    "ar", "er", "ir", "or", "ur", "al", "el", "il", "ol", "ul",
    "as", "es", "is", "os", "us", "am", "em", "im", "om", "um",
    "an", "en", "in", "on", "un", "ad", "ed", "id", "od", "ud"
];

export function generateSettlementName(seed: number, id: number): string {
    // Determine style based on pseudoRandom
    const styleRand = pseudoRandom(seed, id * 100);
    
    let name = "";
    
    if (styleRand < 0.6) {
        // 60% chance of English-style compound name (e.g. Riverford)
        const pIndex = Math.floor(pseudoRandom(seed, id * 101) * PREFIXES.length);
        const sIndex = Math.floor(pseudoRandom(seed, id * 102) * SUFFIXES.length);
        name = PREFIXES[pIndex] + SUFFIXES[sIndex];
    } else {
        // 40% chance of fantasy syllable name (e.g. Koramal)
        const length = Math.floor(pseudoRandom(seed, id * 103) * 3) + 2; // 2 to 4 syllables
        for (let i = 0; i < length; i++) {
            const sylIndex = Math.floor(pseudoRandom(seed, id * 104 + i) * SYLLABLES.length);
            name += SYLLABLES[sylIndex];
        }
        // Capitalize first letter
        name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    return name;
}

import { GovernmentType } from '../types';

const FACTION_PREFIXES: {text: string, gov: GovernmentType}[] = [
    { text: "Kingdom of", gov: 'monarchy' },
    { text: "Empire of", gov: 'monarchy' },
    { text: "Republic of", gov: 'republic' },
    { text: "Dominion of", gov: 'monarchy' },
    { text: "Grand Duchy of", gov: 'monarchy' },
    { text: "Principality of", gov: 'monarchy' },
    { text: "The Holy Empire of", gov: 'theocracy' },
    { text: "United Tribes of", gov: 'tribal' },
    { text: "Federation of", gov: 'federation' }
];

const FACTION_SUFFIXES: {text: string, gov: GovernmentType}[] = [
    { text: "Empire", gov: 'monarchy' },
    { text: "Kingdom", gov: 'monarchy' },
    { text: "Dominion", gov: 'monarchy' },
    { text: "Tribes", gov: 'tribal' },
    { text: "Alliance", gov: 'federation' },
    { text: "Pact", gov: 'federation' },
    { text: "Union", gov: 'republic' }
];

export function generateFaction(seed: number, factionId: number): { name: string, expectedGov: GovernmentType } {
    const styleRand = pseudoRandom(seed + 500, factionId * 200);
    
    // Generate a base fantasy name
    let baseName = "";
    const length = Math.floor(pseudoRandom(seed + 500, factionId * 201) * 2) + 2; // 2 to 3 syllables
    for (let i = 0; i < length; i++) {
        const sylIndex = Math.floor(pseudoRandom(seed + 500, factionId * 202 + i) * SYLLABLES.length);
        baseName += SYLLABLES[sylIndex];
    }
    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    if (styleRand < 0.4) {
        const item = FACTION_PREFIXES[Math.floor(pseudoRandom(seed + 500, factionId * 203) * FACTION_PREFIXES.length)];
        return { name: `${item.text} ${baseName}`, expectedGov: item.gov };
    } else if (styleRand < 0.8) {
        const item = FACTION_SUFFIXES[Math.floor(pseudoRandom(seed + 500, factionId * 204) * FACTION_SUFFIXES.length)];
        return { name: `${baseName} ${item.text}`, expectedGov: item.gov };
    } else {
        // Default to a monarchy if no prefix/suffix is present
        return { name: baseName, expectedGov: 'monarchy' };
    }
}
