import { z } from 'zod';

export type SubagentGroup = 'property' | 'world' | 'actor';

export type TurnStage =
  | 'idle'
  | 'pre_fetch'
  | 'master_eval'
  | 'subagent'
  | 'master_gen'
  | 'narrative'
  | 'completed'
  | 'error';

export interface SSEStatusData {
  stage: TurnStage;
  subagent?: SubagentGroup;
  message: string;
}

export interface SSEChunkData {
  delta: string;
}

export interface SSEDoneData {
  turnId: string;
  shortLog: string;
}

export interface SSEErrorData {
  message: string;
}

export type SSEEvent =
  | { event: 'status'; data: SSEStatusData }
  | { event: 'chunk'; data: SSEChunkData }
  | { event: 'done'; data: SSEDoneData }
  | { event: 'error'; data: SSEErrorData };

export interface StreamTurnPayload {
  sessionId: string;
  actionText: string;
}

export interface CompressContextPayload {
  sessionId: string;
}

export interface CompressContextResponse {
  success: boolean;
  summary: string;
  compressedLogsCount: number;
}

export const streamTurnPayloadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  actionText: z.string().min(1, 'Action text is required'),
});

export const compressContextPayloadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const compressContextResponseSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  compressedLogsCount: z.number().int().nonnegative(),
});

export interface TurnState {
  isStreaming: boolean;
  stage: TurnStage;
  subagent: SubagentGroup | null;
  statusMessage: string | null;
  narrativeText: string;
  turnId: string | null;
  shortLog: string | null;
  error: string | null;
  isCompressing: boolean;
  lastSummary: string | null;
  compressedLogsCount: number | null;
  compressionError: string | null;
}
