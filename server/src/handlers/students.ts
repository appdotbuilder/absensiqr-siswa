
import { db } from '../db';
import { studentsTable, usersTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput, type Student, type CsvImportResult } from '../schema';
import { eq, and } from 'drizzle-orm';

// Generate QR code based on NISN
function generateQrCode(nisn: string): string {
  return `QR_${nisn}_${Date.now()}`;
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  try {
    // Check if NISN already exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.nisn, input.nisn))
      .execute();

    if (existingStudent.length > 0) {
      throw new Error('Student with this NISN already exists');
    }

    // If user_id is provided, verify the user exists
    if (input.user_id) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('Referenced user does not exist');
      }
    }

    // Generate unique QR code
    const qrCode = generateQrCode(input.nisn);

    // Insert student record
    const result = await db.insert(studentsTable)
      .values({
        nisn: input.nisn,
        name: input.name,
        class: input.class,
        qr_code: qrCode,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
}

export async function updateStudent(input: UpdateStudentInput): Promise<Student> {
  try {
    // Check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error('Student not found');
    }

    // If NISN is being updated, check for uniqueness
    if (input.nisn && input.nisn !== existingStudent[0].nisn) {
      const nisnExists = await db.select()
        .from(studentsTable)
        .where(and(
          eq(studentsTable.nisn, input.nisn),
          eq(studentsTable.id, input.id)
        ))
        .execute();

      if (nisnExists.length > 0) {
        throw new Error('Student with this NISN already exists');
      }
    }

    // If user_id is provided, verify the user exists
    if (input.user_id !== undefined && input.user_id !== null) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('Referenced user does not exist');
      }
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.nisn !== undefined) {
      updateValues.nisn = input.nisn;
      // Regenerate QR code if NISN changed
      if (input.nisn !== existingStudent[0].nisn) {
        updateValues.qr_code = generateQrCode(input.nisn);
      }
    }

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.class !== undefined) updateValues.class = input.class;
    if (input.user_id !== undefined) updateValues.user_id = input.user_id;
    if (input.is_active !== undefined) updateValues.is_active = input.is_active;

    // Update student record
    const result = await db.update(studentsTable)
      .set(updateValues)
      .where(eq(studentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student update failed:', error);
    throw error;
  }
}

export async function getStudents(): Promise<Student[]> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Get students failed:', error);
    throw error;
  }
}

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get student by ID failed:', error);
    throw error;
  }
}

export async function getStudentByNisn(nisn: string): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.nisn, nisn))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get student by NISN failed:', error);
    throw error;
  }
}

export async function getStudentByQrCode(qrCode: string): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.qr_code, qrCode))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get student by QR code failed:', error);
    throw error;
  }
}

export async function deleteStudent(id: number): Promise<boolean> {
  try {
    // Check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    if (existingStudent.length === 0) {
      return false;
    }

    // Soft delete by setting is_active to false
    await db.update(studentsTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(studentsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Delete student failed:', error);
    throw error;
  }
}

export async function importStudentsFromCsv(csvData: any[]): Promise<CsvImportResult> {
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
      if (!row.nisn || !row.name || !row.class) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          reason: 'Missing required fields (nisn, name, class)',
          data: row
        });
        continue;
      }

      // Check if NISN already exists
      const existingStudent = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.nisn, row.nisn))
        .execute();

      if (existingStudent.length > 0) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          reason: 'Student with this NISN already exists',
          data: row
        });
        continue;
      }

      // Create student
      await createStudent({
        nisn: row.nisn,
        name: row.name,
        class: row.class,
        user_id: row.user_id || null
      });

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        reason: error instanceof Error ? error.message : 'Unknown error',
        data: row
      });
    }
  }

  return result;
}

export async function getStudentsByClass(className: string): Promise<Student[]> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(and(
        eq(studentsTable.class, className),
        eq(studentsTable.is_active, true)
      ))
      .execute();

    return results;
  } catch (error) {
    console.error('Get students by class failed:', error);
    throw error;
  }
}
