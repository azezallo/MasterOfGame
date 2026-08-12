import { describe, it, expect } from 'vitest';
import {
  streamTurnPayloadSchema,
  compressContextPayloadSchema,
  compressContextResponseSchema,
} from '../types';

describe('Agentic Loop UI Contracts & Schemas', () => {
  it('should validate streamTurnPayloadSchema correctly', () => {
    const valid = {
      sessionId: 'sess_12345',
      actionText: 'Я випиваю зілля та атакують орка',
    };
    const res = streamTurnPayloadSchema.safeParse(valid);
    expect(res.success).toBe(true);

    const invalid = {
      sessionId: '',
      actionText: '  ',
    };
    const resInvalid = streamTurnPayloadSchema.safeParse(invalid);
    expect(resInvalid.success).toBe(false);
  });

  it('should validate compressContextPayloadSchema correctly', () => {
    const valid = { sessionId: 'sess_99' };
    expect(compressContextPayloadSchema.safeParse(valid).success).toBe(true);

    const invalid = { sessionId: '' };
    expect(compressContextPayloadSchema.safeParse(invalid).success).toBe(false);
  });

  it('should validate compressContextResponseSchema correctly', () => {
    const valid = {
      success: true,
      summary: 'Главу 1 успішно завершено.',
      compressedLogsCount: 14,
    };
    const res = compressContextResponseSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.compressedLogsCount).toBe(14);
    }
  });
});
