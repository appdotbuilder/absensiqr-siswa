
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test inputs
const testCreateInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'student',
  full_name: 'Test User',
  email: 'test@example.com'
};

const testCreateInputNoEmail: CreateUserInput = {
  username: 'testuser2',
  password: 'password456',
  role: 'teacher',
  full_name: 'Test Teacher',
  email: null
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with all fields', async () => {
      const result = await createUser(testCreateInput);

      expect(result.username).toEqual('testuser');
      expect(result.role).toEqual('student');
      expect(result.full_name).toEqual('Test User');
      expect(result.email).toEqual('test@example.com');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a user with null email', async () => {
      const result = await createUser(testCreateInputNoEmail);

      expect(result.username).toEqual('testuser2');
      expect(result.role).toEqual('teacher');
      expect(result.full_name).toEqual('Test Teacher');
      expect(result.email).toBeNull();
      expect(result.is_active).toBe(true);
    });

    it('should save user to database', async () => {
      const result = await createUser(testCreateInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].full_name).toEqual('Test User');
      expect(users[0].role).toEqual('student');
    });

    it('should hash the password', async () => {
      const result = await createUser(testCreateInput);

      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123');
      expect(result.password_hash.length).toBeGreaterThan(10);
    });

    it('should fail with duplicate username', async () => {
      await createUser(testCreateInput);

      await expect(createUser(testCreateInput)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const user = await createUser(testCreateInput);

      const updateInput: UpdateUserInput = {
        id: user.id,
        username: 'updateduser',
        full_name: 'Updated Name',
        role: 'admin',
        email: 'updated@example.com'
      };

      const result = await updateUser(updateInput);

      expect(result.id).toEqual(user.id);
      expect(result.username).toEqual('updateduser');
      expect(result.full_name).toEqual('Updated Name');
      expect(result.role).toEqual('admin');
      expect(result.email).toEqual('updated@example.com');
      expect(result.is_active).toBe(true);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update password and hash it', async () => {
      const user = await createUser(testCreateInput);
      const originalPasswordHash = user.password_hash;

      const updateInput: UpdateUserInput = {
        id: user.id,
        password: 'newpassword123'
      };

      const result = await updateUser(updateInput);

      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('newpassword123');
      expect(result.password_hash).not.toEqual(originalPasswordHash);
    });

    it('should update is_active status', async () => {
      const user = await createUser(testCreateInput);

      const updateInput: UpdateUserInput = {
        id: user.id,
        is_active: false
      };

      const result = await updateUser(updateInput);

      expect(result.id).toEqual(user.id);
      expect(result.is_active).toBe(false);
      expect(result.username).toEqual(user.username); // Other fields unchanged
    });

    it('should fail when user does not exist', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        username: 'nonexistent'
      };

      await expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should update user in database', async () => {
      const user = await createUser(testCreateInput);

      const updateInput: UpdateUserInput = {
        id: user.id,
        full_name: 'Database Updated Name'
      };

      await updateUser(updateInput);

      const updatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(updatedUser[0].full_name).toEqual('Database Updated Name');
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      await createUser(testCreateInput);
      await createUser(testCreateInputNoEmail);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].username).toEqual('testuser');
      expect(result[1].username).toEqual('testuser2');
    });

    it('should return users with all fields', async () => {
      await createUser(testCreateInput);

      const result = await getUsers();

      expect(result).toHaveLength(1);
      const user = result[0];
      expect(user.id).toBeDefined();
      expect(user.username).toEqual('testuser');
      expect(user.password_hash).toBeDefined();
      expect(user.role).toEqual('student');
      expect(user.full_name).toEqual('Test User');
      expect(user.email).toEqual('test@example.com');
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getUserById', () => {
    it('should return null when user does not exist', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user when exists', async () => {
      const createdUser = await createUser(testCreateInput);

      const result = await getUserById(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdUser.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.full_name).toEqual('Test User');
      expect(result!.role).toEqual('student');
    });

    it('should return user with all fields', async () => {
      const createdUser = await createUser(testCreateInput);

      const result = await getUserById(createdUser.id);

      expect(result!.id).toBeDefined();
      expect(result!.username).toEqual('testuser');
      expect(result!.password_hash).toBeDefined();
      expect(result!.role).toEqual('student');
      expect(result!.full_name).toEqual('Test User');
      expect(result!.email).toEqual('test@example.com');
      expect(result!.is_active).toBe(true);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('deleteUser', () => {
    it('should return false when user does not exist', async () => {
      const result = await deleteUser(999);
      expect(result).toBe(false);
    });

    it('should soft delete user and return true', async () => {
      const user = await createUser(testCreateInput);

      const result = await deleteUser(user.id);

      expect(result).toBe(true);

      // Verify user is soft deleted
      const deletedUser = await getUserById(user.id);
      expect(deletedUser!.is_active).toBe(false);
    });

    it('should update user in database', async () => {
      const user = await createUser(testCreateInput);

      await deleteUser(user.id);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].is_active).toBe(false);
      expect(users[0].updated_at).toBeInstanceOf(Date);
    });

    it('should not affect other users', async () => {
      const user1 = await createUser(testCreateInput);
      const user2 = await createUser(testCreateInputNoEmail);

      await deleteUser(user1.id);

      const remainingUser = await getUserById(user2.id);
      expect(remainingUser!.is_active).toBe(true);
    });
  });
});
