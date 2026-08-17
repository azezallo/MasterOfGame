import crypto from 'node:crypto';

export class EncryptionService {
  private key: Buffer;

  constructor(secretKey?: string) {
    const secret = secretKey || process.env.ENCRYPTION_KEY || 'master_of_game_default_encryption_secret_key_2026';
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  public encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  public decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
