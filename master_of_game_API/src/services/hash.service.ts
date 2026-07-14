import crypto from 'crypto';
import { PasswordHash } from '../types/auth';

export class HashService {
  private static SALT_LENGTH = 16;
  private static KEY_LENGTH = 64;

  /**
   * Hashes a password using scrypt.
   * @param password The plain text password.
   * @returns An object containing the hash and the salt.
   */
  public static hashPassword(password: string): PasswordHash {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = crypto.scryptSync(password, salt, this.KEY_LENGTH).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifies a password against a hash and salt.
   * @param password The plain text password.
   * @param hash The stored hash.
   * @param salt The stored salt.
   * @returns True if the password matches, false otherwise.
   */
  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    const newHash = crypto.scryptSync(password, salt, this.KEY_LENGTH).toString('hex');
    return newHash === hash;
  }
}
