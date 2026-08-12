import { z } from 'zod';

export type SubagentGroup = 'property' | 'world' | 'actor';

export type TurnStage = 'pre_fetch' | 'master_eval' | 'subagent' | 'master_gen' | 'finalize';

export interface ShortLog {
  id?: number;
  turn_number: number;
  content: string;
  is_compressed?: boolean;
  created_at?: string;
}

export interface SessionSummary {
  id?: number;
  summary_text: string;
  compressed_until_turn: number;
  created_at?: string;
}

export interface LongContextMessage {
  id?: number;
  turn_number: number;
  role: 'player' | 'master';
  content: string;
  created_at?: string;
}

export interface MasterDelegationRequest {
  subagentGroup: SubagentGroup;
  instruction: string;
}

export interface SubagentExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

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

export type SSEEventPayload =
  | { event: 'status'; data: SSEStatusData }
  | { event: 'chunk'; data: SSEChunkData }
  | { event: 'done'; data: SSEDoneData }
  | { event: 'error'; data: { message: string } };

export interface CompressionResult {
  success: boolean;
  summary: string;
  compressedLogsCount: number;
}

export const StreamChatInputSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  actionText: z.string().min(1, 'actionText is required'),
});

export type StreamChatInput = z.infer<typeof StreamChatInputSchema>;

export const CompressChatInputSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

export type CompressChatInput = z.infer<typeof CompressChatInputSchema>;
