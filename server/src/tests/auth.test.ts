import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, validateToken, hashPassword, verifyPassword, initializeDefaultAdmin } from '../handlers/auth';
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

  describe('password hashing', () => {
    it('should hash passwords using Bun.password.hash', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toEqual(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // Bun's hash is longer than bcrypt
    });

    it('should verify passwords correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      const isInvalid = await verifyPassword('wrongpassword', hashedPassword);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should handle empty passwords by throwing error', async () => {
      const emptyPassword = '';
      
      // Bun.password.hash does not allow empty passwords
      await expect(hashPassword(emptyPassword)).rejects.toThrow();
    });

    it('should produce different hashes for same password', async () => {
      const password = 'samepassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toEqual(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('initializeDefaultAdmin', () => {
    it('should create default admin account when none exists', async () => {
      await initializeDefaultAdmin();

      const admins = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'admin'))
        .execute();

      expect(admins).toHaveLength(1);
      expect(admins[0].username).toBe('admin');
      expect(admins[0].role).toBe('admin');
      expect(admins[0].full_name).toBe('Administrator');
      expect(admins[0].email).toBe('admin@smpitadifathi.sch.id');
      expect(admins[0].is_active).toBe(true);

      // Test that password is properly hashed and verifiable
      const isValidPassword = await verifyPassword('adifathi2020', admins[0].password_hash);
      expect(isValidPassword).toBe(true);
    });

    it('should update existing admin account password', async () => {
      // Create existing admin with different password
      const oldPasswordHash = await hashPassword('oldpassword');
      await db.insert(usersTable)
        .values({
          username: 'admin',
          password_hash: oldPasswordHash,
          role: 'admin',
          full_name: 'Old Admin',
          email: 'old@example.com',
          is_active: false
        })
        .execute();

      // Initialize default admin
      await initializeDefaultAdmin();

      const admins = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'admin'))
        .execute();

      expect(admins).toHaveLength(1);
      expect(admins[0].is_active).toBe(true);
      expect(admins[0].password_hash).not.toBe(oldPasswordHash);

      // Test new password works
      const isValidNewPassword = await verifyPassword('adifathi2020', admins[0].password_hash);
      expect(isValidNewPassword).toBe(true);

      // Test old password doesn't work
      const isValidOldPassword = await verifyPassword('oldpassword', admins[0].password_hash);
      expect(isValidOldPassword).toBe(false);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create test user with properly hashed password
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

    it('should authenticate default admin account', async () => {
      // Initialize default admin
      await initializeDefaultAdmin();

      const adminLoginInput: LoginInput = {
        username: 'admin',
        password: 'adifathi2020'
      };

      const result = await login(adminLoginInput);

      expect(result.user.username).toEqual('admin');
      expect(result.user.role).toEqual('admin');
      expect(result.user.full_name).toEqual('Administrator');
      expect(result.user.is_active).toBe(true);
      expect(result.token).toBeDefined();
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

    it('should handle special characters in password', async () => {
      const specialPassword = 'p@ssw0rd!@#$%^&*()';
      const hashedPassword = await hashPassword(specialPassword);
      
      // Create user with special character password
      await db.insert(usersTable)
        .values({
          username: 'specialuser',
          password_hash: hashedPassword,
          role: 'teacher',
          full_name: 'Special User',
          email: 'special@example.com',
          is_active: true
        })
        .execute();

      const specialLoginInput: LoginInput = {
        username: 'specialuser',
        password: specialPassword
      };

      const result = await login(specialLoginInput);
      expect(result.user.username).toEqual('specialuser');
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