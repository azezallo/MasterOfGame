import { PropertyRepository } from '../repositories/property.repository';
import { ItemRepository } from '../repositories/item.repository';
import { PlayerStateRepository } from '../repositories/player_state.repository';
import { ValidationError } from '../errors/app.errors';
import {
  PropertyProfile,
  OwnerType,
  EquippedItem,
  RealEstate,
  EncumbranceStatus,
  GetOwnerPropertyInputSchema,
  TransferPropertyInputSchema,
  EquipItemInputSchema,
  UnequipItemInputSchema,
  ToggleBackpackInputSchema,
  ModifyFinancesInputSchema,
  RegisterRealEstateInputSchema,
  ManageVehicleStatusInputSchema,
  GetOwnerPropertyInput,
  TransferPropertyInput,
  EquipItemInput,
  UnequipItemInput,
  ToggleBackpackInput,
  ModifyFinancesInput,
  RegisterRealEstateInput,
  ManageVehicleStatusInput,
} from '../schemas/property.schema';

export class PropertyService {
  private propertyRepo: PropertyRepository;
  private itemRepo?: ItemRepository | undefined;
  private playerStateRepo?: PlayerStateRepository | undefined;

  constructor(propertyRepo: PropertyRepository, itemRepo?: ItemRepository, playerStateRepo?: PlayerStateRepository) {
    this.propertyRepo = propertyRepo;
    this.itemRepo = itemRepo;
    this.playerStateRepo = playerStateRepo;
  }

  private getItemWeight(itemId: string): number {
    if (!this.itemRepo) return 1.0;
    const item = this.itemRepo.getItem(itemId);
    return item?.physical_properties?.weight_kg ?? 1.0;
  }

  private calculateEncumbranceStatus(weight: number, maxWeight: number): EncumbranceStatus {
    const ratio = maxWeight > 0 ? weight / maxWeight : 0;
    if (ratio > 1.5) return 'overloaded';
    if (ratio > 1.0) return 'heavy';
    return 'normal';
  }

  public recalculateWeightStats(profile: PropertyProfile, maxCarryWeightKg?: number): PropertyProfile {
    if (maxCarryWeightKg !== undefined) {
      profile.pocket_inventory.weight_stats.max_carry_weight_kg = maxCarryWeightKg;
    } else if (this.playerStateRepo && profile.owner_context.owner_type === 'player') {
      const existingWeight = profile.pocket_inventory.weight_stats.max_carry_weight_kg;
      if (!existingWeight || existingWeight === 30.0) {
        try {
          const playerState = this.playerStateRepo.getPlayerState(profile.owner_context.owner_id);
          if (playerState?.derived_stats?.max_carry_weight_kg) {
            profile.pocket_inventory.weight_stats.max_carry_weight_kg = playerState.derived_stats.max_carry_weight_kg;
          }
        } catch {
          // Keep existing
        }
      }
    }

    const maxWeight = profile.pocket_inventory.weight_stats.max_carry_weight_kg || 55.0;

    // 1. Equipped items weight
    const equippedWeight = profile.equipped.reduce((sum, eq) => sum + this.getItemWeight(eq.item_id), 0);

    // 2. Pockets & belt weight
    const pocketsWeight = profile.pocket_inventory.pockets_and_belt.items.reduce(
      (sum, item) => sum + this.getItemWeight(item.item_id) * item.quantity,
      0
    );

    const equippedAndPocketsWeight = Math.round((equippedWeight + pocketsWeight) * 100) / 100;

    // 3. Backpack weight
    const backpackWeight = profile.pocket_inventory.backpack.items.reduce(
      (sum, item) => sum + this.getItemWeight(item.item_id) * item.quantity,
      0
    );

    const roundedBackpackWeight = Math.round(backpackWeight * 100) / 100;

    // 4. Total weight
    const totalWeight = Math.round((equippedAndPocketsWeight + roundedBackpackWeight) * 100) / 100;

    // Carried weight depends on whether backpack is currently equipped
    const currentCarriedWeight = profile.pocket_inventory.backpack.is_equipped
      ? totalWeight
      : equippedAndPocketsWeight;

    profile.pocket_inventory.weight_stats.equipped_and_pockets_weight_kg = equippedAndPocketsWeight;
    profile.pocket_inventory.weight_stats.backpack_weight_kg = roundedBackpackWeight;
    profile.pocket_inventory.weight_stats.total_weight_kg = totalWeight;
    profile.pocket_inventory.weight_stats.encumbrance_status = this.calculateEncumbranceStatus(currentCarriedWeight, maxWeight);
    profile.pocket_inventory.weight_stats.combat_encumbrance_status = this.calculateEncumbranceStatus(equippedAndPocketsWeight, maxWeight);

    try {
      this.propertyRepo.savePropertyProfile(profile);
    } catch {
      // Ignore if called during initialization
    }

    return profile;
  }

  private createDefaultProfile(ownerType: OwnerType, ownerId: string): PropertyProfile {
    const profile: PropertyProfile = {
      property_profile_id: `prop_${ownerType}_${ownerId}`,
      owner_context: { owner_type: ownerType, owner_id: ownerId },
      equipped: [],
      pocket_inventory: {
        backpack: { is_equipped: true, backpack_item_id: null, items: [] },
        pockets_and_belt: { items: [] },
        weight_stats: {
          equipped_and_pockets_weight_kg: 0,
          backpack_weight_kg: 0,
          total_weight_kg: 0,
          max_carry_weight_kg: 55.0,
          encumbrance_status: 'normal',
          combat_encumbrance_status: 'normal',
        },
      },
      finances: { coins: 0, bank_accounts: [], promissory_notes: [] },
      real_estate: [],
      storage_caches: [],
      vehicles_and_mounts: [],
    };
    return this.recalculateWeightStats(profile);
  }

  // --- 7 AI Master Direct Methods ---

  // 1. get_owner_property
  public getOwnerProperty(ownerType: OwnerType, ownerId: string, categoryFilter: string = 'all'): PropertyProfile {
    let profile = this.propertyRepo.getPropertyProfile(ownerType, ownerId);
    if (!profile) {
      profile = this.createDefaultProfile(ownerType, ownerId);
      this.propertyRepo.savePropertyProfile(profile);
    } else {
      this.recalculateWeightStats(profile);
    }
    return profile;
  }

  // 2. transfer_property
  public transferProperty(input: TransferPropertyInput): { success: boolean; message: string } {
    const params = TransferPropertyInputSchema.parse(input);
    const { from_context, to_context, transfer_details } = params;

    if (transfer_details.asset_type === 'currency') {
      const amount = transfer_details.amount_coins;
      if (from_context.source_type === 'player' || from_context.source_type === 'npc') {
        this.modifyFinances({
          owner_type: from_context.source_type,
          owner_id: from_context.source_id,
          operation: 'subtract',
          amount_coins: amount,
          reason: 'Property Transfer',
        });
      }
      if (to_context.target_type === 'player' || to_context.target_type === 'npc') {
        this.modifyFinances({
          owner_type: to_context.target_type,
          owner_id: to_context.target_id,
          operation: 'add',
          amount_coins: amount,
          reason: 'Property Transfer',
        });
      }
      return { success: true, message: `Transferred ${amount} coins successfully.` };
    }

    if (transfer_details.asset_type === 'item') {
      const itemId = transfer_details.item_id;
      if (!itemId) throw new ValidationError('item_id is required for item transfer');
      const qty = transfer_details.quantity;

      if (from_context.source_type === 'player' || from_context.source_type === 'npc') {
        const sourceProfile = this.getOwnerProperty(from_context.source_type, from_context.source_id);
        const backpackItem = sourceProfile.pocket_inventory.backpack.items.find(i => i.item_id === itemId);
        const pocketItem = sourceProfile.pocket_inventory.pockets_and_belt.items.find(i => i.item_id === itemId);

        if (!backpackItem && !pocketItem) {
          throw new ValidationError(`Item '${itemId}' not found on sender '${from_context.source_id}'`);
        }

        if (backpackItem) {
          backpackItem.quantity -= qty;
          if (backpackItem.quantity <= 0) {
            sourceProfile.pocket_inventory.backpack.items = sourceProfile.pocket_inventory.backpack.items.filter(i => i.item_id !== itemId);
          }
        } else if (pocketItem) {
          pocketItem.quantity -= qty;
          if (pocketItem.quantity <= 0) {
            sourceProfile.pocket_inventory.pockets_and_belt.items = sourceProfile.pocket_inventory.pockets_and_belt.items.filter(i => i.item_id !== itemId);
          }
        }
        this.recalculateWeightStats(sourceProfile);
        this.propertyRepo.savePropertyProfile(sourceProfile);
      }

      if (to_context.target_type === 'player' || to_context.target_type === 'npc') {
        const targetProfile = this.getOwnerProperty(to_context.target_type, to_context.target_id);
        const targetPockets = targetProfile.pocket_inventory.pockets_and_belt.items;
        const existing = targetPockets.find(i => i.item_id === itemId);
        if (existing) {
          existing.quantity += qty;
        } else {
          targetPockets.push({ item_id: itemId, quantity: qty, custom_label: null });
        }
        this.recalculateWeightStats(targetProfile);
        this.propertyRepo.savePropertyProfile(targetProfile);
      }

      return { success: true, message: `Transferred ${qty} of item '${itemId}' successfully.` };
    }

    return { success: true, message: 'Transfer completed.' };
  }

  // 3. equip_item
  public equipItem(input: EquipItemInput): PropertyProfile {
    const params = EquipItemInputSchema.parse(input);
    const profile = this.getOwnerProperty('player', params.owner_id);

    const backpackItem = profile.pocket_inventory.backpack.items.find(i => i.item_id === params.item_id);
    const pocketItem = profile.pocket_inventory.pockets_and_belt.items.find(i => i.item_id === params.item_id);

    if (!backpackItem && !pocketItem) {
      throw new ValidationError(`Item '${params.item_id}' not found in inventory`);
    }

    if (backpackItem) {
      backpackItem.quantity -= 1;
      if (backpackItem.quantity <= 0) {
        profile.pocket_inventory.backpack.items = profile.pocket_inventory.backpack.items.filter(i => i.item_id !== params.item_id);
      }
    } else if (pocketItem) {
      pocketItem.quantity -= 1;
      if (pocketItem.quantity <= 0) {
        profile.pocket_inventory.pockets_and_belt.items = profile.pocket_inventory.pockets_and_belt.items.filter(i => i.item_id !== params.item_id);
      }
    }

    const existingOnZoneAndLayer = profile.equipped.find(
      e => e.body_zone === params.body_zone && e.layer === params.layer
    );

    const isBlocked = !!existingOnZoneAndLayer;
    const blockedByItemId = existingOnZoneAndLayer ? existingOnZoneAndLayer.item_id : null;

    const newEquipped: EquippedItem = {
      equipped_instance_id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_id: params.item_id,
      body_zone: params.body_zone,
      layer: params.layer,
      worn_over_item_id: params.worn_over_item_id || null,
      attached_pendants_ids: [],
      interaction_state: {
        is_active: !isBlocked,
        is_blocked: isBlocked,
        blocked_by_item_id: blockedByItemId,
        narrative_note: isBlocked ? `Blocked by ${blockedByItemId}` : null,
      },
    };

    profile.equipped.push(newEquipped);
    this.recalculateWeightStats(profile);
    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // 4. unequip_item
  public unequipItem(input: UnequipItemInput): PropertyProfile {
    const params = UnequipItemInputSchema.parse(input);
    const profile = this.getOwnerProperty('player', params.owner_id);

    const eqIndex = profile.equipped.findIndex(e => e.item_id === params.item_id || e.equipped_instance_id === params.item_id);
    if (eqIndex === -1) {
      throw new ValidationError(`Equipped item '${params.item_id}' not found on character`);
    }

    const [removed] = profile.equipped.splice(eqIndex, 1);
    if (removed) {
      const existingPocketItem = profile.pocket_inventory.pockets_and_belt.items.find(i => i.item_id === removed.item_id);
      if (existingPocketItem) {
        existingPocketItem.quantity += 1;
      } else {
        profile.pocket_inventory.pockets_and_belt.items.push({
          item_id: removed.item_id,
          quantity: 1,
          custom_label: null,
        });
      }
    }

    this.recalculateWeightStats(profile);
    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // 5. toggle_backpack
  public toggleBackpack(input: ToggleBackpackInput): PropertyProfile {
    const params = ToggleBackpackInputSchema.parse(input);
    const profile = this.getOwnerProperty('player', params.owner_id);

    profile.pocket_inventory.backpack.is_equipped = params.is_equipped;

    this.recalculateWeightStats(profile);
    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // 6. modify_finances
  public modifyFinances(input: ModifyFinancesInput): PropertyProfile {
    const params = ModifyFinancesInputSchema.parse(input);
    const profile = this.getOwnerProperty(params.owner_type, params.owner_id);

    switch (params.operation) {
      case 'add':
        profile.finances.coins += params.amount_coins;
        break;
      case 'subtract':
        if (profile.finances.coins < params.amount_coins) {
          throw new ValidationError(`Insufficient coins. Has: ${profile.finances.coins}, required: ${params.amount_coins}`);
        }
        profile.finances.coins -= params.amount_coins;
        break;
      case 'set':
        profile.finances.coins = params.amount_coins;
        break;
    }

    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // 7. register_real_estate
  public registerRealEstate(input: RegisterRealEstateInput): PropertyProfile {
    const params = RegisterRealEstateInputSchema.parse(input);
    const profile = this.getOwnerProperty('player', params.owner_id);

    const propId = `re_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let cacheId: string | null = null;

    if (params.create_storage_cache) {
      cacheId = `cache_${propId}`;
      profile.storage_caches.push({
        cache_id: cacheId,
        location_id: params.location_id,
        name: `${params.property_name} - Сховище`,
        container_item_id: null,
        access_type: 'private',
        allowed_user_ids: [params.owner_id],
        items: [],
      });
    }

    const newRealEstate: RealEstate = {
      property_id: propId,
      location_id: params.location_id,
      name: params.property_name,
      ownership_type: params.ownership_type,
      rent_details: params.rent_details || null,
      business_and_tax_details: params.business_and_tax_details ? {
        is_active_business: params.business_and_tax_details.is_active_business ?? true,
        business_type: params.business_and_tax_details.business_type,
        daily_revenue_coins: params.business_and_tax_details.daily_revenue_coins ?? 0,
        daily_maintenance_coins: params.business_and_tax_details.daily_maintenance_coins ?? 0,
        accumulated_profit_coins: params.business_and_tax_details.accumulated_profit_coins ?? 0,
        manager_npc_id: params.business_and_tax_details.manager_npc_id || null,
      } : null,
      associated_storage_cache_id: cacheId,
    };

    profile.real_estate.push(newRealEstate);
    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // 8. manage_vehicle_status
  public manageVehicleStatus(input: ManageVehicleStatusInput): PropertyProfile {
    const params = ManageVehicleStatusInputSchema.parse(input);
    const profile = this.getOwnerProperty('player', params.owner_id);

    const vehicle = profile.vehicles_and_mounts.find(v => v.vehicle_id === params.vehicle_id);
    if (!vehicle) {
      throw new ValidationError(`Vehicle '${params.vehicle_id}' not found`);
    }

    vehicle.status = params.status;
    if (params.current_location_id) {
      vehicle.current_location_id = params.current_location_id;
    }

    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  // --- Data Isolation Helper ---
  public toPublicIsolatedProperty(profile: PropertyProfile, requesterType: 'player' | 'npc' = 'player', requesterId?: string): Partial<PropertyProfile> {
    const isOwner = requesterId ? profile.owner_context.owner_id === requesterId : profile.owner_context.owner_type === 'player';

    if (isOwner || profile.owner_context.owner_type === 'player') {
      return profile;
    }

    return {
      property_profile_id: profile.property_profile_id,
      owner_context: profile.owner_context,
      equipped: profile.equipped,
      pocket_inventory: {
        backpack: {
          is_equipped: profile.pocket_inventory.backpack.is_equipped,
          backpack_item_id: null,
          items: [],
        },
        pockets_and_belt: {
          items: [],
        },
        weight_stats: profile.pocket_inventory.weight_stats,
      },
      finances: {
        coins: 0,
        bank_accounts: [],
        promissory_notes: [],
      },
      real_estate: [],
      storage_caches: [],
      vehicles_and_mounts: [],
    };
  }

  // --- API Endpoint Handlers ---
  public payRent(ownerId: string, propertyId: string, daysToPay: number): PropertyProfile {
    const profile = this.getOwnerProperty('player', ownerId);

    const property = profile.real_estate.find(r => r.property_id === propertyId);
    if (!property) {
      throw new ValidationError(`Real estate property '${propertyId}' not found`);
    }

    if (property.ownership_type !== 'rented' || !property.rent_details) {
      throw new ValidationError(`Property '${propertyId}' is not rented`);
    }

    const totalCost = property.rent_details.cost_per_day_coins * daysToPay;
    if (profile.finances.coins < totalCost) {
      throw new ValidationError(`Insufficient coins for rent. Required: ${totalCost}, available: ${profile.finances.coins}`);
    }

    profile.finances.coins -= totalCost;
    property.rent_details.paid_until_day += daysToPay;

    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }

  public transferToFromStorage(ownerId: string, storageCacheId: string, action: 'put' | 'take', itemId: string, quantity: number = 1): PropertyProfile {
    const profile = this.getOwnerProperty('player', ownerId);

    const cache = profile.storage_caches.find(c => c.cache_id === storageCacheId);
    if (!cache) {
      throw new ValidationError(`Storage cache '${storageCacheId}' not found`);
    }

    if (!cache.items) {
      cache.items = [];
    }

    if (action === 'put') {
      const backpackItem = profile.pocket_inventory.backpack.items.find(i => i.item_id === itemId);
      const pocketItem = profile.pocket_inventory.pockets_and_belt.items.find(i => i.item_id === itemId);

      if (!backpackItem && !pocketItem) {
        throw new ValidationError(`Item '${itemId}' not found in player inventory`);
      }

      if (backpackItem) {
        backpackItem.quantity -= quantity;
        if (backpackItem.quantity <= 0) {
          profile.pocket_inventory.backpack.items = profile.pocket_inventory.backpack.items.filter(i => i.item_id !== itemId);
        }
      } else if (pocketItem) {
        pocketItem.quantity -= quantity;
        if (pocketItem.quantity <= 0) {
          profile.pocket_inventory.pockets_and_belt.items = profile.pocket_inventory.pockets_and_belt.items.filter(i => i.item_id !== itemId);
        }
      }

      const cacheItem = cache.items.find(i => i.item_id === itemId);
      if (cacheItem) {
        cacheItem.quantity += quantity;
      } else {
        cache.items.push({ item_id: itemId, quantity, custom_label: null });
      }
    } else {
      const cacheItem = cache.items.find(i => i.item_id === itemId);
      if (!cacheItem || cacheItem.quantity < quantity) {
        throw new ValidationError(`Item '${itemId}' not found or insufficient quantity in storage cache`);
      }

      cacheItem.quantity -= quantity;
      if (cacheItem.quantity <= 0) {
        cache.items = cache.items.filter(i => i.item_id !== itemId);
      }

      const pockets = profile.pocket_inventory.pockets_and_belt.items;
      const existing = pockets.find(i => i.item_id === itemId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        pockets.push({ item_id: itemId, quantity: quantity, custom_label: null });
      }
    }

    this.recalculateWeightStats(profile);
    this.propertyRepo.savePropertyProfile(profile);
    return profile;
  }
}
