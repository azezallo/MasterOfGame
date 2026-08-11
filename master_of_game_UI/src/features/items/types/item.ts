export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'jewelry'
  | 'consumable'
  | 'key'
  | 'container'
  | 'document'
  | 'artifact'
  | 'misc';

export type DurabilityState = 'intact' | 'worn' | 'damaged' | 'broken';

export interface PublicProfile {
  name: string;
  appearance: string;
  public_description: string;
}

export interface HiddenSecret {
  secret_id: string;
  secret_type: 'key_function' | 'magical_power' | 'lore_history' | 'curse';
  description: string;
  discovery_status: 'hidden' | 'discovered' | 'discovered_by_player';
}

export interface ActiveEnchantment {
  enchantment_id: string;
  name: string;
  effect_description: string;
  charges?: { current: number; max: number } | null;
  discovery_status: 'hidden' | 'discovered' | 'discovered_by_player';
}

export interface MagicalProperties {
  is_magical?: boolean;
  active_enchantments?: ActiveEnchantment[];
  focus_properties?: {
    stability_bonus?: { target: string; amount: number } | null;
    spell_matrix?: string | null;
    concentration_required?: boolean;
  } | null;
  mana_source?: {
    mana_restore?: number | null;
    mana_capacity?: number | null;
    mana_current?: number | null;
    mana_cost_per_use?: number | null;
    requires_mage?: boolean;
    mana_regen?: number;
  } | null;
}

export interface PrivateProfile {
  true_name?: string;
  identification_status?: 'unidentified' | 'partially_identified' | 'identified';
  hidden_secrets?: HiddenSecret[];
  magical_properties?: MagicalProperties | null;
}

export interface PhysicalProperties {
  weight_kg: number;
  durability: {
    current: number;
    max: number;
    state: DurabilityState;
  };
  base_value_gold: number;
}

export interface ContainerProperties {
  contained_item_ids?: string[];
  capacity_weight_kg: number;
  lock_details?: {
    is_locked: boolean;
    key_id?: string | null;
    lockpick_dc: number;
  };
}

export interface DocumentProperties {
  text_content?: string;
  language: string;
  is_encrypted: boolean;
  decryption_dc: number;
}

export interface SpecialMechanics {
  key_properties?: { unlocks_key_id: string } | null;
  container_properties?: ContainerProperties | null;
  document_properties?: DocumentProperties | null;
}

export interface LocationContext {
  current_owner_type: 'location' | 'npc' | 'player' | 'container';
  current_owner_id: string;
}

export interface Item {
  item_id: string;
  template_id?: string | null;
  category: ItemCategory;
  public_profile: PublicProfile;
  private_profile?: PrivateProfile | null;
  physical_properties: PhysicalProperties;
  special_mechanics?: SpecialMechanics | null;
  location_context: LocationContext;
  created_at?: number;
  updated_at?: number;
}
