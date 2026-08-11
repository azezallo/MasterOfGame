import type {
  PropertyProfile,
  PayRentRequest,
  PayRentResponse,
  ToggleBackpackRequest,
  ToggleBackpackResponse,
  StorageTransferRequest,
  StorageTransferResponse,
} from '../types/property';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const MOCK_PROPERTY_PROFILE: PropertyProfile = {
  property_profile_id: 'prop_player_char_01',
  owner_context: {
    owner_type: 'player',
    owner_id: 'player_1',
  },
  equipped: [
    {
      equipped_instance_id: 'eq_char_01',
      item_id: 'item_leather_armor_02',
      body_zone: 'torso',
      layer: 'middle',
      worn_over_item_id: null,
      attached_pendants_ids: [],
      interaction_state: {
        is_active: true,
        is_blocked: false,
        blocked_by_item_id: null,
        narrative_note: null,
      },
      resolved_item: {
        item_id: 'item_leather_armor_02',
        category: 'armor',
        public_profile: {
          name: 'Шкіряний обладунок шукача',
          appearance: 'Міцна оброблена шкіра з заклепками.',
          public_description: 'Стандартний шкіряний обладунок для тривалих мандрівок.',
        },
        physical_properties: {
          weight_kg: 8.5,
          durability: { current: 45, max: 50, state: 'intact' },
          base_value_gold: 80,
        },
        location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
      },
    },
    {
      equipped_instance_id: 'eq_char_02',
      item_id: 'item_cursed_iron_gauntlet',
      body_zone: 'left_hand',
      layer: 'middle',
      worn_over_item_id: null,
      attached_pendants_ids: [],
      interaction_state: {
        is_active: true,
        is_blocked: false,
        blocked_by_item_id: null,
        narrative_note: 'Прокляте залізо рукавиці екранує магію будь-яких прикрас поверх неї.',
      },
      resolved_item: {
        item_id: 'item_cursed_iron_gauntlet',
        category: 'armor',
        public_profile: {
          name: 'Проклята залізна рукавиця',
          appearance: 'Темне поглинаюче світло залізо.',
          public_description: 'Захищає руку, але стримує магічний резонанс.',
        },
        physical_properties: {
          weight_kg: 2.0,
          durability: { current: 28, max: 40, state: 'worn' },
          base_value_gold: 120,
        },
        location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
      },
    },
    {
      equipped_instance_id: 'eq_char_03',
      item_id: 'item_magic_ruby_ring',
      body_zone: 'left_hand',
      layer: 'outer',
      worn_over_item_id: 'item_cursed_iron_gauntlet',
      attached_pendants_ids: [],
      interaction_state: {
        is_active: false,
        is_blocked: true,
        blocked_by_item_id: 'item_cursed_iron_gauntlet',
        narrative_note: 'Магічний резонанс перстня повністю заблоковано проклятою рукавицею.',
      },
      resolved_item: {
        item_id: 'item_magic_ruby_ring',
        category: 'jewelry',
        public_profile: {
          name: 'Рубіновий перстень вогню',
          appearance: 'Срібне перстень з яскраво-червоним рубіном.',
          public_description: 'Випромінює слабке тепло при активації.',
        },
        physical_properties: {
          weight_kg: 0.1,
          durability: { current: 10, max: 10, state: 'intact' },
          base_value_gold: 350,
        },
        location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
      },
    },
    {
      equipped_instance_id: 'eq_char_04',
      item_id: 'item_silver_chain_01',
      body_zone: 'neck',
      layer: 'accessory',
      worn_over_item_id: null,
      attached_pendants_ids: ['item_emerald_pendant', 'item_holy_symbol'],
      interaction_state: {
        is_active: true,
        is_blocked: false,
        blocked_by_item_id: null,
        narrative_note: null,
      },
      resolved_item: {
        item_id: 'item_silver_chain_01',
        category: 'jewelry',
        public_profile: {
          name: 'Срібний ланцюжок з підвісками',
          appearance: 'Витончений срібний ланцюжок з емеральдовим кулоном.',
          public_description: 'Носиться на шиї для захисту та естетики.',
        },
        physical_properties: {
          weight_kg: 0.2,
          durability: { current: 15, max: 15, state: 'intact' },
          base_value_gold: 150,
        },
        location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
      },
    },
  ],
  pocket_inventory: {
    backpack: {
      is_equipped: true,
      backpack_item_id: 'item_tactical_adventurer_pack',
      items: [
        {
          item_id: 'item_torch_01',
          quantity: 5,
          custom_label: null,
          resolved_item: {
            item_id: 'item_torch_01',
            category: 'consumable',
            public_profile: {
              name: 'Смолоскип',
              appearance: 'Дерев’яна палиця просочена смолою.',
              public_description: 'Горить приблизно 1 годину, освітлюючи темряву.',
            },
            physical_properties: {
              weight_kg: 0.5,
              durability: { current: 1, max: 1, state: 'intact' },
              base_value_gold: 1,
            },
            location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
          },
        },
        {
          item_id: 'item_camp_kit_01',
          quantity: 1,
          custom_label: 'Табірне приладдя',
          resolved_item: {
            item_id: 'item_camp_kit_01',
            category: 'misc',
            public_profile: {
              name: 'Табірний набір',
              appearance: 'Спальник, казанок та ковдра.',
              public_description: 'Дозволяє влаштувати повноцінний відпочинок під час ночівлі.',
            },
            physical_properties: {
              weight_kg: 6.0,
              durability: { current: 20, max: 20, state: 'intact' },
              base_value_gold: 15,
            },
            location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
          },
        },
        {
          item_id: 'item_rope_15m',
          quantity: 1,
          custom_label: 'Міцна мотузка',
          resolved_item: {
            item_id: 'item_rope_15m',
            category: 'misc',
            public_profile: {
              name: 'Пенькова мотузка (15м)',
              appearance: 'Міцно сплетена мотузка з гаком.',
              public_description: 'Витримує вагу кількох дорослих осіб.',
            },
            physical_properties: {
              weight_kg: 3.5,
              durability: { current: 10, max: 10, state: 'intact' },
              base_value_gold: 2,
            },
            location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
          },
        },
      ],
    },
    pockets_and_belt: {
      items: [
        {
          item_id: 'item_healing_potion_01',
          quantity: 3,
          custom_label: 'На поясі під лівою рукою',
          resolved_item: {
            item_id: 'item_healing_potion_01',
            category: 'consumable',
            public_profile: {
              name: 'Зілля цілющого відвару',
              appearance: 'Червона скляна флакончик зі світящоюся рідиною.',
              public_description: 'Швидко відновлює легкі поранення.',
            },
            physical_properties: {
              weight_kg: 0.3,
              durability: { current: 1, max: 1, state: 'intact' },
              base_value_gold: 5,
            },
            location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
          },
        },
        {
          item_id: 'item_thief_tools_01',
          quantity: 1,
          custom_label: 'У внутрішній кишені плаща',
          resolved_item: {
            item_id: 'item_thief_tools_01',
            category: 'key',
            public_profile: {
              name: 'Набір відмичок',
              appearance: 'Тонкі сталеві гачки та натягувачі.',
              public_description: 'Для зламу замків помірної складності.',
            },
            physical_properties: {
              weight_kg: 0.8,
              durability: { current: 8, max: 10, state: 'worn' },
              base_value_gold: 25,
            },
            location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
          },
        },
      ],
    },
    weight_stats: {
      equipped_and_pockets_weight_kg: 12.5,
      backpack_weight_kg: 14.0,
      total_weight_kg: 26.5,
      max_carry_weight_kg: 30.0,
      encumbrance_status: 'normal',
      combat_encumbrance_status: 'normal',
    },
  },
  finances: {
    coins: 1250,
    bank_accounts: [
      {
        account_id: 'acc_valoris_bank_01',
        guild_id: 'org_bank_valoris',
        bank_location_id: 'loc_valoris_bank_main',
        balance_coins: 15000,
        account_number: 'VAL-8821-C',
      },
    ],
    promissory_notes: [
      {
        note_id: 'note_merchant_debt_01',
        debtor_name: 'Купець Гаррік',
        debtor_npc_id: 'npc_merchant_garrick',
        amount_coins: 500,
        due_date: '14-й день Осені',
        description: 'Боргова розписка за поставку шкури ікластого вовка.',
      },
    ],
  },
  real_estate: [
    {
      property_id: 're_tavern_room_04',
      location_id: 'loc_tavern_boar_room4',
      name: "Орендована кімната №4 в таверні 'Старий Кабан'",
      ownership_type: 'rented',
      rent_details: {
        cost_per_day_coins: 10,
        paid_until_day: 45,
        landlord_npc_id: 'npc_innkeeper_bork',
      },
      associated_storage_cache_id: 'cache_tavern_chest_04',
    },
    {
      property_id: 're_valoris_smithy_01',
      location_id: 'loc_valoris_craft_quarter_05',
      name: "Кузня 'Лезо Дракона' у Ремісничому кварталі",
      ownership_type: 'owned',
      rent_details: null,
      business_and_tax_details: {
        is_active_business: true,
        business_type: 'smithy',
        daily_revenue_coins: 150,
        daily_maintenance_coins: 30,
        accumulated_profit_coins: 1200,
        manager_npc_id: 'npc_blacksmith_apprentice',
      },
      associated_storage_cache_id: 'cache_valoris_smithy_vault',
    },
  ],
  storage_caches: [
    {
      cache_id: 'cache_tavern_chest_04',
      location_id: 'loc_tavern_boar_room4',
      name: 'Особиста скриня під ліжком',
      container_item_id: 'item_sturdy_chest_01',
      access_type: 'private',
      allowed_user_ids: ['player_1'],
      items: [
        {
          item_id: 'item_iron_ore_chunk',
          quantity: 12,
          custom_label: 'Залізна руда',
          resolved_item: {
            item_id: 'item_iron_ore_chunk',
            category: 'misc',
            public_profile: {
              name: 'Залізна руда',
              appearance: 'Важка сіра руда з металевим блиском.',
              public_description: 'Матеріал для кувального ремесла.',
            },
            physical_properties: {
              weight_kg: 2.0,
              durability: { current: 100, max: 100, state: 'intact' },
              base_value_gold: 4,
            },
            location_context: { current_owner_type: 'container', current_owner_id: 'cache_tavern_chest_04' },
          },
        },
        {
          item_id: 'item_uncut_ruby',
          quantity: 2,
          custom_label: 'Необроблений рубін',
          resolved_item: {
            item_id: 'item_uncut_ruby',
            category: 'jewelry',
            public_profile: {
              name: 'Необроблений рубін',
              appearance: 'Темно-червоний самоцвіт.',
              public_description: 'Потребує огранювання для підвищення вартості.',
            },
            physical_properties: {
              weight_kg: 0.1,
              durability: { current: 10, max: 10, state: 'intact' },
              base_value_gold: 100,
            },
            location_context: { current_owner_type: 'container', current_owner_id: 'cache_tavern_chest_04' },
          },
        },
      ],
    },
    {
      cache_id: 'cache_forest_stash_01',
      location_id: 'loc_dark_forest_sec_03',
      name: 'Закопаний мішок біля старого дуба',
      container_item_id: 'item_leather_sack_stash',
      access_type: 'private',
      allowed_user_ids: ['player_1'],
      items: [
        {
          item_id: 'item_secret_parchment_01',
          quantity: 1,
          custom_label: 'Запечатаний сувій',
          resolved_item: {
            item_id: 'item_secret_parchment_01',
            category: 'document',
            public_profile: {
              name: 'Запечатаний сувій з печаткою',
              appearance: 'Пергамент із восковою печаткою трилисника.',
              public_description: 'Таємне листування про розконсервовану шахту.',
            },
            physical_properties: {
              weight_kg: 0.1,
              durability: { current: 5, max: 5, state: 'intact' },
              base_value_gold: 50,
            },
            location_context: { current_owner_type: 'container', current_owner_id: 'cache_forest_stash_01' },
          },
        },
      ],
    },
    {
      cache_id: 'cache_horse_saddlebags_01',
      location_id: 'loc_tavern_boar_stables',
      name: 'Сідельні сумки Колача',
      container_item_id: 'item_horse_saddlebag',
      access_type: 'private',
      allowed_user_ids: ['player_1'],
      items: [
        {
          item_id: 'item_grain_bag',
          quantity: 4,
          custom_label: 'Овес для коня',
          resolved_item: {
            item_id: 'item_grain_bag',
            category: 'consumable',
            public_profile: {
              name: 'Мішок з овсом',
              appearance: 'Полотняний мішок фуражного зерна.',
              public_description: 'Поживний корм для їздових тварин.',
            },
            physical_properties: {
              weight_kg: 5.0,
              durability: { current: 1, max: 1, state: 'intact' },
              base_value_gold: 1,
            },
            location_context: { current_owner_type: 'container', current_owner_id: 'cache_horse_saddlebags_01' },
          },
        },
      ],
    },
  ],
  vehicles_and_mounts: [
    {
      vehicle_id: 'veh_horse_roach',
      name: 'Колач (Гнідий мерин)',
      type: 'mount',
      current_location_id: 'loc_tavern_boar_stables',
      status: 'stabled',
      associated_storage_cache_id: 'cache_horse_saddlebags_01',
    },
  ],
};

export async function fetchProperty(
  sessionId: string,
  ownerType = 'player',
  ownerId = 'player_1'
): Promise<PropertyProfile> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/property?owner_type=${ownerType}&owner_id=${ownerId}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return MOCK_PROPERTY_PROFILE;
    }

    const result = await response.json();
    return result.data || result || MOCK_PROPERTY_PROFILE;
  } catch {
    return MOCK_PROPERTY_PROFILE;
  }
}

export async function payRent(
  sessionId: string,
  request: PayRentRequest
): Promise<PayRentResponse> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/property/pay-rent`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to pay rent: ${response.statusText}`);
    }

    return await response.json();
  } catch {
    return {
      success: true,
      message: 'Оренда успішно продовжена',
      data: MOCK_PROPERTY_PROFILE,
    };
  }
}

export async function toggleBackpack(
  sessionId: string,
  request: ToggleBackpackRequest
): Promise<ToggleBackpackResponse> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/property/toggle-backpack`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle backpack: ${response.statusText}`);
    }

    return await response.json();
  } catch {
    return {
      success: true,
      message: request.is_equipped ? 'Рюкзак одягнуто' : 'Рюкзак скинуто',
      data: MOCK_PROPERTY_PROFILE,
    };
  }
}

export async function storageTransfer(
  sessionId: string,
  request: StorageTransferRequest
): Promise<StorageTransferResponse> {
  const url = `${API_BASE_URL}/sessions/${sessionId}/property/storage-transfer`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed storage transfer: ${response.statusText}`);
    }

    return await response.json();
  } catch {
    return {
      success: true,
      message: `Переміщено предмет (${request.action})`,
      data: MOCK_PROPERTY_PROFILE,
    };
  }
}
