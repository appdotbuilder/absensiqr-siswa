
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, usersTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput } from '../schema';
import { 
  createStudent, 
  updateStudent, 
  getStudents, 
  getStudentById,
  getStudentByNisn,
  getStudentByQrCode,
  deleteStudent,
  importStudentsFromCsv,
  getStudentsByClass
} from '../handlers/students';
import { eq } from 'drizzle-orm';

// Test data
const testStudentInput: CreateStudentInput = {
  nisn: '12345678',
  name: 'John Doe',
  class: '10A',
  user_id: null
};

const testStudentWithUserInput: CreateStudentInput = {
  nisn: '87654321',
  name: 'Jane Smith',
  class: '10B',
  user_id: 1
};

describe('createStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student without user_id', async () => {
    const result = await createStudent(testStudentInput);

    expect(result.nisn).toEqual('12345678');
    expect(result.name).toEqual('John Doe');
    expect(result.class).toEqual('10A');
    expect(result.user_id).toBeNull();
    expect(result.qr_code).toMatch(/^QR_12345678_\d+$/);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a student with user_id', async () => {
    // Create a user first
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'student',
        full_name: 'Test User',
        email: null
      })
      .returning()
      .execute();

    const input = { ...testStudentWithUserInput, user_id: user[0].id };
    const result = await createStudent(input);

    expect(result.nisn).toEqual('87654321');
    expect(result.name).toEqual('Jane Smith');
    expect(result.class).toEqual('10B');
    expect(result.user_id).toEqual(user[0].id);
    expect(result.qr_code).toMatch(/^QR_87654321_\d+$/);
  });

  it('should save student to database', async () => {
    const result = await createStudent(testStudentInput);

    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, result.id))
      .execute();

    expect(students).toHaveLength(1);
    expect(students[0].nisn).toEqual('12345678');
    expect(students[0].name).toEqual('John Doe');
    expect(students[0].class).toEqual('10A');
    expect(students[0].is_active).toBe(true);
  });

  it('should reject duplicate NISN', async () => {
    await createStudent(testStudentInput);

    await expect(createStudent(testStudentInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should reject invalid user_id', async () => {
    const input = { ...testStudentInput, user_id: 999 };

    await expect(createStudent(input))
      .rejects.toThrow(/user does not exist/i);
  });
});

describe('updateStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update student fields', async () => {
    const student = await createStudent(testStudentInput);

    const updateInput: UpdateStudentInput = {
      id: student.id,
      name: 'John Updated',
      class: '11A'
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(student.id);
    expect(result.name).toEqual('John Updated');
    expect(result.class).toEqual('11A');
    expect(result.nisn).toEqual(student.nisn); // Unchanged
    expect(result.qr_code).toEqual(student.qr_code); // Unchanged since NISN didn't change
  });

  it('should regenerate QR code when NISN changes', async () => {
    const student = await createStudent(testStudentInput);
    const originalQrCode = student.qr_code;

    const updateInput: UpdateStudentInput = {
      id: student.id,
      nisn: '99999999'
    };

    const result = await updateStudent(updateInput);

    expect(result.nisn).toEqual('99999999');
    expect(result.qr_code).not.toEqual(originalQrCode);
    expect(result.qr_code).toMatch(/^QR_99999999_\d+$/);
  });

  it('should reject update of non-existent student', async () => {
    const updateInput: UpdateStudentInput = {
      id: 999,
      name: 'Non-existent'
    };

    await expect(updateStudent(updateInput))
      .rejects.toThrow(/not found/i);
  });

  it('should reject invalid user_id', async () => {
    const student = await createStudent(testStudentInput);

    const updateInput: UpdateStudentInput = {
      id: student.id,
      user_id: 999
    };

    await expect(updateStudent(updateInput))
      .rejects.toThrow(/user does not exist/i);
  });
});

describe('getStudents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active students', async () => {
    await createStudent(testStudentInput);
    await createStudent({ ...testStudentInput, nisn: '11111111', name: 'Student 2' });

    const results = await getStudents();

    expect(results).toHaveLength(2);
    expect(results[0].name).toEqual('John Doe');
    expect(results[1].name).toEqual('Student 2');
  });

  it('should not return inactive students', async () => {
    const student = await createStudent(testStudentInput);
    
    // Deactivate student
    await db.update(studentsTable)
      .set({ is_active: false })
      .where(eq(studentsTable.id, student.id))
      .execute();

    const results = await getStudents();

    expect(results).toHaveLength(0);
  });
});

describe('getStudentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return student by ID', async () => {
    const student = await createStudent(testStudentInput);

    const result = await getStudentById(student.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(student.id);
    expect(result!.name).toEqual('John Doe');
  });

  it('should return null for non-existent ID', async () => {
    const result = await getStudentById(999);

    expect(result).toBeNull();
  });
});

describe('getStudentByNisn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return student by NISN', async () => {
    await createStudent(testStudentInput);

    const result = await getStudentByNisn('12345678');

    expect(result).not.toBeNull();
    expect(result!.nisn).toEqual('12345678');
    expect(result!.name).toEqual('John Doe');
  });

  it('should return null for non-existent NISN', async () => {
    const result = await getStudentByNisn('99999999');

    expect(result).toBeNull();
  });
});

describe('getStudentByQrCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return student by QR code', async () => {
    const student = await createStudent(testStudentInput);

    const result = await getStudentByQrCode(student.qr_code);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(student.id);
    expect(result!.qr_code).toEqual(student.qr_code);
  });

  it('should return null for non-existent QR code', async () => {
    const result = await getStudentByQrCode('QR_INVALID');

    expect(result).toBeNull();
  });
});

describe('deleteStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete student', async () => {
    const student = await createStudent(testStudentInput);

    const result = await deleteStudent(student.id);

    expect(result).toBe(true);

    // Verify student is deactivated
    const updatedStudent = await getStudentById(student.id);
    expect(updatedStudent!.is_active).toBe(false);
  });

  it('should return false for non-existent student', async () => {
    const result = await deleteStudent(999);

    expect(result).toBe(false);
  });
});

describe('getStudentsByClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return students in specific class', async () => {
    await createStudent(testStudentInput); // Class 10A
    await createStudent({ ...testStudentInput, nisn: '11111111', name: 'Student 2', class: '10B' });
    await createStudent({ ...testStudentInput, nisn: '22222222', name: 'Student 3', class: '10A' });

    const results = await getStudentsByClass('10A');

    expect(results).toHaveLength(2);
    expect(results[0].class).toEqual('10A');
    expect(results[1].class).toEqual('10A');
  });

  it('should not return inactive students in class', async () => {
    const student = await createStudent(testStudentInput);
    
    // Deactivate student
    await db.update(studentsTable)
      .set({ is_active: false })
      .where(eq(studentsTable.id, student.id))
      .execute();

    const results = await getStudentsByClass('10A');

    expect(results).toHaveLength(0);
  });
});

describe('importStudentsFromCsv', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should import valid CSV data', async () => {
    const csvData = [
      { nisn: '12345678', name: 'John Doe', class: '10A' },
      { nisn: '87654321', name: 'Jane Smith', class: '10B' }
    ];

    const result = await importStudentsFromCsv(csvData);

    expect(result.total).toEqual(2);
    expect(result.success).toEqual(2);
    expect(result.failed).toEqual(0);
    expect(result.errors).toHaveLength(0);

    // Verify students were created
    const students = await getStudents();
    expect(students).toHaveLength(2);
  });

  it('should handle invalid CSV data', async () => {
    const csvData = [
      { nisn: '12345678', name: 'John Doe', class: '10A' }, // Valid
      { nisn: '', name: 'Invalid', class: '10B' }, // Missing NISN
      { nisn: '99999999' } // Missing name and class
    ];

    const result = await importStudentsFromCsv(csvData);

    expect(result.total).toEqual(3);
    expect(result.success).toEqual(1);
    expect(result.failed).toEqual(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].reason).toMatch(/missing required fields/i);
    expect(result.errors[1].reason).toMatch(/missing required fields/i);
  });

  it('should handle duplicate NISN in CSV', async () => {
    // Create existing student
    await createStudent(testStudentInput);

    const csvData = [
      { nisn: '12345678', name: 'Duplicate', class: '10C' } // Same NISN as existing
    ];

    const result = await importStudentsFromCsv(csvData);

    expect(result.total).toEqual(1);
    expect(result.success).toEqual(0);
    expect(result.failed).toEqual(1);
    expect(result.errors[0].reason).toMatch(/already exists/i);
  });
});
