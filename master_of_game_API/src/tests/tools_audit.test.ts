import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseRepository } from '../persistence/database_repository';
import { SubagentOrchestratorService } from '../services/agentic_loop/subagent_orchestrator.service';
import { CONFIG } from '../config';

describe('Comprehensive Subagent Tools Audit Test Suite', () => {
  let repo: DatabaseRepository;
  const testPlayerId = 'test_player_tools_audit';
  const testSessionId = 'sess_tools_audit_123';
  const testDbPath = path.resolve(CONFIG.SAVES_DIR, testPlayerId, `${testSessionId}.db`);

  beforeEach(async () => {
    const saveDir = path.resolve(CONFIG.SAVES_DIR, testPlayerId);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    repo = new DatabaseRepository();
    await repo.initializeDB(testPlayerId, testSessionId);
  });

  afterEach(() => {
    repo.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('1. create_or_update_npc: should update existing NPC without creating duplicate records', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    // Turn 1: Create NPC
    const createRes = await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', {
      name: 'Торговець Гриць',
      role: 'trader',
    });
    expect(createRes.success).toBe(true);

    const npcRepo = repo.getNpcRepository();
    const initialNpcs = npcRepo.search('Торговець Гриць');
    expect(initialNpcs.length).toBe(1);
    expect(initialNpcs[0].public_profile.role).toBe('trader');

    // Turn 2: Update same NPC
    const updateRes = await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', {
      name: 'Торговець Гриць',
      status: 'wounded',
    });
    expect(updateRes.success).toBe(true);

    const updatedNpcs = npcRepo.search('Торговець Гриць');
    expect(updatedNpcs.length).toBe(1); // STILL 1 NPC, NO DUPLICATE!
    expect(updatedNpcs[0].status).toBe('wounded');
  });

  it('2. update_property_finances_and_items: should remove items from inventory when remove_item_name is called', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    // Add item
    await (orchestrator as any).dispatchToolCall(testSessionId, 'update_property_finances_and_items', {
      add_item_name: 'Магічний факел',
    });

    const propertyRepo = repo.getPropertyRepository();
    let profile = propertyRepo.getPropertyProfile('player', testSessionId);
    expect(profile.pocket_inventory.pockets_and_belt.items.length).toBe(1);

    // Remove item
    await (orchestrator as any).dispatchToolCall(testSessionId, 'update_property_finances_and_items', {
      remove_item_name: 'Магічний факел',
    });

    profile = propertyRepo.getPropertyProfile('player', testSessionId);
    expect(profile.pocket_inventory.pockets_and_belt.items.length).toBe(0);
  });

  it('3. update_player_state: should update skill levels and attributes correctly', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    const res = await (orchestrator as any).dispatchToolCall(testSessionId, 'update_player_state', {
      skill_name: 'Магія вогню',
      skill_value: 60,
    });
    expect(res.success).toBe(true);

    const playerRepo = repo.getPlayerStateRepository();
    const playerState = playerRepo.getPlayerState(testSessionId);
    const fireMagic = playerState.skills.find(s => s.name === 'Магія вогню');
    expect(fireMagic?.value).toBe(60);
  });

  it('4. get_npc_dossier: should inspect NPC dossier correctly', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', {
      name: 'Торговець Гриць',
      role: 'trader',
    });

    const dossierRes = await (orchestrator as any).dispatchToolCall(testSessionId, 'get_npc_dossier', {
      name: 'Гриць',
    });
    expect(dossierRes.success).toBe(true);
    expect(dossierRes.message).toContain('Торговець Гриць');
  });

  it('5. update_organization_reputation: should update player reputation with organization', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    const orgRes = await (orchestrator as any).dispatchToolCall(testSessionId, 'update_organization_reputation', {
      organization_id: 'org_city_guard',
      reputation_delta: 25,
      description: 'Допомога у затриманні контрабандиста',
    });
    expect(orgRes.success).toBe(true);
    expect(orgRes.data.organization_id).toBe('org_city_guard');
  });

  it('6. create_or_update_npc & update_npc_secret: should save secrets into hidden_memory.secrets array', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    // Create NPC without secrets (secrets are handled exclusively via update_npc_secret)
    const res = await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', {
      name: 'Коваль Гриць',
      relationship_to_player: 'friendly',
    });
    expect(res.success).toBe(true);

    const npcRepo = repo.getNpcRepository();
    const npcs = npcRepo.search('Коваль Гриць');
    expect(npcs.length).toBe(1);

    const npc = npcs[0];
    expect(npc.knowledge.hidden_memory.secrets.length).toBe(0);
    expect(npc.private_profile.current_status.relationship_to_player).toBe('friendly');

    // Add first secret via dedicated tool update_npc_secret
    const secRes1 = await (orchestrator as any).dispatchToolCall(testSessionId, 'update_npc_secret', {
      name: 'Коваль Гриць',
      action: 'add',
      secret_description: 'Колишній фальшивомонетник з підпільної майстерні',
      discovery_status: 'hidden',
    });
    expect(secRes1.success).toBe(true);

    // Add second secret via dedicated tool update_npc_secret
    const secRes2 = await (orchestrator as any).dispatchToolCall(testSessionId, 'update_npc_secret', {
      name: 'Коваль Гриць',
      action: 'add',
      secret_description: 'Ховає під горном фальшиву печатку барона',
    });
    expect(secRes2.success).toBe(true);

    const updatedNpc = npcRepo.search('Коваль Гриць')[0];
    expect(updatedNpc.knowledge.hidden_memory.secrets.length).toBe(2);
    expect(updatedNpc.knowledge.hidden_memory.secrets[0].description).toBe('Колишній фальшивомонетник з підпільної майстерні');
    expect(updatedNpc.knowledge.hidden_memory.secrets[1].description).toBe('Ховає під горном фальшиву печатку барона');
  });

  it('7. update_npc_relationship: should update player relationship and inter-NPC relationships', async () => {
    const orchestrator = new SubagentOrchestratorService(repo);

    // Create NPC 1 and NPC 2
    await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', { name: 'Староста Степан' });
    await (orchestrator as any).dispatchToolCall(testSessionId, 'create_or_update_npc', { name: 'Стражник Петро' });

    // Update relationship between Stepan and Petro
    const relRes = await (orchestrator as any).dispatchToolCall(testSessionId, 'update_npc_relationship', {
      name: 'Староста Степан',
      target_name: 'Стражник Петро',
      relationship_type: 'ally',
      strength: 0.8,
      summary: 'Таємні союзники у сільській раді',
      relationship_to_player: 'suspicious',
    });
    expect(relRes.success).toBe(true);

    const npcRepo = repo.getNpcRepository();
    const stepan = npcRepo.search('Староста Степан')[0];
    expect(stepan.private_profile.current_status.relationship_to_player).toBe('suspicious');
    expect(stepan.relationships.length).toBe(1);
    expect(stepan.relationships[0].relationship_type).toBe('ally');
    expect(stepan.relationships[0].summary).toBe('Таємні союзники у сільській раді');
  });
});
