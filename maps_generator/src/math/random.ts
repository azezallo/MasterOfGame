export function pseudoRandom(seed: number, index: number): number {
    const s = Math.sin(seed + index * 12.9898) * 43758.5453;
    return s - Math.floor(s);
}

export function hashRandom(seed: number, x: number, y: number, extra: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + extra * 19.1919 + seed) * 43758.5453;
    return n - Math.floor(n);
}
