
import { db } from '../db';
import { teachersTable, usersTable } from '../db/schema';
import { type CreateTeacherInput, type UpdateTeacherInput, type Teacher, type CsvImportResult } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function createTeacher(input: CreateTeacherInput): Promise<Teacher> {
  try {
    // Validate user_id if provided
    if (input.user_id) {
      const userExists = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();
      
      if (userExists.length === 0) {
        throw new Error('Referenced user does not exist');
      }
    }

    // Generate unique QR-like code for teacher_id tracking
    const qrCode = `TCH-${randomBytes(8).toString('hex').toUpperCase()}`;

    const result = await db.insert(teachersTable)
      .values({
        teacher_id: input.teacher_id,
        name: input.name,
        homeroom_class: input.homeroom_class,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher creation failed:', error);
    throw error;
  }
}

export async function updateTeacher(input: UpdateTeacherInput): Promise<Teacher> {
  try {
    // Check if teacher exists
    const existingTeacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, input.id))
      .execute();

    if (existingTeacher.length === 0) {
      throw new Error('Teacher not found');
    }

    // Validate user_id if provided
    if (input.user_id !== undefined && input.user_id !== null) {
      const userExists = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();
      
      if (userExists.length === 0) {
        throw new Error('Referenced user does not exist');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.teacher_id !== undefined) updateData.teacher_id = input.teacher_id;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.homeroom_class !== undefined) updateData.homeroom_class = input.homeroom_class;
    if (input.user_id !== undefined) updateData.user_id = input.user_id;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const result = await db.update(teachersTable)
      .set(updateData)
      .where(eq(teachersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher update failed:', error);
    throw error;
  }
}

export async function getTeachers(): Promise<Teacher[]> {
  try {
    const results = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Get teachers failed:', error);
    throw error;
  }
}

export async function getTeacherById(id: number): Promise<Teacher | null> {
  try {
    const results = await db.select()
      .from(teachersTable)
      .where(and(
        eq(teachersTable.id, id),
        eq(teachersTable.is_active, true)
      ))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get teacher by ID failed:', error);
    throw error;
  }
}

export async function getTeacherByTeacherId(teacherId: string): Promise<Teacher | null> {
  try {
    const results = await db.select()
      .from(teachersTable)
      .where(and(
        eq(teachersTable.teacher_id, teacherId),
        eq(teachersTable.is_active, true)
      ))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get teacher by teacher ID failed:', error);
    throw error;
  }
}

export async function deleteTeacher(id: number): Promise<boolean> {
  try {
    // Check if teacher exists
    const existingTeacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, id))
      .execute();

    if (existingTeacher.length === 0) {
      return false;
    }

    // Soft delete by setting is_active to false
    await db.update(teachersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(teachersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Delete teacher failed:', error);
    throw error;
  }
}

export async function importTeachersFromCsv(csvData: any[]): Promise<CsvImportResult> {
  try {
    const result: CsvImportResult = {
      total: csvData.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!row.teacher_id || !row.name) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            reason: 'Missing required fields: teacher_id and name are required',
            data: row
          });
          continue;
        }

        // Check for duplicate teacher_id
        const existingTeacher = await db.select()
          .from(teachersTable)
          .where(eq(teachersTable.teacher_id, row.teacher_id))
          .execute();

        if (existingTeacher.length > 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            reason: `Teacher ID ${row.teacher_id} already exists`,
            data: row
          });
          continue;
        }

        // Validate user_id if provided
        let userId = null;
        if (row.user_id && row.user_id !== '') {
          const userIdNum = parseInt(row.user_id);
          if (isNaN(userIdNum)) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              reason: 'Invalid user_id: must be a number',
              data: row
            });
            continue;
          }

          const userExists = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, userIdNum))
            .execute();

          if (userExists.length === 0) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              reason: `User with ID ${userIdNum} does not exist`,
              data: row
            });
            continue;
          }
          userId = userIdNum;
        }

        // Create teacher
        await db.insert(teachersTable)
          .values({
            teacher_id: row.teacher_id,
            name: row.name,
            homeroom_class: row.homeroom_class || null,
            user_id: userId
          })
          .execute();

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          reason: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: row
        });
      }
    }

    return result;
  } catch (error) {
    console.error('CSV import failed:', error);
    throw error;
  }
}
