import { describe, it, expect } from 'vitest';
import { chatMessageSchema, chatStateSchema } from '../types';

describe('Chat UI Schemas & Contracts', () => {
  it('should validate player message correctly', () => {
    const validPlayer = {
      id: 'player_123',
      type: 'player',
      text: 'Я дістаю факел і заходжу в печеру',
      timestamp: '14:30',
    };
    const res = chatMessageSchema.safeParse(validPlayer);
    expect(res.success).toBe(true);
  });

  it('should validate master message correctly', () => {
    const validMaster = {
      id: 'master_456',
      type: 'master',
      text: 'Печера зустрічає вас вогким холодом.',
    };
    const res = chatMessageSchema.safeParse(validMaster);
    expect(res.success).toBe(true);
  });

  it('should validate system message correctly', () => {
    const validSystem = {
      id: 'sys_789',
      type: 'system',
      text: 'Зєднання з сервером відновлено.',
    };
    const res = chatMessageSchema.safeParse(validSystem);
    expect(res.success).toBe(true);
  });

  it('should reject invalid message type', () => {
    const invalidMsg = {
      id: 'msg_00',
      type: 'unknown_type',
      text: 'Некоректне повідомлення',
    };
    const res = chatMessageSchema.safeParse(invalidMsg);
    expect(res.success).toBe(false);
  });

  it('should validate full ChatState', () => {
    const validState = {
      messages: [
        { id: '1', type: 'system', text: 'Старт' },
        { id: '2', type: 'player', text: 'Привіт' },
      ],
      status: 'IDLE',
      isProcessing: false,
    };
    const res = chatStateSchema.safeParse(validState);
    expect(res.success).toBe(true);
  });
});
