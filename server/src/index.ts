
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createStudentInputSchema,
  updateStudentInputSchema,
  createTeacherInputSchema,
  updateTeacherInputSchema,
  createClassScheduleInputSchema,
  updateClassScheduleInputSchema,
  recordAttendanceInputSchema,
  updateAttendanceInputSchema,
  qrScanInputSchema,
  attendanceFiltersSchema
} from './schema';

// Import handlers
import { login, validateToken } from './handlers/auth';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from './handlers/users';
import { createStudent, updateStudent, getStudents, getStudentById, getStudentByNisn, getStudentByQrCode, deleteStudent, importStudentsFromCsv, getStudentsByClass } from './handlers/students';
import { createTeacher, updateTeacher, getTeachers, getTeacherById, getTeacherByTeacherId, deleteTeacher, importTeachersFromCsv } from './handlers/teachers';
import { createClassSchedule, updateClassSchedule, getClassSchedules, getClassScheduleByClassName, deleteClassSchedule } from './handlers/class_schedules';
import { recordAttendance, updateAttendance, scanQrCodeForAttendance, getAttendanceRecords, getAttendanceByStudentId, getAttendanceByDate, getDashboardStats, exportAttendanceToExcel, exportAttendanceToPdf, getMonthlyAttendanceStats } from './handlers/attendance';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
  
  deleteUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteUser(input)),

  // Student management routes
  createStudent: publicProcedure
    .input(createStudentInputSchema)
    .mutation(({ input }) => createStudent(input)),
  
  updateStudent: publicProcedure
    .input(updateStudentInputSchema)
    .mutation(({ input }) => updateStudent(input)),
  
  getStudents: publicProcedure
    .query(() => getStudents()),
  
  getStudentById: publicProcedure
    .input(z.number())
    .query(({ input }) => getStudentById(input)),
  
  getStudentByNisn: publicProcedure
    .input(z.string())
    .query(({ input }) => getStudentByNisn(input)),
  
  getStudentByQrCode: publicProcedure
    .input(z.string())
    .query(({ input }) => getStudentByQrCode(input)),
  
  getStudentsByClass: publicProcedure
    .input(z.string())
    .query(({ input }) => getStudentsByClass(input)),
  
  deleteStudent: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteStudent(input)),
  
  importStudentsFromCsv: publicProcedure
    .input(z.array(z.any()))
    .mutation(({ input }) => importStudentsFromCsv(input)),

  // Teacher management routes
  createTeacher: publicProcedure
    .input(createTeacherInputSchema)
    .mutation(({ input }) => createTeacher(input)),
  
  updateTeacher: publicProcedure
    .input(updateTeacherInputSchema)
    .mutation(({ input }) => updateTeacher(input)),
  
  getTeachers: publicProcedure
    .query(() => getTeachers()),
  
  getTeacherById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTeacherById(input)),
  
  getTeacherByTeacherId: publicProcedure
    .input(z.string())
    .query(({ input }) => getTeacherByTeacherId(input)),
  
  deleteTeacher: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTeacher(input)),
  
  importTeachersFromCsv: publicProcedure
    .input(z.array(z.any()))
    .mutation(({ input }) => importTeachersFromCsv(input)),

  // Class schedule routes
  createClassSchedule: publicProcedure
    .input(createClassScheduleInputSchema)
    .mutation(({ input }) => createClassSchedule(input)),
  
  updateClassSchedule: publicProcedure
    .input(updateClassScheduleInputSchema)
    .mutation(({ input }) => updateClassSchedule(input)),
  
  getClassSchedules: publicProcedure
    .query(() => getClassSchedules()),
  
  getClassScheduleByClassName: publicProcedure
    .input(z.string())
    .query(({ input }) => getClassScheduleByClassName(input)),
  
  deleteClassSchedule: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteClassSchedule(input)),

  // Attendance routes
  recordAttendance: publicProcedure
    .input(recordAttendanceInputSchema)
    .mutation(({ input }) => recordAttendance(input)),
  
  updateAttendance: publicProcedure
    .input(updateAttendanceInputSchema)
    .mutation(({ input }) => updateAttendance(input)),
  
  scanQrCodeForAttendance: publicProcedure
    .input(qrScanInputSchema)
    .mutation(({ input }) => scanQrCodeForAttendance(input)),
  
  getAttendanceRecords: publicProcedure
    .input(attendanceFiltersSchema.optional())
    .query(({ input }) => getAttendanceRecords(input)),
  
  getAttendanceByStudentId: publicProcedure
    .input(z.object({
      studentId: z.number(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    }))
    .query(({ input }) => getAttendanceByStudentId(input.studentId, input.dateFrom, input.dateTo)),
  
  getAttendanceByDate: publicProcedure
    .input(z.coerce.date())
    .query(({ input }) => getAttendanceByDate(input)),
  
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  
  getMonthlyAttendanceStats: publicProcedure
    .input(z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int()
    }))
    .query(({ input }) => getMonthlyAttendanceStats(input.month, input.year)),
  
  exportAttendanceToExcel: publicProcedure
    .input(attendanceFiltersSchema.optional())
    .query(({ input }) => exportAttendanceToExcel(input)),
  
  exportAttendanceToPdf: publicProcedure
    .input(attendanceFiltersSchema.optional())
    .query(({ input }) => exportAttendanceToPdf(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
