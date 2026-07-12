import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1, hashLength: 32 });
}

export async function verifyPassword(hash: string, password: string) {
  try {
    if (hash.startsWith('$argon2')) return await argon2.verify(hash, password);
    return await bcrypt.compare(password, hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid');
  } catch { return false; }
}

export function passwordNeedsRehash(hash: string) { return !hash.startsWith('$argon2id$'); }
