import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Load .env.test if NODE_ENV is test
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
}

const BASE_DIR = process.cwd();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SAVES_DIR: process.env.SAVES_DIR || path.resolve(BASE_DIR, 'saves'),
  DATABASE_PATH: process.env.DATABASE_PATH || 'saves/users.db',
  SESSION_DURATION_SECONDS: parseInt(process.env.SESSION_DURATION_SECONDS || '3600', 10),
  PROMPTS_DIR: path.resolve(__dirname, 'prompts'),
  PRESETS_DIR: path.resolve(__dirname, 'presets'),
};

// Ensure saves directory exists
if (!fs.existsSync(CONFIG.SAVES_DIR)) {
  fs.mkdirSync(CONFIG.SAVES_DIR, { recursive: true });
}

/**
 * Loads the Master System Prompt template from configuration file.
 */
export function getMasterSystemPromptTemplate(): string {
  const filePath = path.join(CONFIG.PROMPTS_DIR, 'master_system_prompt.txt');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return `Ви — Наративний Майстер (Оповідач) у настільній рольовій грі Master of Game.
Ваша мета — вести оповідь, відігравати NPC, оцінювати логіку світу і фізику.

СУВОРІ ОБМЕЖЕННЯ:
- Ніколи не викликайте технічні JSON API-інструменти напряму.
- Якщо потрібно перевірити чи змінити стан світу, майна або показників (HP, мана, предмета), сформулюйте вказівку сабагенту у форматі:
  DELEGATE:<group>:<instruction>
  Де <group> це один із: property | world | actor.
- Коли у вас є достатньо даних, видайте фінальну художню оповідь для гравця.`;
}

/**
 * Loads starting player state preset from JSON config.
 */
export function getInitialPlayerStatePreset(): Record<string, any> {
  const filePath = path.join(CONFIG.PRESETS_DIR, 'initial_player_state.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return {
    physical_states: [],
    body_states: [],
    psychological_states: [],
    magic_stats: { current_mana: 100, mana_pool: 100, mana_flow: 5, base_regen: 10.0 },
  };
}

/**
 * Loads starting player property preset from JSON config.
 */
export function getInitialPlayerPropertyPreset(): Record<string, any> {
  const filePath = path.join(CONFIG.PRESETS_DIR, 'initial_player_property.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return {
    equipped: [],
    pocket_inventory: {
      backpack: { is_equipped: true, backpack_item_id: 'backpack_default', items: [] },
      pockets_and_belt: { items: [] },
      weight_stats: { equipped_and_pockets_weight_kg: 0, backpack_weight_kg: 0, total_weight_kg: 0, max_carry_weight_kg: 30.0 },
    },
    finances: { coins: 100, bank_accounts: [], promissory_notes: [] },
  };
}

/**
 * Loads starting world state preset from JSON config.
 */
export function getInitialWorldStatePreset(): Record<string, any> {
  const filePath = path.join(CONFIG.PRESETS_DIR, 'initial_world_state.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return {
    current_date: new Date().toISOString(),
    weather_timeline: [{ weather_type: 'clear', intensity: 20, timestamp: new Date().toISOString() }],
  };
}

/**
 * Loads starting organizations preset from JSON config.
 */
export function getInitialOrganizationsPreset(): Array<Record<string, any>> {
  const filePath = path.join(CONFIG.PRESETS_DIR, 'initial_organizations.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
}

export default CONFIG;
