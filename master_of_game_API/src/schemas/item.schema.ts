import { z } from 'zod';

// 1. Item Categories
export const ItemCategoryEnum = z.enum([
  'weapon',
  'armor',
  'jewelry',
  'consumable',
  'key',
  'container',
  'document',
  'artifact',
  'misc'
]);
export type ItemCategory = z.infer<typeof ItemCategoryEnum>;

// 2. Public Profile
export const PublicProfileSchema = z.object({
  name: z.string(),
  appearance: z.string(),
  public_description: z.string(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

// 3. Secrets & Magic
export const DiscoveryStatusEnum = z.enum(['hidden', 'discovered', 'discovered_by_player']);
export type DiscoveryStatus = z.infer<typeof DiscoveryStatusEnum>;

export const IdentificationStatusEnum = z.enum(['unidentified', 'partially_identified', 'identified']);
export type IdentificationStatus = z.infer<typeof IdentificationStatusEnum>;

export const HiddenSecretSchema = z.object({
  secret_id: z.string(),
  secret_type: z.enum(['key_function', 'magical_power', 'lore_history', 'curse']),
  description: z.string(),
  discovery_status: DiscoveryStatusEnum.default('hidden'),
});
export type HiddenSecret = z.infer<typeof HiddenSecretSchema>;

export const ActiveEnchantmentSchema = z.object({
  enchantment_id: z.string(),
  name: z.string(),
  effect_description: z.string(),
  charges: z.object({
    current: z.number(),
    max: z.number()
  }).nullable().optional(),
  discovery_status: DiscoveryStatusEnum.default('hidden'),
});
export type ActiveEnchantment = z.infer<typeof ActiveEnchantmentSchema>;

export const FocusPropertiesSchema = z.object({
  stability_bonus: z.object({
    target: z.string(),
    amount: z.number(),
  }).nullable().optional(),
  spell_matrix: z.string().nullable().optional(),
  concentration_required: z.boolean().default(true),
}).nullable().optional();
export type FocusProperties = z.infer<typeof FocusPropertiesSchema>;

export const ManaSourceSchema = z.object({
  mana_restore: z.number().nullable().optional(),
  mana_capacity: z.number().nullable().optional(),
  mana_current: z.number().nullable().optional(),
  mana_cost_per_use: z.number().nullable().optional(),
  requires_mage: z.boolean().default(false),
  mana_regen: z.number().default(0),
}).nullable().optional();
export type ManaSource = z.infer<typeof ManaSourceSchema>;

export const MagicalPropertiesSchema = z.object({
  is_magical: z.boolean().default(false),
  active_enchantments: z.array(ActiveEnchantmentSchema).default([]),
  focus_properties: FocusPropertiesSchema,
  mana_source: ManaSourceSchema,
}).nullable().optional();
export type MagicalProperties = z.infer<typeof MagicalPropertiesSchema>;

export const PrivateProfileSchema = z.object({
  true_name: z.string().optional(),
  identification_status: IdentificationStatusEnum.default('unidentified'),
  hidden_secrets: z.array(HiddenSecretSchema).default([]),
  magical_properties: MagicalPropertiesSchema,
}).nullable().optional();
export type PrivateProfile = z.infer<typeof PrivateProfileSchema>;

// 4. Physical Properties
export const DurabilityStateEnum = z.enum(['intact', 'worn', 'damaged', 'broken']);
export type DurabilityState = z.infer<typeof DurabilityStateEnum>;

export const DurabilitySchema = z.object({
  current: z.number(),
  max: z.number(),
  state: DurabilityStateEnum.default('intact'),
});
export type Durability = z.infer<typeof DurabilitySchema>;

export const PhysicalPropertiesSchema = z.object({
  weight_kg: z.number(),
  durability: DurabilitySchema,
  base_value_gold: z.number(),
});
export type PhysicalProperties = z.infer<typeof PhysicalPropertiesSchema>;

// 5. Special Mechanics
export const KeyPropertiesSchema = z.object({
  unlocks_key_id: z.string(),
}).nullable().optional();

export const TrapDetailsSchema = z.object({
  has_trap: z.boolean().default(false),
  is_disarmed: z.boolean().default(false),
  trap_description: z.string().optional(),
  trap_dc: z.number().default(10),
  discovery_status: DiscoveryStatusEnum.default('hidden'),
}).nullable().optional();

export const ContainerPropertiesSchema = z.object({
  contained_item_ids: z.array(z.string()).default([]),
  capacity_weight_kg: z.number(),
  lock_details: z.object({
    is_locked: z.boolean().default(false),
    key_id: z.string().nullable().optional(),
    lockpick_dc: z.number().default(0),
  }).optional(),
  trap_details: TrapDetailsSchema,
}).nullable().optional();

export const DocumentPropertiesSchema = z.object({
  text_content: z.string(),
  language: z.string().default('Загальна мова'),
  is_encrypted: z.boolean().default(false),
  decryption_dc: z.number().default(0),
}).nullable().optional();

export const SpecialMechanicsSchema = z.object({
  key_properties: KeyPropertiesSchema,
  container_properties: ContainerPropertiesSchema,
  document_properties: DocumentPropertiesSchema,
}).nullable().optional();
export type SpecialMechanics = z.infer<typeof SpecialMechanicsSchema>;

// 6. Location Context
export const OwnerTypeEnum = z.enum(['location', 'npc', 'player', 'container']);
export type OwnerType = z.infer<typeof OwnerTypeEnum>;

export const LocationContextSchema = z.object({
  current_owner_type: OwnerTypeEnum,
  current_owner_id: z.string(),
});
export type LocationContext = z.infer<typeof LocationContextSchema>;

// 7. Item Template
export const ItemTemplateSchema = z.object({
  template_id: z.string(),
  category: ItemCategoryEnum,
  public_profile: PublicProfileSchema,
  physical_properties: PhysicalPropertiesSchema,
  special_mechanics: SpecialMechanicsSchema,
});
export type ItemTemplate = z.infer<typeof ItemTemplateSchema>;

// 8. Item Instance
export const ItemInstanceSchema = z.object({
  item_id: z.string(),
  template_id: z.string().nullable().optional(),
  category: ItemCategoryEnum,
  public_profile: PublicProfileSchema,
  private_profile: PrivateProfileSchema,
  physical_properties: PhysicalPropertiesSchema,
  special_mechanics: SpecialMechanicsSchema,
  location_context: LocationContextSchema,
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});
export type ItemInstance = z.infer<typeof ItemInstanceSchema>;

// 9. Master Tools Inputs
export const GetItemContextInputSchema = z.object({
  item_ids: z.array(z.string()),
});

export const SearchItemsInputSchema = z.object({
  query: z.string().optional(),
  owner_type: OwnerTypeEnum.optional(),
  owner_id: z.string().optional(),
  category: ItemCategoryEnum.optional(),
});

export const CreateItemInputSchema = z.object({
  item_id: z.string().optional(),
  template_id: z.string().nullable().optional(),
  category: ItemCategoryEnum.optional(),
  public_profile: PublicProfileSchema.optional(),
  private_profile: PrivateProfileSchema,
  physical_properties: PhysicalPropertiesSchema.optional(),
  special_mechanics: SpecialMechanicsSchema,
  location_context: LocationContextSchema,
  overrides: z.record(z.string(), z.any()).optional(),
});

export const UpdateItemPropertiesInputSchema = z.object({
  item_id: z.string(),
  modifications: z.record(z.string(), z.any()),
});

export const RevealSecretInputSchema = z.object({
  item_id: z.string(),
  secret_id: z.string().optional(),
  reveal_all: z.boolean().optional(),
});

export const UnlockContainerInputSchema = z.object({
  container_id: z.string(),
  key_id: z.string().optional(),
  force_open: z.boolean().optional(),
});

export const ReadDocumentInputSchema = z.object({
  document_id: z.string(),
  language: z.string().optional(),
  decryption_skill: z.number().optional(),
});
