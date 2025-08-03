
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'late', 'absent', 'permitted', 'sick', 'early_leave']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  email: text('email'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  nisn: text('nisn').notNull().unique(),
  name: text('name').notNull(),
  class: text('class').notNull(),
  qr_code: text('qr_code').notNull().unique(),
  user_id: integer('user_id').references(() => usersTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Teachers table
export const teachersTable = pgTable('teachers', {
  id: serial('id').primaryKey(),
  teacher_id: text('teacher_id').notNull().unique(),
  name: text('name').notNull(),
  homeroom_class: text('homeroom_class'),
  user_id: integer('user_id').references(() => usersTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Class schedules table
export const classSchedulesTable = pgTable('class_schedules', {
  id: serial('id').primaryKey(),
  class_name: text('class_name').notNull().unique(),
  check_in_time: text('check_in_time').notNull(), // HH:MM format
  late_tolerance_minutes: integer('late_tolerance_minutes').notNull().default(0),
  min_checkout_time: text('min_checkout_time').notNull(), // HH:MM format
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Attendance records table
export const attendanceRecordsTable = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').references(() => studentsTable.id).notNull(),
  date: timestamp('date').notNull(),
  check_in_time: timestamp('check_in_time'),
  check_out_time: timestamp('check_out_time'),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  recorded_by: integer('recorded_by').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  students: many(studentsTable),
  teachers: many(teachersTable),
  attendanceRecords: many(attendanceRecordsTable),
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [studentsTable.user_id],
    references: [usersTable.id],
  }),
  attendanceRecords: many(attendanceRecordsTable),
}));

export const teachersRelations = relations(teachersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [teachersTable.user_id],
    references: [usersTable.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecordsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [attendanceRecordsTable.student_id],
    references: [studentsTable.id],
  }),
  recordedBy: one(usersTable, {
    fields: [attendanceRecordsTable.recorded_by],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Student = typeof studentsTable.$inferSelect;
export type NewStudent = typeof studentsTable.$inferInsert;

export type Teacher = typeof teachersTable.$inferSelect;
export type NewTeacher = typeof teachersTable.$inferInsert;

export type ClassSchedule = typeof classSchedulesTable.$inferSelect;
export type NewClassSchedule = typeof classSchedulesTable.$inferInsert;

export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecordsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  students: studentsTable,
  teachers: teachersTable,
  classSchedules: classSchedulesTable,
  attendanceRecords: attendanceRecordsTable,
};
