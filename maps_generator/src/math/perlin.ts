/**
 * Basic 2D Perlin Noise implementation.
 * Adapted from standard algorithms.
 */
export class PerlinNoise {
    private permutation: number[];

    constructor(seed?: number) {
        this.permutation = new Array(512);
        const p = new Array(256);
        
        // Simple seeded random generator (LCG) if seed is provided, else Math.random
        let random = Math.random;
        if (seed !== undefined) {
            let s = seed;
            random = () => {
                const x = Math.sin(s++) * 10000;
                return x - Math.floor(x);
            };
        }

        for (let i = 0; i < 256; i++) {
            p[i] = Math.floor(random() * 256);
        }
        
        // To avoid overflow, we double the permutation array
        for (let i = 0; i < 512; i++) {
            this.permutation[i] = p[i & 255];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    /**
     * Get 2D Perlin noise value at (x, y)
     * Returns a value typically between -1 and 1, though not strictly guaranteed.
     */
    public noise(x: number, y: number): number {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const A = this.permutation[X] + Y;
        const B = this.permutation[X + 1] + Y;

        const p = this.permutation;

        return this.lerp(v,
            this.lerp(u, this.grad(p[A], x, y), this.grad(p[B], x - 1, y)),
            this.lerp(u, this.grad(p[A + 1], x, y - 1), this.grad(p[B + 1], x - 1, y - 1))
        );
    }

    /**
     * Fractal Brownian Motion (FBM)
     * Combines multiple octaves of noise for a more natural look.
     */
    public fbm(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            
            maxValue += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        // Map the result from approx [-1, 1] to [0, 1]
        // Note: total / maxValue is roughly in [-1, 1] range.
        const normalized = (total / maxValue) + 0.5;
        return Math.max(0, Math.min(1, normalized));
    }
}
