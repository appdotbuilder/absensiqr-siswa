
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password (simple hash for demo - in production use bcrypt)
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash,
        role: input.role,
        full_name: input.full_name,
        email: input.email
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Check if user exists
    const existingUser = await getUserById(input.id);
    if (!existingUser) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Prepare update values
    const updateData: any = {};
    
    if (input.username !== undefined) updateData.username = input.username;
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    
    // Hash new password if provided
    if (input.password !== undefined) {
      updateData.password_hash = await Bun.password.hash(input.password);
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by id:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return false;
    }

    // Soft delete by setting is_active to false
    await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}
