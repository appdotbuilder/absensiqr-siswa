
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teachersTable, usersTable } from '../db/schema';
import { type CreateTeacherInput, type UpdateTeacherInput } from '../schema';
import { 
  createTeacher, 
  updateTeacher, 
  getTeachers, 
  getTeacherById, 
  getTeacherByTeacherId, 
  deleteTeacher,
  importTeachersFromCsv
} from '../handlers/teachers';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  password_hash: 'hashedpassword',
  role: 'admin' as const,
  full_name: 'Test User',
  email: 'test@example.com'
};

const testTeacherInput: CreateTeacherInput = {
  teacher_id: 'TCH001',
  name: 'John Doe',
  homeroom_class: '12A',
  user_id: null
};

describe('Teachers Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createTeacher', () => {
    it('should create a teacher successfully', async () => {
      const result = await createTeacher(testTeacherInput);

      expect(result.teacher_id).toBe('TCH001');
      expect(result.name).toBe('John Doe');
      expect(result.homeroom_class).toBe('12A');
      expect(result.user_id).toBeNull();
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create teacher with valid user_id', async () => {
      // Create user first
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const teacherInput: CreateTeacherInput = {
        ...testTeacherInput,
        user_id: userResult[0].id
      };

      const result = await createTeacher(teacherInput);
      expect(result.user_id).toBe(userResult[0].id);
    });

    it('should save teacher to database', async () => {
      const result = await createTeacher(testTeacherInput);

      const teachers = await db.select()
        .from(teachersTable)
        .where(eq(teachersTable.id, result.id))
        .execute();

      expect(teachers).toHaveLength(1);
      expect(teachers[0].teacher_id).toBe('TCH001');
      expect(teachers[0].name).toBe('John Doe');
    });

    it('should throw error for invalid user_id', async () => {
      const teacherInput: CreateTeacherInput = {
        ...testTeacherInput,
        user_id: 999 // Non-existent user
      };

      await expect(createTeacher(teacherInput)).rejects.toThrow(/user does not exist/i);
    });

    it('should throw error for duplicate teacher_id', async () => {
      await createTeacher(testTeacherInput);
      await expect(createTeacher(testTeacherInput)).rejects.toThrow();
    });
  });

  describe('updateTeacher', () => {
    it('should update teacher successfully', async () => {
      const created = await createTeacher(testTeacherInput);

      const updateInput: UpdateTeacherInput = {
        id: created.id,
        name: 'Jane Smith',
        homeroom_class: '12B'
      };

      const result = await updateTeacher(updateInput);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Jane Smith');
      expect(result.homeroom_class).toBe('12B');
      expect(result.teacher_id).toBe('TCH001'); // Unchanged
    });

    it('should update only provided fields', async () => {
      const created = await createTeacher(testTeacherInput);

      const updateInput: UpdateTeacherInput = {
        id: created.id,
        name: 'Updated Name'
      };

      const result = await updateTeacher(updateInput);

      expect(result.name).toBe('Updated Name');
      expect(result.teacher_id).toBe('TCH001'); // Unchanged
      expect(result.homeroom_class).toBe('12A'); // Unchanged
    });

    it('should throw error for non-existent teacher', async () => {
      const updateInput: UpdateTeacherInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateTeacher(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should throw error for invalid user_id', async () => {
      const created = await createTeacher(testTeacherInput);

      const updateInput: UpdateTeacherInput = {
        id: created.id,
        user_id: 999 // Non-existent user
      };

      await expect(updateTeacher(updateInput)).rejects.toThrow(/user does not exist/i);
    });
  });

  describe('getTeachers', () => {
    it('should return all active teachers', async () => {
      await createTeacher(testTeacherInput);
      await createTeacher({
        ...testTeacherInput,
        teacher_id: 'TCH002',
        name: 'Jane Smith'
      });

      const result = await getTeachers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });

    it('should not return inactive teachers', async () => {
      const created = await createTeacher(testTeacherInput);
      
      // Deactivate teacher
      await db.update(teachersTable)
        .set({ is_active: false })
        .where(eq(teachersTable.id, created.id))
        .execute();

      const result = await getTeachers();
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no teachers exist', async () => {
      const result = await getTeachers();
      expect(result).toHaveLength(0);
    });
  });

  describe('getTeacherById', () => {
    it('should return teacher by ID', async () => {
      const created = await createTeacher(testTeacherInput);
      const result = await getTeacherById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.name).toBe('John Doe');
    });

    it('should return null for non-existent teacher', async () => {
      const result = await getTeacherById(999);
      expect(result).toBeNull();
    });

    it('should return null for inactive teacher', async () => {
      const created = await createTeacher(testTeacherInput);
      
      // Deactivate teacher
      await db.update(teachersTable)
        .set({ is_active: false })
        .where(eq(teachersTable.id, created.id))
        .execute();

      const result = await getTeacherById(created.id);
      expect(result).toBeNull();
    });
  });

  describe('getTeacherByTeacherId', () => {
    it('should return teacher by teacher_id', async () => {
      await createTeacher(testTeacherInput);
      const result = await getTeacherByTeacherId('TCH001');

      expect(result).not.toBeNull();
      expect(result!.teacher_id).toBe('TCH001');
      expect(result!.name).toBe('John Doe');
    });

    it('should return null for non-existent teacher_id', async () => {
      const result = await getTeacherByTeacherId('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should return null for inactive teacher', async () => {
      const created = await createTeacher(testTeacherInput);
      
      // Deactivate teacher
      await db.update(teachersTable)
        .set({ is_active: false })
        .where(eq(teachersTable.id, created.id))
        .execute();

      const result = await getTeacherByTeacherId('TCH001');
      expect(result).toBeNull();
    });
  });

  describe('deleteTeacher', () => {
    it('should soft delete teacher successfully', async () => {
      const created = await createTeacher(testTeacherInput);
      const result = await deleteTeacher(created.id);

      expect(result).toBe(true);

      // Verify teacher is marked inactive
      const teacher = await db.select()
        .from(teachersTable)
        .where(eq(teachersTable.id, created.id))
        .execute();

      expect(teacher[0].is_active).toBe(false);
    });

    it('should return false for non-existent teacher', async () => {
      const result = await deleteTeacher(999);
      expect(result).toBe(false);
    });

    it('should not appear in active teachers list after deletion', async () => {
      const created = await createTeacher(testTeacherInput);
      await deleteTeacher(created.id);

      const activeTeachers = await getTeachers();
      expect(activeTeachers).toHaveLength(0);
    });
  });

  describe('importTeachersFromCsv', () => {
    it('should import valid teachers successfully', async () => {
      const csvData = [
        { teacher_id: 'TCH001', name: 'John Doe', homeroom_class: '12A' },
        { teacher_id: 'TCH002', name: 'Jane Smith', homeroom_class: '12B' }
      ];

      const result = await importTeachersFromCsv(csvData);

      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify teachers were created
      const teachers = await getTeachers();
      expect(teachers).toHaveLength(2);
    });

    it('should handle missing required fields', async () => {
      const csvData = [
        { teacher_id: 'TCH001', name: 'John Doe' }, // Valid
        { teacher_id: '', name: 'Invalid' }, // Missing teacher_id
        { teacher_id: 'TCH003', name: '' } // Missing name
      ];

      const result = await importTeachersFromCsv(csvData);

      expect(result.total).toBe(3);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].reason).toMatch(/required fields/i);
    });

    it('should handle duplicate teacher_id', async () => {
      // Create existing teacher
      await createTeacher(testTeacherInput);

      const csvData = [
        { teacher_id: 'TCH001', name: 'Duplicate ID' }
      ];

      const result = await importTeachersFromCsv(csvData);

      expect(result.total).toBe(1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].reason).toMatch(/already exists/i);
    });

    it('should handle invalid user_id', async () => {
      const csvData = [
        { teacher_id: 'TCH001', name: 'John Doe', user_id: 'invalid' },
        { teacher_id: 'TCH002', name: 'Jane Smith', user_id: '999' }
      ];

      const result = await importTeachersFromCsv(csvData);

      expect(result.total).toBe(2);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors[0].reason).toMatch(/invalid user_id/i);
      expect(result.errors[1].reason).toMatch(/does not exist/i);
    });

    it('should handle valid user_id', async () => {
      // Create user first
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const csvData = [
        { teacher_id: 'TCH001', name: 'John Doe', user_id: userResult[0].id.toString() }
      ];

      const result = await importTeachersFromCsv(csvData);

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Verify teacher has correct user_id
      const teacher = await getTeacherByTeacherId('TCH001');
      expect(teacher!.user_id).toBe(userResult[0].id);
    });

    it('should return empty result for empty CSV data', async () => {
      const result = await importTeachersFromCsv([]);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
