export type MemoryRole = 'player' | 'master' | 'system';

export interface WorldTimeRange {
  start?: string;
  end?: string;
}

export interface SemanticMemoryRecord {
  id: number;
  session_id: string;
  turn_number: number;
  role: MemoryRole;
  content: string;
  embedding: Float32Array | number[];
  tags: string[];
  world_time: string | null;
  created_at?: string;
}

export interface CreateMemoryRecordPayload {
  session_id: string;
  turn_number: number;
  role: MemoryRole;
  content: string;
  tags?: string[];
  world_time?: string | null;
}

export interface SearchMemoryQueryPayload {
  session_id: string;
  query: string;
  tags_filter?: string[];
  role_filter?: MemoryRole;
  world_time_range?: WorldTimeRange;
  limit?: number;
}

export interface SearchMemoryResult {
  turn: number;
  world_time: string | null;
  role: MemoryRole;
  content: string;
  score?: number;
}
