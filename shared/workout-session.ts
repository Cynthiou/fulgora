// The session in progress, as the home page and the profile need it.
// The full tree (blocks, exercises, sets) comes with US-28.
export type CurrentWorkoutSession = {
  id: number;
  session_name: string;
  // ISO date-time of the real start, for example "2026-11-25T17:34:00.000Z".
  started_at: string;
};
