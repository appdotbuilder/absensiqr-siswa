
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is disabled');
    }

    // For this implementation, we'll use a simple password check
    // In a real application, you would hash the input password and compare with stored hash
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Generate simple JWT-like token (base64 encoded JSON)
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      username: user.username,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    };

    const token = btoa(JSON.stringify(tokenPayload)) + '.' + btoa(JWT_SECRET);

    return {
      user: {
        id: user.id,
        username: user.username,
        password_hash: user.password_hash,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function validateToken(token: string): Promise<{ userId: number; role: string } | null> {
  try {
    // Split token into payload and signature parts
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadPart, signaturePart] = parts;
    
    // Verify signature
    const expectedSignature = btoa(JWT_SECRET);
    if (signaturePart !== expectedSignature) {
      return null;
    }

    // Decode payload
    const decoded = JSON.parse(atob(payloadPart));
    
    // Check expiration
    if (decoded.exp < Date.now()) {
      return null;
    }

    // Check if user still exists and is active
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0 || !users[0].is_active) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
}

// Simple password verification - in production, use bcrypt
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // For demo purposes, we'll just check if the plain password matches the "hash"
  // In production, use bcrypt.compare(plainPassword, hashedPassword)
  return plainPassword === hashedPassword;
}

// Simple password hashing - in production, use bcrypt
export async function hashPassword(password: string): Promise<string> {
  // For demo purposes, we'll just return the password as is
  // In production, use bcrypt.hash(password, saltRounds)
  return password;
}
