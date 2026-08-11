import { ItemRepository } from '../repositories/item.repository';
import { ItemInstance, ItemTemplate } from '../schemas/item.schema';

export class ItemService {
  private itemRepo: ItemRepository;

  constructor(itemRepo: ItemRepository) {
    this.itemRepo = itemRepo;
  }

  /**
   * Resolves template inheritance for an item instance.
   * If template_id exists, missing fields in item are populated from template.
   */
  public resolveItemWithTemplate(item: ItemInstance): ItemInstance {
    if (!item.template_id) return item;

    const template = this.itemRepo.getTemplate(item.template_id);
    if (!template) return item;

    return {
      ...item,
      category: item.category || template.category,
      public_profile: {
        name: item.public_profile?.name || template.public_profile.name,
        appearance: item.public_profile?.appearance || template.public_profile.appearance,
        public_description: item.public_profile?.public_description || template.public_profile.public_description,
      },
      physical_properties: {
        weight_kg: item.physical_properties?.weight_kg ?? template.physical_properties.weight_kg,
        durability: {
          current: item.physical_properties?.durability?.current ?? template.physical_properties.durability.current,
          max: item.physical_properties?.durability?.max ?? template.physical_properties.durability.max,
          state: item.physical_properties?.durability?.state || template.physical_properties.durability.state,
        },
        base_value_gold: item.physical_properties?.base_value_gold ?? template.physical_properties.base_value_gold,
      },
      special_mechanics: item.special_mechanics ?? template.special_mechanics,
    };
  }

  /**
   * Data Isolation Helper (Player UI Security)
   * Prevents leaking unrevealed secrets, hidden traps, unrevealed magic, or private profiles to player UI.
   */
  public toPublicIsolatedItem(rawItem: ItemInstance): Partial<ItemInstance> {
    const item = this.resolveItemWithTemplate(rawItem);
    const isolated: any = JSON.parse(JSON.stringify(item));

    // 1. Private profile filtering
    if (isolated.private_profile) {
      const secrets = isolated.private_profile.hidden_secrets || [];
      const discoveredSecrets = secrets.filter((s: any) => s.discovery_status === 'discovered');
      const isIdentified = isolated.private_profile.identification_status === 'identified' || isolated.private_profile.identification_status === 'partially_identified';

      if (!isIdentified && discoveredSecrets.length === 0) {
        // Strip private_profile completely if completely unidentified and no secret discovered
        isolated.private_profile = null;
      } else {
        // Only keep discovered secrets
        isolated.private_profile.hidden_secrets = discoveredSecrets;

        // Filter magical properties
        if (isolated.private_profile.magical_properties?.active_enchantments) {
          isolated.private_profile.magical_properties.active_enchantments = 
            isolated.private_profile.magical_properties.active_enchantments.filter((e: any) => e.discovery_status === 'discovered');
        }
      }
    }

    // 2. Special mechanics filtering (containers trap details)
    if (isolated.special_mechanics?.container_properties?.trap_details) {
      const trap = isolated.special_mechanics.container_properties.trap_details;
      if (trap.discovery_status === 'hidden') {
        delete isolated.special_mechanics.container_properties.trap_details;
      }
    }

    return isolated;
  }

  /**
   * Retrieves a single resolved item instance by ID.
   */
  public getItem(itemId: string): ItemInstance | null {
    const rawItem = this.itemRepo.getItem(itemId);
    if (!rawItem) return null;
    return this.resolveItemWithTemplate(rawItem);
  }

  // --- Master AI Tools ---

  /**
   * Tool 1: get_item_context({ item_ids: string[] })
   * Returns full, unisolated item objects for AI Master internal context.
   */
  public getItemContext(itemIds: string[]): ItemInstance[] {
    const rawItems = this.itemRepo.getItems(itemIds);
    return rawItems.map(item => this.resolveItemWithTemplate(item));
  }

  /**
   * Tool 2: search_items({ query?, owner_type?, owner_id?, category? })
   */
  public searchItems(filters: { query?: string | undefined; owner_type?: string | undefined; owner_id?: string | undefined; category?: string | undefined }): ItemInstance[] {
    const rawItems = this.itemRepo.searchItems({
      query: filters.query,
      ownerType: filters.owner_type,
      ownerId: filters.owner_id,
      category: filters.category,
    });
    return rawItems.map(item => this.resolveItemWithTemplate(item));
  }

  /**
   * Tool 3: create_item({ template_id?, location_context, overrides? })
   */
  public createItem(params: {
    item_id?: string | undefined;
    template_id?: string | null | undefined;
    category?: any;
    public_profile?: any;
    private_profile?: any;
    physical_properties?: any;
    special_mechanics?: any;
    location_context: any;
    overrides?: any;
  }): ItemInstance {
    let template: ItemTemplate | null = null;
    if (params.template_id) {
      template = this.itemRepo.getTemplate(params.template_id);
    }

    const itemId = params.item_id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const category = params.category || params.overrides?.category || template?.category || 'misc';
    const publicProfile = params.public_profile || params.overrides?.public_profile || template?.public_profile || {
      name: 'Невідомий предмет',
      appearance: 'Опис відсутній.',
      public_description: 'Невизначений предмет.'
    };
    const physicalProperties = params.physical_properties || params.overrides?.physical_properties || template?.physical_properties || {
      weight_kg: 1.0,
      durability: { current: 100, max: 100, state: 'intact' },
      base_value_gold: 1
    };
    const specialMechanics = params.special_mechanics || params.overrides?.special_mechanics || template?.special_mechanics || null;
    const privateProfile = params.private_profile !== undefined ? params.private_profile : (params.overrides?.private_profile || null);

    const newItem: ItemInstance = {
      item_id: itemId,
      template_id: params.template_id || null,
      category,
      public_profile: publicProfile,
      private_profile: privateProfile,
      physical_properties: physicalProperties,
      special_mechanics: specialMechanics,
      location_context: params.location_context,
    };

    this.itemRepo.saveItem(newItem);
    return this.resolveItemWithTemplate(newItem);
  }

  /**
   * Tool 4: update_item_properties(item_id, modifications)
   */
  public updateItemProperties(itemId: string, modifications: Record<string, any>): ItemInstance {
    const existing = this.itemRepo.getItem(itemId);
    if (!existing) {
      throw new Error(`Item with id '${itemId}' not found`);
    }

    const resolved = this.resolveItemWithTemplate(existing);

    // Deep merge modifications into item fields
    if (modifications.public_profile) {
      resolved.public_profile = { ...resolved.public_profile, ...modifications.public_profile };
    }
    if (modifications.private_profile !== undefined) {
      if (modifications.private_profile === null) {
        resolved.private_profile = null;
      } else if (resolved.private_profile) {
        resolved.private_profile = { ...resolved.private_profile, ...modifications.private_profile };
      } else {
        resolved.private_profile = modifications.private_profile;
      }
    }
    if (modifications.physical_properties) {
      resolved.physical_properties = { ...resolved.physical_properties, ...modifications.physical_properties };
    }
    if (modifications.special_mechanics) {
      resolved.special_mechanics = { ...resolved.special_mechanics, ...modifications.special_mechanics };
    }
    if (modifications.location_context) {
      resolved.location_context = { ...resolved.location_context, ...modifications.location_context };
    }
    if (modifications.category) {
      resolved.category = modifications.category;
    }

    this.itemRepo.saveItem(resolved);
    return resolved;
  }

  /**
   * Tool 5: reveal_item_secret(item_id, secret_id?, reveal_all?)
   */
  public revealItemSecret(itemId: string, secretId?: string, revealAll?: boolean): ItemInstance {
    const existing = this.itemRepo.getItem(itemId);
    if (!existing) {
      throw new Error(`Item with id '${itemId}' not found`);
    }

    const item = this.resolveItemWithTemplate(existing);
    if (!item.private_profile) {
      return item;
    }

    if (revealAll) {
      item.private_profile.identification_status = 'identified';
      if (item.private_profile.hidden_secrets) {
        item.private_profile.hidden_secrets.forEach(s => s.discovery_status = 'discovered');
      }
      if (item.private_profile.magical_properties?.active_enchantments) {
        item.private_profile.magical_properties.active_enchantments.forEach(e => e.discovery_status = 'discovered');
      }
    } else if (secretId && item.private_profile.hidden_secrets) {
      const secret = item.private_profile.hidden_secrets.find(s => s.secret_id === secretId);
      if (secret) {
        secret.discovery_status = 'discovered';
      }
      const allDiscovered = item.private_profile.hidden_secrets.every(s => s.discovery_status === 'discovered');
      item.private_profile.identification_status = allDiscovered ? 'identified' : 'partially_identified';
    }

    this.itemRepo.saveItem(item);
    return item;
  }

  /**
   * Tool 6: unlock_container(container_id, key_id?, force_open?)
   */
  public unlockContainer(containerId: string, keyId?: string, forceOpen?: boolean): {
    success: boolean;
    is_locked: boolean;
    trap_triggered: boolean;
    trap_details?: any;
    message: string;
    container: ItemInstance;
  } {
    const existing = this.itemRepo.getItem(containerId);
    if (!existing) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    const container = this.resolveItemWithTemplate(existing);
    const containerProps = container.special_mechanics?.container_properties;

    if (!containerProps) {
      throw new Error(`Item '${containerId}' is not a container`);
    }

    let trapTriggered = false;
    let trapDetails: any = null;

    // Check trap logic
    if (containerProps.trap_details?.has_trap && !containerProps.trap_details.is_disarmed) {
      trapTriggered = true;
      trapDetails = containerProps.trap_details;
    }

    // Check lock logic
    if (containerProps.lock_details?.is_locked) {
      const reqKey = containerProps.lock_details.key_id;
      if (forceOpen || (keyId && reqKey && keyId === reqKey)) {
        containerProps.lock_details.is_locked = false;
        this.itemRepo.saveItem(container);
        return {
          success: true,
          is_locked: false,
          trap_triggered: trapTriggered,
          trap_details: trapDetails,
          message: 'Контейнер успішно відкрито.',
          container,
        };
      } else {
        return {
          success: false,
          is_locked: true,
          trap_triggered: trapTriggered,
          trap_details: trapDetails,
          message: 'Замок не підходить або потрібен ключ.',
          container,
        };
      }
    }

    return {
      success: true,
      is_locked: false,
      trap_triggered: trapTriggered,
      trap_details: trapDetails,
      message: 'Контейнер вже відкритий.',
      container,
    };
  }

  /**
   * Tool 7: read_document(document_id, language?, decryption_skill?)
   */
  public readDocument(documentId: string, language?: string, decryptionSkill?: number): {
    can_read: boolean;
    text_content?: string;
    language: string;
    is_encrypted: boolean;
    message: string;
  } {
    const existing = this.itemRepo.getItem(documentId);
    if (!existing) {
      throw new Error(`Document with id '${documentId}' not found`);
    }

    const docItem = this.resolveItemWithTemplate(existing);
    const docProps = docItem.special_mechanics?.document_properties;

    if (!docProps) {
      throw new Error(`Item '${documentId}' is not a document`);
    }

    if (docProps.is_encrypted) {
      const skill = decryptionSkill || 0;
      if (skill < docProps.decryption_dc) {
        return {
          can_read: false,
          language: docProps.language,
          is_encrypted: true,
          message: `Документ зашифровано. Потрібна перевірка розшифровки (DC ${docProps.decryption_dc}).`,
        };
      }
    }

    return {
      can_read: true,
      text_content: docProps.text_content,
      language: docProps.language,
      is_encrypted: docProps.is_encrypted,
      message: 'Документ успішно прочитано.',
    };
  }
}
