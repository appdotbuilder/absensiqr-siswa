
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['admin', 'teacher', 'student']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Attendance status enum
export const attendanceStatusSchema = z.enum(['present', 'late', 'absent', 'permitted', 'sick', 'early_leave']);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  role: userRoleSchema,
  full_name: z.string(),
  email: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  nisn: z.string(),
  name: z.string(),
  class: z.string(),
  qr_code: z.string(),
  user_id: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Teacher schema
export const teacherSchema = z.object({
  id: z.number(),
  teacher_id: z.string(),
  name: z.string(),
  homeroom_class: z.string().nullable(),
  user_id: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Teacher = z.infer<typeof teacherSchema>;

// Class schedule schema
export const classScheduleSchema = z.object({
  id: z.number(),
  class_name: z.string(),
  check_in_time: z.string(), // HH:MM format
  late_tolerance_minutes: z.number().int(),
  min_checkout_time: z.string(), // HH:MM format
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ClassSchedule = z.infer<typeof classScheduleSchema>;

// Attendance record schema
export const attendanceRecordSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  date: z.coerce.date(),
  check_in_time: z.coerce.date().nullable(),
  check_out_time: z.coerce.date().nullable(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
  recorded_by: z.number(), // user_id of who recorded the attendance
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

// Input schemas for creating/updating entities
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: userRoleSchema,
  full_name: z.string().min(1),
  email: z.string().email().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  full_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const createStudentInputSchema = z.object({
  nisn: z.string().min(1),
  name: z.string().min(1),
  class: z.string().min(1),
  user_id: z.number().nullable()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const updateStudentInputSchema = z.object({
  id: z.number(),
  nisn: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  class: z.string().min(1).optional(),
  user_id: z.number().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

export const createTeacherInputSchema = z.object({
  teacher_id: z.string().min(1),
  name: z.string().min(1),
  homeroom_class: z.string().nullable(),
  user_id: z.number().nullable()
});

export type CreateTeacherInput = z.infer<typeof createTeacherInputSchema>;

export const updateTeacherInputSchema = z.object({
  id: z.number(),
  teacher_id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  homeroom_class: z.string().nullable().optional(),
  user_id: z.number().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateTeacherInput = z.infer<typeof updateTeacherInputSchema>;

export const createClassScheduleInputSchema = z.object({
  class_name: z.string().min(1),
  check_in_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  late_tolerance_minutes: z.number().int().nonnegative(),
  min_checkout_time: z.string().regex(/^\d{2}:\d{2}$/) // HH:MM format
});

export type CreateClassScheduleInput = z.infer<typeof createClassScheduleInputSchema>;

export const updateClassScheduleInputSchema = z.object({
  id: z.number(),
  class_name: z.string().min(1).optional(),
  check_in_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  late_tolerance_minutes: z.number().int().nonnegative().optional(),
  min_checkout_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_active: z.boolean().optional()
});

export type UpdateClassScheduleInput = z.infer<typeof updateClassScheduleInputSchema>;

export const recordAttendanceInputSchema = z.object({
  student_id: z.number(),
  date: z.coerce.date(),
  check_in_time: z.coerce.date().nullable(),
  check_out_time: z.coerce.date().nullable(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
  recorded_by: z.number()
});

export type RecordAttendanceInput = z.infer<typeof recordAttendanceInputSchema>;

export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  check_in_time: z.coerce.date().nullable().optional(),
  check_out_time: z.coerce.date().nullable().optional(),
  status: attendanceStatusSchema.optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Query schemas
export const attendanceFiltersSchema = z.object({
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  class: z.string().optional(),
  status: attendanceStatusSchema.optional(),
  student_name: z.string().optional()
});

export type AttendanceFilters = z.infer<typeof attendanceFiltersSchema>;

export const dashboardStatsSchema = z.object({
  total_students: z.number(),
  present_today: z.number(),
  late_today: z.number(),
  permitted_sick_today: z.number(),
  attendance_ratio: z.object({
    present: z.number(),
    absent: z.number(),
    late: z.number(),
    permitted: z.number(),
    sick: z.number()
  })
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// QR Code scan input
export const qrScanInputSchema = z.object({
  qr_code: z.string(),
  recorded_by: z.number()
});

export type QrScanInput = z.infer<typeof qrScanInputSchema>;

// CSV import schemas
export const csvImportResultSchema = z.object({
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    row: z.number(),
    reason: z.string(),
    data: z.record(z.string())
  }))
});

export type CsvImportResult = z.infer<typeof csvImportResultSchema>;
