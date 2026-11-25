import "dotenv/config";
import app from "./app.js";
import { startAppointmentStatusWatch } from "./modules/appointment/statusWatch.js";
import { startProgramStatusWatch } from "./modules/program/programStatusWatch.js";
import { startInactivityWatch } from "./modules/workout-session/inactivityWatch.js";
import { readJwtSecret } from "./utils/token.js";

// Refuse to start with a missing or weak secret: a clear error now is better
// than tokens anyone could forge later.
try {
  readJwtSecret();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const port = Number(process.env.APP_PORT) || 3310;

app.listen(port, () => {
  console.info(`Server is listening on port ${port}`);
});

// Closes the sessions left open for 4 hours (RM-065). Started here only, so
// the tests (which import app.ts, never main.ts) run no background task.
startInactivityWatch();
startAppointmentStatusWatch();
startProgramStatusWatch();
