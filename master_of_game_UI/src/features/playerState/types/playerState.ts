export interface StateItem {
  name: string;
  timestamp: string;
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
  base_regen?: number;
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

export interface ManaNarrativeInfo {
  tier: 'full' | 'normal' | 'fatigued' | 'critical';
  title: string;
  description: string;
  percentage: number;
}

export function getManaNarrative(current: number, pool: number, t?: (key: string, options?: any) => string): ManaNarrativeInfo {
  const percentage = pool > 0 ? Math.round((current / pool) * 100) : 0;
  const tr = t || ((k: string, defaultValue?: string) => defaultValue || k);

  if (percentage >= 80) {
    return {
      tier: 'full',
      title: tr('player_state.mana.tiers.full_title', 'Повний резерв'),
      description: tr('player_state.mana.tiers.full_desc', 'Енергія б’є через край'),
      percentage,
    };
  } else if (percentage >= 40) {
    return {
      tier: 'normal',
      title: tr('player_state.mana.tiers.normal_title', 'Часткова витрата'),
      description: tr('player_state.mana.tiers.normal_desc', 'Нормальний робочий стан'),
      percentage,
    };
  } else if (percentage >= 15) {
    return {
      tier: 'fatigued',
      title: tr('player_state.mana.tiers.fatigued_title', 'Виснаження'),
      description: tr('player_state.mana.tiers.fatigued_desc', 'Відчутна втома від магії, важко концентруватися'),
      percentage,
    };
  } else {
    return {
      tier: 'critical',
      title: tr('player_state.mana.tiers.critical_title', 'Критичне виснаження'),
      description: tr('player_state.mana.tiers.critical_desc', 'Магічний резерв порожній, спроби касту небезпечні'),
      percentage,
    };
  }
}

export interface SkillNarrativeInfo {
  tier: 'grandmaster' | 'master' | 'practiced' | 'apprentice' | 'novice';
  title: string;
}

export function getSkillNarrative(level: number, t?: (key: string, options?: any) => string): SkillNarrativeInfo {
  const tr = t || ((k: string, defaultValue?: string) => defaultValue || k);
  if (level >= 80) {
    return { tier: 'grandmaster', title: tr('player_state.skill_tiers.grandmaster', 'Грандмайстер') };
  } else if (level >= 60) {
    return { tier: 'master', title: tr('player_state.skill_tiers.master', 'Майстер') };
  } else if (level >= 40) {
    return { tier: 'practiced', title: tr('player_state.skill_tiers.practiced', 'Практик') };
  } else if (level >= 20) {
    return { tier: 'apprentice', title: tr('player_state.skill_tiers.apprentice', 'Учень') };
  } else {
    return { tier: 'novice', title: tr('player_state.skill_tiers.novice', 'Початківець') };
  }
}
