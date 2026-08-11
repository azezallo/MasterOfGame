import { z } from 'zod';

// --- Category 0: Owner Context ---
export const OwnerTypeEnum = z.enum(['player', 'npc', 'organization']);
export type OwnerType = z.infer<typeof OwnerTypeEnum>;

export const OwnerContextSchema = z.object({
  owner_type: OwnerTypeEnum,
  owner_id: z.string(),
});
export type OwnerContext = z.infer<typeof OwnerContextSchema>;

// --- Category 1: Equipped Gear ---
export const EquipmentLayerEnum = z.enum(['inner', 'middle', 'outer', 'accessory']);
export type EquipmentLayer = z.infer<typeof EquipmentLayerEnum>;

export const InteractionStateSchema = z.object({
  is_active: z.boolean().default(true),
  is_blocked: z.boolean().default(false),
  blocked_by_item_id: z.string().nullable().optional(),
  narrative_note: z.string().nullable().optional(),
});
export type InteractionState = z.infer<typeof InteractionStateSchema>;

export const EquippedItemSchema = z.object({
  equipped_instance_id: z.string(),
  item_id: z.string(),
  body_zone: z.string(),
  layer: EquipmentLayerEnum.default('middle'),
  worn_over_item_id: z.string().nullable().optional(),
  attached_pendants_ids: z.array(z.string()).default([]),
  interaction_state: InteractionStateSchema.default({
    is_active: true,
    is_blocked: false,
    blocked_by_item_id: null,
    narrative_note: null,
  }),
});
export type EquippedItem = z.infer<typeof EquippedItemSchema>;

// --- Category 2: Pocket Inventory & Backpack ---
export const PocketInventoryItemSchema = z.object({
  item_id: z.string(),
  quantity: z.number().int().positive().default(1),
  custom_label: z.string().nullable().optional(),
});
export type PocketInventoryItem = z.infer<typeof PocketInventoryItemSchema>;

export const BackpackSchema = z.object({
  is_equipped: z.boolean().default(true),
  backpack_item_id: z.string().nullable().optional(),
  items: z.array(PocketInventoryItemSchema).default([]),
});
export type Backpack = z.infer<typeof BackpackSchema>;

export const PocketsAndBeltSchema = z.object({
  items: z.array(PocketInventoryItemSchema).default([]),
});
export type PocketsAndBelt = z.infer<typeof PocketsAndBeltSchema>;

export const EncumbranceStatusEnum = z.enum(['normal', 'heavy', 'overloaded']);
export type EncumbranceStatus = z.infer<typeof EncumbranceStatusEnum>;

export const WeightStatsSchema = z.object({
  equipped_and_pockets_weight_kg: z.number().default(0),
  backpack_weight_kg: z.number().default(0),
  total_weight_kg: z.number().default(0),
  max_carry_weight_kg: z.number().default(30.0),
  encumbrance_status: EncumbranceStatusEnum.default('normal'),
  combat_encumbrance_status: EncumbranceStatusEnum.default('normal'),
});
export type WeightStats = z.infer<typeof WeightStatsSchema>;

export const PocketInventorySchema = z.object({
  backpack: BackpackSchema.default({ is_equipped: true, items: [] }),
  pockets_and_belt: PocketsAndBeltSchema.default({ items: [] }),
  weight_stats: WeightStatsSchema.default({
    equipped_and_pockets_weight_kg: 0,
    backpack_weight_kg: 0,
    total_weight_kg: 0,
    max_carry_weight_kg: 30.0,
    encumbrance_status: 'normal',
    combat_encumbrance_status: 'normal',
  }),
});
export type PocketInventory = z.infer<typeof PocketInventorySchema>;

// --- Category 3: Financial Assets ---
export const BankAccountSchema = z.object({
  account_id: z.string(),
  guild_id: z.string(),
  bank_location_id: z.string(),
  balance_coins: z.number().int().nonnegative().default(0),
  account_number: z.string(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const PromissoryNoteSchema = z.object({
  note_id: z.string(),
  debtor_name: z.string(),
  debtor_npc_id: z.string().nullable().optional(),
  amount_coins: z.number().int().positive(),
  due_date: z.string(),
  description: z.string(),
});
export type PromissoryNote = z.infer<typeof PromissoryNoteSchema>;

export const FinancesSchema = z.object({
  coins: z.number().int().nonnegative().default(0),
  bank_accounts: z.array(BankAccountSchema).default([]),
  promissory_notes: z.array(PromissoryNoteSchema).default([]),
});
export type Finances = z.infer<typeof FinancesSchema>;

// --- Category 4: Real Estate & Land ---
export const OwnershipTypeEnum = z.enum(['owned', 'rented', 'mortgaged']);
export type OwnershipType = z.infer<typeof OwnershipTypeEnum>;

export const RentDetailsSchema = z.object({
  cost_per_day_coins: z.number().int().nonnegative(),
  paid_until_day: z.number().int().nonnegative(),
  landlord_npc_id: z.string().nullable().optional(),
});
export type RentDetails = z.infer<typeof RentDetailsSchema>;

export const BusinessTypeEnum = z.enum(['tavern', 'smithy', 'shop', 'farm', 'residential']);
export type BusinessType = z.infer<typeof BusinessTypeEnum>;

export const BusinessDetailsSchema = z.object({
  is_active_business: z.boolean().default(true),
  business_type: BusinessTypeEnum,
  daily_revenue_coins: z.number().int().nonnegative().default(0),
  daily_maintenance_coins: z.number().int().nonnegative().default(0),
  accumulated_profit_coins: z.number().int().nonnegative().default(0),
  manager_npc_id: z.string().nullable().optional(),
});
export type BusinessDetails = z.infer<typeof BusinessDetailsSchema>;

export const RealEstateSchema = z.object({
  property_id: z.string(),
  location_id: z.string(),
  name: z.string(),
  ownership_type: OwnershipTypeEnum,
  rent_details: RentDetailsSchema.nullable().optional(),
  business_and_tax_details: BusinessDetailsSchema.nullable().optional(),
  associated_storage_cache_id: z.string().nullable().optional(),
});
export type RealEstate = z.infer<typeof RealEstateSchema>;

// --- Category 5: Storage Caches ---
export const AccessTypeEnum = z.enum(['private', 'shared']);
export type AccessType = z.infer<typeof AccessTypeEnum>;

export const StorageCacheSchema = z.object({
  cache_id: z.string(),
  location_id: z.string(),
  name: z.string(),
  container_item_id: z.string().nullable().optional(),
  access_type: AccessTypeEnum.default('private'),
  allowed_user_ids: z.array(z.string()).default([]),
  items: z.array(PocketInventoryItemSchema).default([]),
});
export type StorageCache = z.infer<typeof StorageCacheSchema>;

// --- Category 6: Vehicles & Mounts ---
export const VehicleTypeEnum = z.enum(['mount', 'wagon', 'boat', 'ship']);
export type VehicleType = z.infer<typeof VehicleTypeEnum>;

export const VehicleStatusEnum = z.enum(['traveling', 'stabled', 'abandoned']);
export type VehicleStatus = z.infer<typeof VehicleStatusEnum>;

export const VehicleAndMountSchema = z.object({
  vehicle_id: z.string(),
  name: z.string(),
  type: VehicleTypeEnum,
  current_location_id: z.string(),
  status: VehicleStatusEnum.default('stabled'),
  associated_storage_cache_id: z.string().nullable().optional(),
});
export type VehicleAndMount = z.infer<typeof VehicleAndMountSchema>;

// --- Complete Property Profile ---
export const PropertyProfileSchema = z.object({
  property_profile_id: z.string(),
  owner_context: OwnerContextSchema,
  equipped: z.array(EquippedItemSchema).default([]),
  pocket_inventory: PocketInventorySchema.default({
    backpack: { is_equipped: true, backpack_item_id: null, items: [] },
    pockets_and_belt: { items: [] },
    weight_stats: {
      equipped_and_pockets_weight_kg: 0,
      backpack_weight_kg: 0,
      total_weight_kg: 0,
      max_carry_weight_kg: 30.0,
      encumbrance_status: 'normal',
      combat_encumbrance_status: 'normal',
    },
  }),
  finances: FinancesSchema.default({ coins: 0, bank_accounts: [], promissory_notes: [] }),
  real_estate: z.array(RealEstateSchema).default([]),
  storage_caches: z.array(StorageCacheSchema).default([]),
  vehicles_and_mounts: z.array(VehicleAndMountSchema).default([]),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});
export type PropertyProfile = z.infer<typeof PropertyProfileSchema>;

// --- 7 AI Master Property Tools Input Schemas ---

export const PropertyCategoryFilterEnum = z.enum([
  'all',
  'equipped',
  'pocket_inventory',
  'finances',
  'real_estate',
  'storage_caches',
  'vehicles_and_mounts',
]);
export type PropertyCategoryFilter = z.infer<typeof PropertyCategoryFilterEnum>;

export const GetOwnerPropertyInputSchema = z.object({
  owner_type: OwnerTypeEnum,
  owner_id: z.string(),
  category_filter: PropertyCategoryFilterEnum.default('all'),
});
export type GetOwnerPropertyInput = z.infer<typeof GetOwnerPropertyInputSchema>;

export const TransferSourceTypeEnum = z.enum(['player', 'npc', 'storage_cache', 'location_floor']);
export type TransferSourceType = z.infer<typeof TransferSourceTypeEnum>;

export const TransferAssetTypeEnum = z.enum(['item', 'currency', 'real_estate_deed', 'vehicle']);
export type TransferAssetType = z.infer<typeof TransferAssetTypeEnum>;

export const TransferPropertyInputSchema = z.object({
  from_context: z.object({
    source_type: TransferSourceTypeEnum,
    source_id: z.string(),
  }),
  to_context: z.object({
    target_type: TransferSourceTypeEnum,
    target_id: z.string(),
  }),
  transfer_details: z.object({
    asset_type: TransferAssetTypeEnum,
    item_id: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    amount_coins: z.number().int().nonnegative().default(0),
    property_id: z.string().optional(),
  }),
});
export type TransferPropertyInput = z.infer<typeof TransferPropertyInputSchema>;

export const EquipItemInputSchema = z.object({
  owner_id: z.string(),
  item_id: z.string(),
  body_zone: z.string(),
  layer: EquipmentLayerEnum.default('middle'),
  worn_over_item_id: z.string().nullable().optional(),
});
export type EquipItemInput = z.infer<typeof EquipItemInputSchema>;

export const UnequipItemInputSchema = z.object({
  owner_id: z.string(),
  item_id: z.string(),
});
export type UnequipItemInput = z.infer<typeof UnequipItemInputSchema>;

export const ToggleBackpackInputSchema = z.object({
  owner_id: z.string(),
  is_equipped: z.boolean(),
  drop_location_id: z.string().optional(),
});
export type ToggleBackpackInput = z.infer<typeof ToggleBackpackInputSchema>;

export const FinanceOperationEnum = z.enum(['add', 'subtract', 'set']);
export type FinanceOperation = z.infer<typeof FinanceOperationEnum>;

export const ModifyFinancesInputSchema = z.object({
  owner_type: OwnerTypeEnum.default('player'),
  owner_id: z.string(),
  operation: FinanceOperationEnum,
  amount_coins: z.number().int().nonnegative(),
  reason: z.string().optional(),
});
export type ModifyFinancesInput = z.infer<typeof ModifyFinancesInputSchema>;

export const RegisterRealEstateInputSchema = z.object({
  owner_id: z.string(),
  location_id: z.string(),
  property_name: z.string(),
  ownership_type: OwnershipTypeEnum,
  rent_details: RentDetailsSchema.optional(),
  business_and_tax_details: BusinessDetailsSchema.optional(),
  create_storage_cache: z.boolean().default(true),
});
export type RegisterRealEstateInput = z.infer<typeof RegisterRealEstateInputSchema>;

export const ManageVehicleStatusInputSchema = z.object({
  owner_id: z.string(),
  vehicle_id: z.string(),
  status: VehicleStatusEnum,
  current_location_id: z.string().optional(),
});
export type ManageVehicleStatusInput = z.infer<typeof ManageVehicleStatusInputSchema>;

// --- API HTTP Input Schemas ---
export const PayRentInputSchema = z.object({
  property_id: z.string(),
  days_to_pay: z.number().int().positive().optional(),
  days: z.number().int().positive().optional(),
}).transform(data => ({
  property_id: data.property_id,
  days_to_pay: data.days_to_pay ?? data.days ?? 1,
}));
export type PayRentInput = z.infer<typeof PayRentInputSchema>;

export const StorageTransferInputSchema = z.object({
  storage_cache_id: z.string().optional(),
  cache_id: z.string().optional(),
  action: z.enum(['put', 'take', 'deposit', 'withdraw']).transform(val => {
    if (val === 'deposit') return 'put';
    if (val === 'withdraw') return 'take';
    return val;
  }),
  item_id: z.string(),
  quantity: z.number().int().positive().default(1),
}).transform(data => ({
  storage_cache_id: data.storage_cache_id || data.cache_id || '',
  action: data.action,
  item_id: data.item_id,
  quantity: data.quantity,
}));
export type StorageTransferInput = z.infer<typeof StorageTransferInputSchema>;
