export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export type LocationType = 'region' | 'settlement' | 'building' | 'room' | 'dungeon_cell' | 'wilderness' | 'waterway';
export type DiscoveryStatus = 'undiscovered' | 'discovered' | 'visited';
export type AccessStatus = 'open' | 'locked' | 'hidden' | 'blocked' | 'danger_zone';
export type TransitionType = 'grid_neighbor' | 'interior_stairs' | 'custom_secret' | 'portal' | 'road' | 'waterway';
export type TransitionDiscoveryStatus = 'visible' | 'hidden' | 'discovered';
export type TransitionAccessStatus = 'open' | 'locked' | 'blocked' | 'conditional';
export type HazardLevel = 'none' | 'low' | 'medium' | 'high';

export interface LockDetails {
  key_id: string | null;
  lockpick_dc: number;
}

export interface TravelProperties {
  time_minutes: number;
  hazard_level: HazardLevel;
}

export interface Transition {
  transition_id: string;
  direction_label: string;
  target_location_id: string;
  transition_type: TransitionType;
  discovery_status: TransitionDiscoveryStatus;
  access_status: TransitionAccessStatus;
  lock_details?: LockDetails | null;
  travel_properties?: TravelProperties | null;
  secret_id?: string | null;
}

export interface EnvironmentalState {
  mana_density: number;
  lighting: 'bright' | 'dim' | 'dark' | 'magical_darkness';
  weather: string | null;
  active_hazards: string[];
}

export interface StateModification {
  modification_id: string;
  timestamp: string;
  type: 'structural_damage' | 'environmental_change' | 'entity_left' | 'inscription';
  description: string;
}

export interface Secret {
  secret_id: string;
  description: string;
  discovery_status: 'hidden' | 'discovered_by_player';
}

export interface ConnectedEntities {
  associated_npc_ids: string[];
  present_item_ids: string[];
}

export interface LocationData {
  location_id: string;
  parent_location_id: string | null;
  matrix_coordinates?: Coordinates | null;
  location_type: LocationType;
  name: string;
  public_description: string;
  discovery_status: DiscoveryStatus;
  access_status: AccessStatus;
  settlement_blueprint?: any | null;
  environmental_state: EnvironmentalState;
  state_modifications: StateModification[];
  transitions: Transition[];
  secrets: Secret[];
  connected_entities: ConnectedEntities;
}
