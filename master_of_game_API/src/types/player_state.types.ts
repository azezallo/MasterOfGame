export interface StateItem {
  name: string;
  timestamp: string; // ISO 8601 string
}

export interface PlayerAttributes {
  strength: number;
  agility: number;
  endurance: number;
  perception: number;
  willpower: number;
}

export interface DerivedStats {
  max_carry_weight_kg: number;
}

export interface MagicStats {
  mana_pool: number;
  current_mana: number;
  mana_flow: number;
  base_regen: number;
}

export interface SkillEntry {
  name: string;
  value: number;
}

export type PlayerSkills = SkillEntry[];

export interface PlayerStateProfile {
  physical_states: StateItem[];
  body_states: StateItem[];
  psychological_states: StateItem[];
  attributes: PlayerAttributes;
  derived_stats: DerivedStats;
  magic_stats: MagicStats;
  skills: PlayerSkills;
}

export interface UpdatePlayerStateInput {
  add_physical_states?: string[];
  remove_physical_states?: string[];
  add_body_states?: string[];
  remove_body_states?: string[];
  add_psychological_states?: string[];
  remove_psychological_states?: string[];
  mana_delta?: number;
  mana_percent?: number;
  update_attributes?: Partial<PlayerAttributes>;
  update_skills?: SkillEntry[] | Record<string, number>;
  skill_name?: string;
  skill_value?: number;
  skill_delta?: number;
  update_magic_stats?: Partial<MagicStats>;
}
