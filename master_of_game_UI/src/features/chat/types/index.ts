export type ChatMessageType = 'player' | 'master' | 'system';
export type GameStatus = 'IDLE' | 'GATHERING_MEMORY' | 'READING_MAP' | 'GENERATING_NARRATIVE';

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  text: string;
}

export interface ChatState {
  messages: ChatMessage[];
  status: GameStatus;
  isProcessing: boolean;
}
