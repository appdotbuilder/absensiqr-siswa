
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classSchedulesTable } from '../db/schema';
import { type CreateClassScheduleInput, type UpdateClassScheduleInput } from '../schema';
import { 
  createClassSchedule, 
  updateClassSchedule, 
  getClassSchedules, 
  getClassScheduleByClassName, 
  deleteClassSchedule 
} from '../handlers/class_schedules';
import { eq } from 'drizzle-orm';

const testInput: CreateClassScheduleInput = {
  class_name: 'Class A',
  check_in_time: '07:00',
  late_tolerance_minutes: 15,
  min_checkout_time: '14:00'
};

describe('Class Schedule Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createClassSchedule', () => {
    it('should create a class schedule', async () => {
      const result = await createClassSchedule(testInput);

      expect(result.class_name).toEqual('Class A');
      expect(result.check_in_time).toEqual('07:00');
      expect(result.late_tolerance_minutes).toEqual(15);
      expect(result.min_checkout_time).toEqual('14:00');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save class schedule to database', async () => {
      const result = await createClassSchedule(testInput);

      const schedules = await db.select()
        .from(classSchedulesTable)
        .where(eq(classSchedulesTable.id, result.id))
        .execute();

      expect(schedules).toHaveLength(1);
      expect(schedules[0].class_name).toEqual('Class A');
      expect(schedules[0].check_in_time).toEqual('07:00');
      expect(schedules[0].late_tolerance_minutes).toEqual(15);
      expect(schedules[0].min_checkout_time).toEqual('14:00');
      expect(schedules[0].is_active).toBe(true);
    });

    it('should reject duplicate class names', async () => {
      await createClassSchedule(testInput);

      await expect(createClassSchedule(testInput))
        .rejects.toThrow(/duplicate key value violates unique constraint/i);
    });
  });

  describe('updateClassSchedule', () => {
    it('should update class schedule', async () => {
      const created = await createClassSchedule(testInput);

      const updateInput: UpdateClassScheduleInput = {
        id: created.id,
        class_name: 'Class B',
        check_in_time: '08:00',
        late_tolerance_minutes: 20,
        is_active: false
      };

      const result = await updateClassSchedule(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.class_name).toEqual('Class B');
      expect(result.check_in_time).toEqual('08:00');
      expect(result.late_tolerance_minutes).toEqual(20);
      expect(result.min_checkout_time).toEqual('14:00'); // unchanged
      expect(result.is_active).toBe(false);
    });

    it('should update only provided fields', async () => {
      const created = await createClassSchedule(testInput);

      const updateInput: UpdateClassScheduleInput = {
        id: created.id,
        late_tolerance_minutes: 30
      };

      const result = await updateClassSchedule(updateInput);

      expect(result.class_name).toEqual('Class A'); // unchanged
      expect(result.check_in_time).toEqual('07:00'); // unchanged
      expect(result.late_tolerance_minutes).toEqual(30); // changed
      expect(result.min_checkout_time).toEqual('14:00'); // unchanged
    });

    it('should throw error for non-existent schedule', async () => {
      const updateInput: UpdateClassScheduleInput = {
        id: 999,
        class_name: 'Non-existent'
      };

      await expect(updateClassSchedule(updateInput))
        .rejects.toThrow(/class schedule not found/i);
    });
  });

  describe('getClassSchedules', () => {
    it('should return all active class schedules', async () => {
      await createClassSchedule(testInput);
      await createClassSchedule({
        ...testInput,
        class_name: 'Class B',
        check_in_time: '08:00'
      });

      const schedules = await getClassSchedules();

      expect(schedules).toHaveLength(2);
      expect(schedules[0].class_name).toEqual('Class A');
      expect(schedules[1].class_name).toEqual('Class B');
    });

    it('should not return inactive schedules', async () => {
      const schedule = await createClassSchedule(testInput);
      
      // Deactivate the schedule
      await updateClassSchedule({
        id: schedule.id,
        is_active: false
      });

      const schedules = await getClassSchedules();
      expect(schedules).toHaveLength(0);
    });

    it('should return empty array when no schedules exist', async () => {
      const schedules = await getClassSchedules();
      expect(schedules).toHaveLength(0);
    });
  });

  describe('getClassScheduleByClassName', () => {
    it('should return schedule for existing class', async () => {
      await createClassSchedule(testInput);

      const schedule = await getClassScheduleByClassName('Class A');

      expect(schedule).not.toBeNull();
      expect(schedule?.class_name).toEqual('Class A');
      expect(schedule?.check_in_time).toEqual('07:00');
    });

    it('should return null for non-existent class', async () => {
      const schedule = await getClassScheduleByClassName('Non-existent');
      expect(schedule).toBeNull();
    });

    it('should return inactive schedules', async () => {
      const created = await createClassSchedule(testInput);
      
      // Deactivate the schedule
      await updateClassSchedule({
        id: created.id,
        is_active: false
      });

      const schedule = await getClassScheduleByClassName('Class A');
      expect(schedule).not.toBeNull();
      expect(schedule?.is_active).toBe(false);
    });
  });

  describe('deleteClassSchedule', () => {
    it('should soft delete class schedule', async () => {
      const created = await createClassSchedule(testInput);

      const result = await deleteClassSchedule(created.id);
      expect(result).toBe(true);

      // Verify schedule is marked as inactive
      const schedule = await db.select()
        .from(classSchedulesTable)
        .where(eq(classSchedulesTable.id, created.id))
        .execute();

      expect(schedule[0].is_active).toBe(false);
    });

    it('should return false for non-existent schedule', async () => {
      const result = await deleteClassSchedule(999);
      expect(result).toBe(false);
    });

    it('should not appear in active schedules list after deletion', async () => {
      const created = await createClassSchedule(testInput);

      await deleteClassSchedule(created.id);

      const activeSchedules = await getClassSchedules();
      expect(activeSchedules).toHaveLength(0);
    });
  });
});
