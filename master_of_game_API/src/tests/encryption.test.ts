import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../services/encryption.service';

describe('EncryptionService', () => {
  const encryptionService = new EncryptionService('test_secret_key_12345678901234567890');

  it('should encrypt and decrypt strings correctly', () => {
    const plainText = 'sk-1234567890abcdef';
    const encrypted = encryptionService.encrypt(plainText);

    expect(encrypted).not.toBe(plainText);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should return empty string when encrypting empty text', () => {
    expect(encryptionService.encrypt('')).toBe('');
    expect(encryptionService.decrypt('')).toBe('');
  });

  it('should throw error for invalid encrypted format', () => {
    expect(() => encryptionService.decrypt('invalid_format')).toThrow('Invalid encrypted text format');
  });
});
