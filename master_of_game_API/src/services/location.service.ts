import { LocationRepository } from '../repositories/location.repository';
import { LocationData, TransitionAccessStatus, LockDetails, EnvironmentalState, StateModification } from '../types/location.types';
import { logger } from '../logger';

export type ContextMode = 'NAVIGATION_MODE' | 'DETAILED_MODE' | 'REGIONAL_MODE';

export class LocationService {
  constructor(private repo: LocationRepository) {}

  public getLocationContext(locationId: string, mode: ContextMode): Partial<LocationData> | null {
    const location = this.repo.findById(locationId);
    if (!location) return null;

    if (mode === 'NAVIGATION_MODE') {
      // Filter out hidden secrets and hidden transitions
      const filteredTransitions = location.transitions.filter(t => t.discovery_status !== 'hidden');
      const filteredSecrets = location.secrets.filter(s => s.discovery_status !== 'hidden');
      
      return {
        location_id: location.location_id,
        name: location.name,
        public_description: location.public_description,
        transitions: filteredTransitions,
        secrets: filteredSecrets,
        connected_entities: location.connected_entities,
        discovery_status: location.discovery_status,
        access_status: location.access_status
      };
    }

    if (mode === 'DETAILED_MODE') {
      return location; // Return full location with all hidden secrets
    }

    if (mode === 'REGIONAL_MODE') {
      // Fetch parent region or context
      const parent = location.parent_location_id ? this.repo.findById(location.parent_location_id) : null;
      return {
        ...location,
        parent_location_id: parent?.location_id || null,
        // Optional: you could include basic region info here
      };
    }

    return location;
  }

  public getMapTiles(parentId: string | null): LocationData[] {
    const locations = this.repo.findByParentId(parentId);
    return locations.map(loc => {
       const safeLoc = this.getLocationContext(loc.location_id, 'NAVIGATION_MODE');
       return {
         ...safeLoc,
         matrix_coordinates: loc.matrix_coordinates,
         parent_location_id: loc.parent_location_id,
         location_type: loc.location_type
       } as LocationData;
    });
  }

  public searchLocations(query: string, filters?: { type?: string, parent_location_id?: string, discovery_status?: string }): LocationData[] {
    let results = this.repo.search(query);
    
    if (filters) {
      if (filters.type) {
        results = results.filter(l => l.location_type === filters.type);
      }
      if (filters.parent_location_id !== undefined) {
         results = results.filter(l => l.parent_location_id === filters.parent_location_id);
      }
      if (filters.discovery_status) {
         results = results.filter(l => l.discovery_status === filters.discovery_status);
      }
    }
    
    return results;
  }

  public calculateDistance(sourceLocationId: string, targetLocationId: string): number | null {
    const source = this.repo.findById(sourceLocationId);
    const target = this.repo.findById(targetLocationId);
    
    if (!source || !target) throw new Error('Location not found');
    
    if (source.parent_location_id === target.parent_location_id && source.matrix_coordinates && target.matrix_coordinates) {
       // Simple Euclidean or Manhattan distance on the grid
       const dx = source.matrix_coordinates.x - target.matrix_coordinates.x;
       const dy = source.matrix_coordinates.y - target.matrix_coordinates.y;
       return Math.sqrt(dx*dx + dy*dy);
    }
    
    // For topological graph distance, we'd need pathfinding (A*)
    // Returning null for now instead of magic number
    return null;
  }

  public movePlayer(sessionId: string, destinationLocationId: string, travelTimeMinutes: number, travelSummary?: string): void {
    const destination = this.repo.findById(destinationLocationId);
    if (!destination) throw new Error('Destination not found');
    
    // TODO [F006]: Implement player movement with time progression
    // integrate with PersistenceService to update playerState.current_location
    // TODO: Advance game time by travelTimeMinutes in session metadata
    logger.info(`Player moved to ${destinationLocationId}. Time passed: ${travelTimeMinutes} minutes. ${travelSummary || ''}`);
  }

  public updateLocationState(locationId: string, updates: {
    public_description?: string,
    lighting?: string,
    weather?: string | null,
    active_hazards?: string[],
    add_state_modification?: StateModification,
    remove_modification_ids?: string[]
  }): void {
    const location = this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');

    if (updates.public_description) location.public_description = updates.public_description;
    
    if (updates.lighting || updates.weather !== undefined || updates.active_hazards) {
       if (updates.lighting) location.environmental_state.lighting = updates.lighting as EnvironmentalState['lighting'];
       if (updates.weather !== undefined) location.environmental_state.weather = updates.weather;
       if (updates.active_hazards) location.environmental_state.active_hazards = updates.active_hazards;
    }

    if (updates.add_state_modification) {
       location.state_modifications.push(updates.add_state_modification);
    }

    if (updates.remove_modification_ids) {
       location.state_modifications = location.state_modifications.filter(
         m => !updates.remove_modification_ids!.includes(m.modification_id)
       );
    }

    this.repo.save(location);
  }

  public updateTransitionStatus(locationId: string, transitionId: string, accessStatus: TransitionAccessStatus, lockDetails?: LockDetails): void {
    const location = this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');

    const transition = location.transitions.find(t => t.transition_id === transitionId);
    if (!transition) throw new Error('Transition not found');

    transition.access_status = accessStatus;
    if (lockDetails !== undefined) {
      transition.lock_details = lockDetails;
    }

    this.repo.save(location);
  }

  public revealLocationSecret(locationId: string, secretId: string): void {
    const location = this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');

    const secret = location.secrets.find(s => s.secret_id === secretId);
    if (secret) {
      secret.discovery_status = 'discovered_by_player';
    }

    const transition = location.transitions.find(t => t.secret_id === secretId);
    if (transition) {
      transition.discovery_status = 'discovered';
    }

    this.repo.save(location);
  }

  public createLocation(data: LocationData): void {
    this.repo.save(data);
  }
}
