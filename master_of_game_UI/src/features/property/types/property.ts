import type { Item } from '../../items/types/item';

export type BodyZone =
  | 'head'
  | 'torso'
  | 'legs'
  | 'feet'
  | 'left_hand'
  | 'right_hand'
  | 'neck'
  | 'waist'
  | 'back'
  | string;

export type EquipmentLayer = 'inner' | 'middle' | 'outer' | 'accessory';

export interface InteractionState {
  is_active: boolean;
  is_blocked: boolean;
  blocked_by_item_id?: string | null;
  narrative_note?: string | null;
}

export interface EquippedGearItem {
  equipped_instance_id: string;
  item_id: string;
  body_zone: BodyZone;
  layer: EquipmentLayer;
  worn_over_item_id?: string | null;
  attached_pendants_ids?: string[];
  interaction_state: InteractionState;
  resolved_item?: Item;
}

export interface PocketItem {
  item_id: string;
  quantity: number;
  custom_label?: string | null;
  resolved_item?: Item;
}

export interface BackpackState {
  is_equipped: boolean;
  backpack_item_id?: string | null;
  items: PocketItem[];
}

export interface PocketsAndBeltState {
  items: PocketItem[];
}

export type EncumbranceStatus = 'normal' | 'heavy' | 'overloaded';

export interface WeightStats {
  equipped_and_pockets_weight_kg: number;
  backpack_weight_kg: number;
  total_weight_kg: number;
  max_carry_weight_kg: number;
  encumbrance_status: EncumbranceStatus;
  combat_encumbrance_status: EncumbranceStatus;
}

export interface PocketInventory {
  backpack: BackpackState;
  pockets_and_belt: PocketsAndBeltState;
  weight_stats: WeightStats;
}

export interface BankAccount {
  account_id: string;
  guild_id: string;
  bank_location_id: string;
  balance_coins: number;
  account_number: string;
}

export interface PromissoryNote {
  note_id: string;
  debtor_name: string;
  debtor_npc_id: string;
  amount_coins: number;
  due_date: string;
  description: string;
}

export interface PropertyFinances {
  coins: number;
  bank_accounts: BankAccount[];
  promissory_notes: PromissoryNote[];
}

export interface RealEstateRentDetails {
  cost_per_day_coins: number;
  paid_until_day: number;
  landlord_npc_id: string;
}

export interface RealEstateBusinessDetails {
  is_active_business: boolean;
  business_type: string;
  daily_revenue_coins: number;
  daily_maintenance_coins: number;
  accumulated_profit_coins: number;
  manager_npc_id: string;
}

export type OwnershipType = 'owned' | 'rented' | 'mortgaged';

export interface RealEstateProperty {
  property_id: string;
  location_id: string;
  name: string;
  ownership_type: OwnershipType;
  rent_details?: RealEstateRentDetails | null;
  business_and_tax_details?: RealEstateBusinessDetails | null;
  associated_storage_cache_id?: string | null;
}

export type CacheAccessType = 'private' | 'shared';

export interface StorageCache {
  cache_id: string;
  location_id: string;
  name: string;
  container_item_id: string;
  access_type: CacheAccessType;
  allowed_user_ids: string[];
  items?: PocketItem[];
}

export type VehicleType = 'mount' | 'wagon' | 'boat' | 'ship';
export type VehicleStatus = 'traveling' | 'stabled' | 'abandoned';

export interface VehicleOrMount {
  vehicle_id: string;
  name: string;
  type: VehicleType;
  current_location_id: string;
  status: VehicleStatus;
  associated_storage_cache_id?: string | null;
}

export interface OwnerContext {
  owner_type: 'player' | 'npc' | 'organization';
  owner_id: string;
}

export interface PropertyProfile {
  property_profile_id: string;
  owner_context: OwnerContext;
  equipped: EquippedGearItem[];
  pocket_inventory: PocketInventory;
  finances: PropertyFinances;
  real_estate: RealEstateProperty[];
  storage_caches: StorageCache[];
  vehicles_and_mounts: VehicleOrMount[];
}

export type PropertyTab = 'equipment' | 'finances' | 'real_estate';

// API Requests & Responses
export interface FetchPropertyResponse {
  success: boolean;
  data: PropertyProfile;
}

export interface PayRentRequest {
  property_id: string;
  days?: number;
}

export interface PayRentResponse {
  success: boolean;
  data: PropertyProfile;
  message?: string;
}

export interface ToggleBackpackRequest {
  is_equipped: boolean;
}

export interface ToggleBackpackResponse {
  success: boolean;
  data: PropertyProfile;
  message?: string;
}

export interface StorageTransferRequest {
  cache_id: string;
  action: 'deposit' | 'withdraw';
  item_id: string;
  quantity: number;
}

export interface StorageTransferResponse {
  success: boolean;
  data: PropertyProfile;
  message?: string;
}
