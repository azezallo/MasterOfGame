import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SemanticMemoryRepository } from '../repositories/semantic_memory.repository';
import { SemanticMemoryService } from '../services/semantic_memory.service';
import { EmbeddingService } from '../services/embedding.service';

describe('SemanticMemoryRepository & Service (F017)', () => {
  let db: Database.Database;
  let repo: SemanticMemoryRepository;
  let service: SemanticMemoryService;
  let embeddingService: EmbeddingService;
  const testDbPath = path.resolve(__dirname, 'test_semantic_memory.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
    embeddingService = new EmbeddingService();
    repo = new SemanticMemoryRepository(db, embeddingService);
    service = new SemanticMemoryService(repo, embeddingService);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should index a memory record and retrieve it with Float32Array embedding', () => {
    const record = service.indexRecord({
      session_id: 'session_1',
      turn_number: 10,
      role: 'player',
      content: 'Я ховаю медальйон під старим дубом біля печери.',
      tags: ['location:cave', 'item:medallion'],
      world_time: '1284-05-12T14:00:00.000Z',
    });

    expect(record.id).toBeDefined();
    expect(record.session_id).toBe('session_1');
    expect(record.role).toBe('player');
    expect(record.embedding).toBeInstanceOf(Float32Array);
    expect(record.embedding.length).toBe(384);
  });

  it('should perform vector search and return top relevant results capped at limit 3', () => {
    service.indexRecord({
      session_id: 'session_1',
      turn_number: 1,
      role: 'player',
      content: 'Я купую яблуко на таверновому ринку.',
      tags: ['location:market'],
    });

    service.indexRecord({
      session_id: 'session_1',
      turn_number: 2,
      role: 'player',
      content: 'Де захований таємний медальйон з драконячою печаткою?',
      tags: ['item:medallion'],
    });

    service.indexRecord({
      session_id: 'session_1',
      turn_number: 3,
      role: 'system',
      content: 'Предмет Медальйон заховано під дубом біля печери.',
      tags: ['item:medallion', 'location:cave'],
    });

    service.indexRecord({
      session_id: 'session_1',
      turn_number: 4,
      role: 'master',
      content: 'Погода у місті сонячна і тепла.',
      tags: ['weather'],
    });

    const results = service.searchMemory({
      session_id: 'session_1',
      query: 'Де знаходиться медальйон в печері?',
      limit: 5, // Capped at 3
    });

    expect(results.length).toBeLessThanOrEqual(3);
    expect(results[0].content).toContain('Медальйон');
  });

  it('should filter by role_filter, tags_filter, and world_time_range', () => {
    service.indexRecord({
      session_id: 'sess_filter',
      turn_number: 5,
      role: 'player',
      content: 'Гравець каже про золотий ключ у вежі.',
      tags: ['location:tower', 'item:key'],
      world_time: '1284-05-10T10:00:00.000Z',
    });

    service.indexRecord({
      session_id: 'sess_filter',
      turn_number: 6,
      role: 'system',
      content: 'Система: ключ знайдено у вежі.',
      tags: ['location:tower', 'item:key'],
      world_time: '1284-05-12T10:00:00.000Z',
    });

    service.indexRecord({
      session_id: 'sess_filter',
      turn_number: 7,
      role: 'player',
      content: 'Гравець знайшов книгу в бібліотеці.',
      tags: ['location:library'],
      world_time: '1284-05-15T10:00:00.000Z',
    });

    // Role Filter
    const playerOnly = service.searchMemory({
      session_id: 'sess_filter',
      query: 'ключ у вежі',
      role_filter: 'player',
    });
    expect(playerOnly.every(r => r.role === 'player')).toBe(true);

    // Tags Filter
    const libraryOnly = service.searchMemory({
      session_id: 'sess_filter',
      query: 'знайдена річ',
      tags_filter: ['location:library'],
    });
    expect(libraryOnly.length).toBe(1);
    expect(libraryOnly[0].content).toContain('бібліотеці');

    // World Time Range Filter
    const rangeResults = service.searchMemory({
      session_id: 'sess_filter',
      query: 'ключ книга',
      world_time_range: {
        start: '1284-05-11T00:00:00.000Z',
        end: '1284-05-13T00:00:00.000Z',
      },
    });
    expect(rangeResults.length).toBe(1);
    expect(rangeResults[0].turn).toBe(6);
  });

  it('should support preFetchContext for Master prompt injection', () => {
    service.indexRecord({
      session_id: 'sess_prefetch',
      turn_number: 1,
      role: 'player',
      content: 'Я дав обітницю ордену Срібного Лиса.',
      tags: ['org:silver_fox'],
    });

    const context = service.preFetchContext('sess_prefetch', 'Орден Срібного Лиса', 3);
    expect(context.length).toBe(1);
    expect(context[0].content).toBe('Я дав обітницю ордену Срібного Лиса.');
  });
});
