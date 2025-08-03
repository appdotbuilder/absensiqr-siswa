
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, validateToken, hashPassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  password: 'password123',
  role: 'admin' as const,
  full_name: 'Test User',
  email: 'test@example.com'
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await hashPassword(testUser.password);
      await db.insert(usersTable)
        .values({
          username: testUser.username,
          password_hash: hashedPassword,
          role: testUser.role,
          full_name: testUser.full_name,
          email: testUser.email,
          is_active: true
        })
        .execute();
    });

    it('should authenticate valid user credentials', async () => {
      const result = await login(testLoginInput);

      expect(result.user.username).toEqual('testuser');
      expect(result.user.role).toEqual('admin');
      expect(result.user.full_name).toEqual('Test User');
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.is_active).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.user.id).toBeDefined();
    });

    it('should reject invalid username', async () => {
      const invalidInput: LoginInput = {
        username: 'nonexistent',
        password: 'password123'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      const invalidInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.username, testUser.username))
        .execute();

      await expect(login(testLoginInput)).rejects.toThrow(/user account is disabled/i);
    });

    it('should return valid user data structure', async () => {
      const result = await login(testLoginInput);

      // Verify all required user fields are present
      expect(result.user.id).toEqual(expect.any(Number));
      expect(result.user.username).toEqual(expect.any(String));
      expect(result.user.password_hash).toEqual(expect.any(String));
      expect(result.user.role).toEqual(expect.any(String));
      expect(result.user.full_name).toEqual(expect.any(String));
      expect(result.user.is_active).toEqual(expect.any(Boolean));
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('validateToken', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      // Create test user and get login token
      const hashedPassword = await hashPassword(testUser.password);
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUser.username,
          password_hash: hashedPassword,
          role: testUser.role,
          full_name: testUser.full_name,
          email: testUser.email,
          is_active: true
        })
        .returning()
        .execute();

      userId = insertResult[0].id;

      const loginResult = await login(testLoginInput);
      validToken = loginResult.token;
    });

    it('should validate valid token', async () => {
      const result = await validateToken(validToken);

      expect(result).not.toBeNull();
      expect(result!.userId).toEqual(userId);
      expect(result!.role).toEqual('admin');
    });

    it('should reject invalid token', async () => {
      const result = await validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should reject token for inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, userId))
        .execute();

      const result = await validateToken(validToken);

      expect(result).toBeNull();
    });

    it('should reject token for non-existent user', async () => {
      // Delete the user
      await db.delete(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      const result = await validateToken(validToken);

      expect(result).toBeNull();
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        '',
        'not.a.jwt',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        'Bearer token-here',
        'single-part-token'
      ];

      for (const token of malformedTokens) {
        const result = await validateToken(token);
        expect(result).toBeNull();
      }
    });

    it('should reject expired token', async () => {
      // Create an expired token manually
      const expiredPayload = {
        userId: userId,
        role: 'admin',
        username: 'testuser',
        exp: Date.now() - 1000 // 1 second ago
      };

      const expiredToken = btoa(JSON.stringify(expiredPayload)) + '.' + btoa('your-secret-key');

      const result = await validateToken(expiredToken);

      expect(result).toBeNull();
    });
  });
});
