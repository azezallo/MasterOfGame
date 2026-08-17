import { SemanticMemoryRepository } from '../repositories/semantic_memory.repository';
import { EmbeddingService } from './embedding.service';
import {
  CreateMemoryRecordPayload,
  SearchMemoryQueryPayload,
  SearchMemoryResult,
  SemanticMemoryRecord,
} from '../types/semantic_memory.types';

export class SemanticMemoryService {
  private repository: SemanticMemoryRepository;
  private embeddingService: EmbeddingService;

  constructor(repository: SemanticMemoryRepository, embeddingService?: EmbeddingService) {
    this.repository = repository;
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Indexes a new memory record, vectorizing its content and storing it into SQLite.
   */
  public indexRecord(payload: CreateMemoryRecordPayload): SemanticMemoryRecord {
    const embedding = this.embeddingService.generateEmbedding(payload.content);

    return this.repository.insertRecord({
      session_id: payload.session_id,
      turn_number: payload.turn_number,
      role: payload.role,
      content: payload.content,
      embedding,
      tags: payload.tags || [],
      world_time: payload.world_time || null,
    });
  }

  /**
   * Searches memory using vector similarity and specified filters.
   * Hard-capped at 3 results as per F017 spec.
   */
  public searchMemory(payload: SearchMemoryQueryPayload): SearchMemoryResult[] {
    const queryVector = this.embeddingService.generateEmbedding(payload.query);
    const requestedLimit = payload.limit ?? 3;
    const effectiveLimit = Math.min(requestedLimit, 3); // Hard cap at 3 to prevent LLM context overflow

    const options: any = { limit: effectiveLimit };
    if (payload.tags_filter !== undefined) options.tagsFilter = payload.tags_filter;
    if (payload.role_filter !== undefined) options.roleFilter = payload.role_filter;
    if (payload.world_time_range !== undefined) options.worldTimeRange = payload.world_time_range;

    const matches = this.repository.searchByVector(payload.session_id, queryVector, options);

    return matches.map(match => ({
      turn: match.turn_number,
      world_time: match.world_time,
      role: match.role,
      content: match.content,
      score: match.score,
    }));
  }

  /**
   * Pre-fetches top relevant long-term memory context to inject into Master system prompt.
   */
  public preFetchContext(sessionId: string, currentQuery: string, limit: number = 3): SearchMemoryResult[] {
    return this.searchMemory({
      session_id: sessionId,
      query: currentQuery,
      limit,
    });
  }
}
