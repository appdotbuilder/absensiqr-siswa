
import { db } from '../db';
import { classSchedulesTable } from '../db/schema';
import { type CreateClassScheduleInput, type UpdateClassScheduleInput, type ClassSchedule } from '../schema';
import { eq } from 'drizzle-orm';

export async function createClassSchedule(input: CreateClassScheduleInput): Promise<ClassSchedule> {
  try {
    const result = await db.insert(classSchedulesTable)
      .values({
        class_name: input.class_name,
        check_in_time: input.check_in_time,
        late_tolerance_minutes: input.late_tolerance_minutes,
        min_checkout_time: input.min_checkout_time
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class schedule creation failed:', error);
    throw error;
  }
}

export async function updateClassSchedule(input: UpdateClassScheduleInput): Promise<ClassSchedule> {
  try {
    const updateData: any = {};
    
    if (input.class_name !== undefined) updateData.class_name = input.class_name;
    if (input.check_in_time !== undefined) updateData.check_in_time = input.check_in_time;
    if (input.late_tolerance_minutes !== undefined) updateData.late_tolerance_minutes = input.late_tolerance_minutes;
    if (input.min_checkout_time !== undefined) updateData.min_checkout_time = input.min_checkout_time;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    updateData.updated_at = new Date();

    const result = await db.update(classSchedulesTable)
      .set(updateData)
      .where(eq(classSchedulesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Class schedule not found');
    }

    return result[0];
  } catch (error) {
    console.error('Class schedule update failed:', error);
    throw error;
  }
}

export async function getClassSchedules(): Promise<ClassSchedule[]> {
  try {
    const result = await db.select()
      .from(classSchedulesTable)
      .where(eq(classSchedulesTable.is_active, true))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch class schedules:', error);
    throw error;
  }
}

export async function getClassScheduleByClassName(className: string): Promise<ClassSchedule | null> {
  try {
    const result = await db.select()
      .from(classSchedulesTable)
      .where(eq(classSchedulesTable.class_name, className))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch class schedule by name:', error);
    throw error;
  }
}

export async function deleteClassSchedule(id: number): Promise<boolean> {
  try {
    const result = await db.update(classSchedulesTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(classSchedulesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Class schedule deletion failed:', error);
    throw error;
  }
}
