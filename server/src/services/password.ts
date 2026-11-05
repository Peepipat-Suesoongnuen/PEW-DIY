/**
 * Password hashing service — argon2id with per-password salts (D3, SDS §7.1,
 * BR-10, NFR-03). Verification only through the library comparison function;
 * stored hashes must never be returned, logged or compared manually.
 */
import { hash, verify } from "@node-rs/argon2";

const HASH_OPTIONS = {
  algorithm: 2, // argon2id
  memoryCost: 19456, // 19 MiB — OWASP recommended minimum
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, HASH_OPTIONS);
}

export async function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext);
  } catch {
    // A corrupted/unreadable hash must fail closed (never authenticate).
    return false;
  }
}

/**
 * Precomputed hash of a random throwaway value, used to equalize timing when a
 * username does not exist (mitigates user enumeration via response timing —
 * AC-F01-02 / TEST-F01-02). It is not a credential and cannot be verified
 * against any user input.
 */
let dummyHashPromise: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hash(`dummy-${Date.now()}-${Math.random()}`, HASH_OPTIONS);
  return dummyHashPromise;
}
