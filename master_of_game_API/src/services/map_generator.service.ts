import { v4 as uuidv4 } from 'uuid';
import { DatabaseRepository } from '../persistence/database_repository';
import { LocationData, Transition } from '../types/location.types';

export class MapGeneratorService {
  constructor(private dbRepo: DatabaseRepository) {}

  public async generateWorld(size: { x: number, y: number }): Promise<void> {
    // TODO [F019]: Implement seed-based PRNG for generation
    const gridDimensionX = size.x;
    const gridDimensionY = size.y;
    
    // Create a 2D array to hold location IDs for adjacency calculations
    const grid: string[][] = Array(gridDimensionY).fill(null).map(() => Array(gridDimensionX).fill(''));
    const locations = new Map<string, LocationData>();
    
    const biomes = ['Ліс', 'Поля', 'Гори', 'Рівнина'];

    // 1. Generate regions
    for (let y = 1; y <= gridDimensionY; y++) {
      for (let x = 1; x <= gridDimensionX; x++) {
        const locId = uuidv4();
        grid[y - 1]![x - 1] = locId;
        
        // Simple random biome selection (can be replaced by Perlin noise later)
        const biome = biomes[Math.floor(Math.random() * biomes.length)]!;
        let type: 'wilderness' | 'waterway' | 'region' = 'region';
        let name = `Дикі Землі (${biome})`;

        locations.set(locId, {
          location_id: locId,
          parent_location_id: null,
          name: name,
          location_type: type,
          matrix_coordinates: { x, y, z: 0 },
          public_description: `Безкрайній ${biome.toLowerCase()}, що тягнеться до обрію.`,
          discovery_status: 'visited', // Make regions visible initially
          access_status: 'open',
          environmental_state: {
            mana_density: Math.floor(Math.random() * 100),
            lighting: 'bright',
            weather: 'clear',
            active_hazards: [],
          },
          transitions: [],
          secrets: [],
          connected_entities: {
            associated_npc_ids: [],
            present_item_ids: [],
          },
          state_modifications: [],
        });
      }
    }

    // 2. Build transitions (grid neighbors)
    for (let y = 0; y < gridDimensionY; y++) {
      for (let x = 0; x < gridDimensionX; x++) {
        const currentLocId = grid[y]![x]!;
        const currentLoc = locations.get(currentLocId);
        if (!currentLoc) continue;

        // North
        if (y > 0) {
          currentLoc.transitions.push(this.createGridTransition('Північ', grid[y - 1]![x]!));
        }
        // South
        if (y < gridDimensionY - 1) {
          currentLoc.transitions.push(this.createGridTransition('Південь', grid[y + 1]![x]!));
        }
        // West
        if (x > 0) {
          currentLoc.transitions.push(this.createGridTransition('Захід', grid[y]![x - 1]!));
        }
        // East
        if (x < gridDimensionX - 1) {
          currentLoc.transitions.push(this.createGridTransition('Схід', grid[y]![x + 1]!));
        }
      }
    }

    // 3. Create a starter settlement in the center
    const centerY = Math.floor(gridDimensionY / 2);
    const centerX = Math.floor(gridDimensionX / 2);
    const centerRegionId = grid[centerY]![centerX]!;
    const settlementId = uuidv4();
    
    locations.set(settlementId, {
      location_id: settlementId,
      parent_location_id: centerRegionId,
      name: 'Стартове Місто',
      location_type: 'settlement',
      matrix_coordinates: { x: 1, y: 1, z: 0 },
      public_description: 'Невелике, але гамірне місто, з якого починається ваша подорож.',
      discovery_status: 'visited',
      access_status: 'open',
      environmental_state: {
         mana_density: 50,
         lighting: 'bright',
         weather: 'clear',
         active_hazards: [],
      },
      transitions: [
        this.createGridTransition('Вийти з міста', centerRegionId)
      ],
      secrets: [],
      connected_entities: {
        associated_npc_ids: [],
        present_item_ids: [],
      },
      state_modifications: [],
    });

    // Add transition from the center region back to the settlement
    const centerRegion = locations.get(centerRegionId);
    if (centerRegion) {
      centerRegion.transitions.push(this.createGridTransition('Увійти в Стартове Місто', settlementId));
      centerRegion.name = `Околиці Стартового Міста`;
      centerRegion.public_description = `Звідси добре видно мури міста.`;
    }

    // 4. Save everything
    const locationRepo = this.dbRepo.getLocationRepository();
    for (const loc of locations.values()) {
       locationRepo.save(loc);
    }
  }

  private createGridTransition(direction: string, targetId: string): Transition {
    return {
      transition_id: uuidv4(),
      direction_label: direction,
      target_location_id: targetId,
      transition_type: 'grid_neighbor',
      discovery_status: 'visible',
      access_status: 'open',
    };
  }
}
