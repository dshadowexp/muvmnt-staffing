/**
 * Coverage schedule shapes shared between client components and the server
 * matching pipeline. Mirrors `frontend/features/requests/server/matching.ts`,
 * but lives here (no `server-only`) so client components can import the types.
 */

export type WorkerAssignment = {
  userId: string;
  displayName: string;
  yearsExp: number;
  photoUrl: string | null;
  startTime: string;
  endTime: string;
};

export type DaySchedule = {
  date: string;
  dayOfWeek: number;
  assignments: WorkerAssignment[];
  covered: boolean;
};
