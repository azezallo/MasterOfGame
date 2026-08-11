import { v4 as uuidv4 } from 'uuid';
import { NpcRepository } from '../repositories/npc.repository';
import {
  NpcData,
  NpcLifecycleStatus,
  NpcContextMode,
  PublicIsolatedNpc,
  CreateNpcInput,
  UpdateNpcPublicProfileInput,
  UpdateNpcStatusInput,
  UpdateNpcLocationInput,
  UpdateNpcRelationshipInput,
  UpdateNpcOrganizationInput,
  AddNpcSecretInput,
  UpdateSubjectiveThoughtsInput,
  SearchNpcsFilter
} from '../types/npc.types';
import { NpcSchema } from '../schemas/npc.schema';
import { AppError } from '../errors/app.errors';

export class NpcService {
  constructor(private npcRepo: NpcRepository) {}

  // Tool 1: createNpc
  public createNpc(input: CreateNpcInput): NpcData {
    const npcId = input.npc_id || uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const fullNpcData: NpcData = NpcSchema.parse({
      npc_id: npcId,
      status: input.status || 'alive',
      public_profile: input.public_profile,
      private_profile: input.private_profile ? {
        traits: { moral_alignment: '', resilience: '', social_style: '', ...input.private_profile.traits },
        drivers: { primary_goals: [], critical_fears: [], ...input.private_profile.drivers },
        attachments: { family_loyalty: '', organization_loyalty: '', core_values: '', ...input.private_profile.attachments },
        current_status: { mood: 'calm', relationship_to_player: 'neutral', current_goal: '', ...input.private_profile.current_status },
      } : undefined,
      spatial_presence: {
        current_location_id: input.location_id || '',
        default_routine: [],
        override_event: null,
      },
      created_at: now,
      updated_at: now,
    });

    this.npcRepo.save(fullNpcData);
    return fullNpcData;
  }

  // Tool 2: getNpcContext
  public getNpcContext(npcId: string, mode: NpcContextMode): Partial<NpcData> {
    const npc = this.getNpcOrThrow(npcId);

    switch (mode) {
      case 'DIALOG':
        return {
          npc_id: npc.npc_id,
          status: npc.status,
          public_profile: npc.public_profile,
          private_profile: npc.private_profile,
          knowledge: {
            ...npc.knowledge,
            hidden_memory: { events: [], memory_summary: npc.knowledge.hidden_memory.memory_summary, secrets: [] },
          },
          relationships: npc.relationships.filter(rel => Math.abs(rel.strength) > 0.5),
        };

      case 'ACTION':
        return {
          npc_id: npc.npc_id,
          status: npc.status,
          public_profile: npc.public_profile,
          private_profile: {
            traits: npc.private_profile.traits,
            drivers: npc.private_profile.drivers,
            attachments: npc.private_profile.attachments,
            current_status: npc.private_profile.current_status,
          },
          spatial_presence: npc.spatial_presence,
          relationships: npc.relationships.filter(rel =>
            ['Family', 'Secret_Associate', 'Enemy', 'Ally'].includes(rel.relationship_type) || Math.abs(rel.strength) >= 0.7
          ),
        };

      case 'INVESTIGATION':
        return {
          npc_id: npc.npc_id,
          status: npc.status,
          public_profile: npc.public_profile,
          private_profile: npc.private_profile,
          knowledge: {
            world_perception: npc.knowledge.world_perception,
            hidden_memory: npc.knowledge.hidden_memory,
            subjective_thoughts: npc.knowledge.subjective_thoughts,
            player_notes: npc.knowledge.player_notes,
          },
          relationships: npc.relationships,
          organizations: npc.organizations,
        };

      default:
        return npc;
    }
  }

  public getNpc(npcId: string): NpcData | null {
    return this.npcRepo.findById(npcId);
  }

  // Tool 3: searchNpcs
  public searchNpcs(query?: string, filter?: SearchNpcsFilter): NpcData[] {
    return this.npcRepo.search(query, filter);
  }

  // Tool 4: updateNpcPublicProfile
  public updateNpcPublicProfile(npcId: string, updates: UpdateNpcPublicProfileInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    if (updates.name !== undefined) npc.public_profile.name = updates.name;
    if (updates.role !== undefined) npc.public_profile.role = updates.role;
    if (updates.appearance !== undefined) npc.public_profile.appearance = updates.appearance;
    if (updates.public_description !== undefined) npc.public_profile.public_description = updates.public_description;
    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 5: updateNpcStatus
  public updateNpcStatus(npcId: string, updates: UpdateNpcStatusInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    if (updates.mood !== undefined) npc.private_profile.current_status.mood = updates.mood;
    if (updates.relationship_to_player !== undefined) npc.private_profile.current_status.relationship_to_player = updates.relationship_to_player;
    if (updates.current_goal !== undefined) npc.private_profile.current_status.current_goal = updates.current_goal;
    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 6: updateNpcLocation
  public updateNpcLocation(npcId: string, updates: UpdateNpcLocationInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    if (updates.current_location_id !== undefined) npc.spatial_presence.current_location_id = updates.current_location_id;
    if (updates.override_event !== undefined) npc.spatial_presence.override_event = updates.override_event;
    if (updates.default_routine !== undefined) npc.spatial_presence.default_routine = updates.default_routine;
    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 7: updateNpcRelationship
  public updateNpcRelationship(npcId: string, updates: UpdateNpcRelationshipInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const now = Math.floor(Date.now() / 1000);
    const existing = npc.relationships.find(r => r.target_npc_id === updates.target_id);

    if (existing) {
      const newStrength = Math.max(-1.0, Math.min(1.0, existing.strength + (updates.strength_delta || 0)));
      existing.relationship_type = updates.relationship_type || existing.relationship_type;
      existing.strength = newStrength;
      existing.summary = updates.summary || existing.summary;
      existing.last_updated = now;
    } else {
      npc.relationships.push({
        target_npc_id: updates.target_id,
        relationship_type: updates.relationship_type || 'Acquaintance',
        strength: Math.max(-1.0, Math.min(1.0, updates.strength_delta || 0)),
        summary: updates.summary || '',
        last_updated: now,
      });
    }

    npc.updated_at = now;
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 8: updateNpcOrganizationAffiliation
  public updateNpcOrganizationAffiliation(npcId: string, updates: UpdateNpcOrganizationInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    let org = npc.organizations.find(o => o.organization_id === updates.organization_id);

    if (!org) {
      org = {
        organization_id: updates.organization_id,
        rank_id: null,
        reputation: 0,
        interactions: [],
      };
      npc.organizations.push(org);
    }

    if (updates.rank_id !== undefined) org.rank_id = updates.rank_id;
    if (updates.reputation_delta !== undefined) org.reputation = Math.max(-100, Math.min(100, org.reputation + updates.reputation_delta));
    if (updates.interaction_event) {
      org.interactions.push({
        timestamp: new Date().toISOString(),
        description: updates.interaction_event.description,
        reputation_change: updates.interaction_event.reputation_change,
      });
    }

    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 9: addNpcSecret
  public addNpcSecret(npcId: string, secretInput: AddNpcSecretInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const secrets = npc.knowledge.hidden_memory.secrets;
    const idx = secrets.findIndex(s => s.secret_id === secretInput.secret_id);

    const newSecret = {
      secret_id: secretInput.secret_id,
      description: secretInput.description,
      source: secretInput.source || 'witnessed',
      discovery_status: secretInput.discovery_status || 'hidden',
    };

    if (idx >= 0) secrets[idx] = newSecret;
    else secrets.push(newSecret);

    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 10: revealNpcSecret
  public revealNpcSecret(npcId: string, secretId: string): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const secret = npc.knowledge.hidden_memory.secrets.find(s => s.secret_id === secretId);

    if (!secret) throw new AppError(`Secret '${secretId}' not found for NPC '${npcId}'`, 404);

    secret.discovery_status = 'discovered_by_player';

    if (!npc.public_profile.public_description.includes(secret.description)) {
      npc.public_profile.public_description += ` (Відомо: ${secret.description})`;
    }

    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 11: addNpcMemoryEvent
  public addNpcMemoryEvent(npcId: string, eventDescription: string, sourceType: string = 'direct_interaction'): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const now = Math.floor(Date.now() / 1000);

    npc.knowledge.hidden_memory.events.push({
      timestamp: now,
      event_description: eventDescription,
      source_type: sourceType,
    });

    if (npc.knowledge.hidden_memory.events.length > 10) {
      const oldEvents = npc.knowledge.hidden_memory.events.splice(0, 5);
      const summaryAddition = oldEvents.map(e => e.event_description).join('; ');
      npc.knowledge.hidden_memory.memory_summary += (npc.knowledge.hidden_memory.memory_summary ? ' ' : '') + summaryAddition;
    }

    npc.updated_at = now;
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 12: updateNpcSubjectiveThoughts
  public updateNpcSubjectiveThoughts(npcId: string, updates: UpdateSubjectiveThoughtsInput): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const st = npc.knowledge.subjective_thoughts;

    if (updates.player_evaluation !== undefined) st.player_evaluation = updates.player_evaluation;
    if (updates.topics_discussed_add && updates.topics_discussed_add.length > 0) {
      const set = new Set([...st.topics_discussed, ...updates.topics_discussed_add]);
      st.topics_discussed = Array.from(set);
    }
    if (updates.mood_impact !== undefined) st.mood_impact = updates.mood_impact;

    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  // Tool 13: overwriteNpcProfile
  public overwriteNpcProfile(npcId: string, fullNpcData: NpcData): NpcData {
    const validatedData = NpcSchema.parse({
      ...fullNpcData,
      npc_id: npcId,
      updated_at: Math.floor(Date.now() / 1000),
    });

    this.npcRepo.save(validatedData);
    return validatedData;
  }

  // Tool 14: updateNpcLifecycleStatus & archiveNpc
  public updateNpcLifecycleStatus(npcId: string, status: NpcLifecycleStatus, reason?: string): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    npc.status = status;

    if (reason) {
      this.addNpcMemoryEvent(npcId, `Status changed to ${status}: ${reason}`, 'world_event');
    }

    npc.updated_at = Math.floor(Date.now() / 1000);
    this.npcRepo.save(npc);
    return npc;
  }

  public archiveNpc(npcId: string, reason?: string): NpcData {
    return this.updateNpcLifecycleStatus(npcId, 'archived', reason || 'Archived by Master');
  }

  // Tool 15: updatePlayerNotes
  public updatePlayerNotes(npcId: string, content: string): NpcData {
    const npc = this.getNpcOrThrow(npcId);
    const now = Math.floor(Date.now() / 1000);

    npc.knowledge.player_notes = { content, last_updated: now };
    npc.updated_at = now;
    this.npcRepo.save(npc);
    return npc;
  }

  // Data Isolation Transformer for Player UI
  public toPublicIsolatedNpc(npc: NpcData): PublicIsolatedNpc {
    const revealedSecrets = npc.knowledge.hidden_memory.secrets.filter(
      s => s.discovery_status !== 'hidden'
    );

    const isolated: PublicIsolatedNpc = {
      npc_id: npc.npc_id,
      status: npc.status,
      public_profile: npc.public_profile,
      knowledge: {
        player_notes: npc.knowledge.player_notes,
        revealed_secrets: revealedSecrets,
      },
      relationships: npc.relationships,
      organizations: npc.organizations,
      spatial_presence: npc.spatial_presence,
    };
    if (npc.created_at !== undefined) isolated.created_at = npc.created_at;
    if (npc.updated_at !== undefined) isolated.updated_at = npc.updated_at;
    return isolated;
  }

  private getNpcOrThrow(npcId: string): NpcData {
    const npc = this.npcRepo.findById(npcId);
    if (!npc) {
      throw new AppError(`NPC with ID '${npcId}' not found`, 404);
    }
    return npc;
  }
}
