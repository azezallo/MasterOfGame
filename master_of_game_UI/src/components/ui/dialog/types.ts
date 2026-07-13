export type MessageType = 'system' | 'ai' | 'player';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender?: string;
}
