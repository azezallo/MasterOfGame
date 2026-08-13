import { z } from 'zod';

export type NpcLifecycleStatus = 'alive' | 'wounded' | 'dead' | 'coma' | 'missing' | 'captured' | 'archived';

export interface NpcPublicProfile {
  name: string;
  role: string;
  appearance?: string;
  public_description?: string;
}

export interface NpcPrivateProfile {
  traits?: {
    moral_alignment?: string;
    resilience?: string;
    social_style?: string;
  };
  drivers?: {
    primary_goals?: string[];
    critical_fears?: string[];
  };
  attachments?: {
    family_loyalty?: string;
    organization_loyalty?: string;
    core_values?: string;
  };
  current_status?: {
    mood?: string;
    relationship_to_player?: string;
    current_goal?: string;
  };
}

export interface NpcSecret {
  secret_id: string;
  description: string;
  source?: 'witnessed' | 'heard' | 'innate';
  discovery_status: 'hidden' | 'discovered_by_player' | 'revealed_to_all';
}

export interface NpcEvent {
  timestamp: number;
  event_description: string;
  source_type: 'direct_interaction' | 'observation' | 'world_event';
}

export interface NpcKnowledge {
  world_perception?: {
    description?: string;
    dynamic_updates?: Array<{
      timestamp: number;
      trigger: string;
      update_text: string;
    }>;
  };
  hidden_memory?: {
    events?: NpcEvent[];
    memory_summary?: string;
    secrets?: NpcSecret[];
  };
  subjective_thoughts?: {
    player_evaluation?: string;
    topics_discussed?: string[];
    mood_impact?: string;
  };
  player_notes?: {
    content: string;
    last_updated: number;
  };
}

export interface NpcRelationship {
  target_npc_id: string;
  target_npc_name?: string;
  relationship_type: string;
  strength: number; // -1.0 to 1.0
  summary: string;
  last_updated?: number;
}

export interface NpcOrganization {
  organization_id: string;
  organization_name?: string;
  rank_id?: string | null;
  reputation?: number; // -100 to 100
  interactions?: Array<{
    timestamp: string;
    description: string;
    reputation_change: number;
  }>;
}

export interface NpcRoutineItem {
  time_window: string;
  location_id: string;
  activity: string;
}

export interface NpcSpatialPresence {
  current_location_id?: string;
  default_routine?: NpcRoutineItem[];
  override_event?: string | null;
}

export interface NpcData {
  npc_id: string;
  status: NpcLifecycleStatus;
  is_recently_active?: boolean;
  last_active_at?: number;
  public_profile: NpcPublicProfile;
  private_profile?: NpcPrivateProfile;
  knowledge?: NpcKnowledge;
  relationships?: NpcRelationship[];
  organizations?: NpcOrganization[];
  spatial_presence?: NpcSpatialPresence;
}

export interface NpcSummary {
  npc_id: string;
  status: NpcLifecycleStatus;
  name: string;
  role: string;
  is_recently_active?: boolean;
  last_active_at?: number;
}

export interface FetchNpcsParams {
  status?: NpcLifecycleStatus | 'all';
  query?: string;
  locationId?: string;
  activeOnly?: boolean;
}

export const updatePlayerNotesSchema = z.object({
  notes: z.string(),
});

export type UpdatePlayerNotesFormData = z.infer<typeof updatePlayerNotesSchema>;
