/**
 * RED test design — TEST-F01-11/12 level: password hashing unit behavior.
 * Authentic TDD: these tests are written before the implementation is
 * exercised; failures here are behavior failures, not setup errors.
 */
import { describe, expect, it } from "vitest";
import { getDummyHash, hashPassword, verifyPassword } from "../src/services/password";

describe("password hashing service (BR-10, NFR-03)", () => {
  it("produces a salted argon2 hash that is not the plaintext and differs for equal inputs", async () => {
    const a = await hashPassword("s3cret-test-value");
    const b = await hashPassword("s3cret-test-value");
    expect(a).not.toContain("s3cret-test-value");
    expect(a).not.toEqual(b); // distinct salts per password
    expect(a).toContain("$argon2id$");
  });

  it("verifies the correct password and rejects wrong ones (library comparison only)", async () => {
    const h = await hashPassword("correct-horse");
    expect(await verifyPassword(h, "correct-horse")).toBe(true);
    expect(await verifyPassword(h, "wrong-battery")).toBe(false);
    expect(await verifyPassword(h, "")).toBe(false);
  });

  it("fails closed on a corrupted/invalid stored hash instead of authenticating", async () => {
    expect(await verifyPassword("not-a-real-hash", "anything")).toBe(false);
  });

  it("dummy hash used for timing equalization is a hash but never matches user input", async () => {
    const dummy = await getDummyHash();
    expect(dummy).toContain("$argon2id$");
    expect(await verifyPassword(dummy, "anything-at-all")).toBe(false);
  });
});
