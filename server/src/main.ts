import "dotenv/config";
import app from "./app.js";
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
