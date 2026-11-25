// Runs before every server test file.
import "dotenv/config";

// Tests must never touch the development database.
// Whatever .env says, every test talks to fulgora_test.
process.env.DB_NAME = "fulgora_test";

// Tests sign their tokens with their own secret: no test depends on .env.
process.env.JWT_SECRET = "fulgora-test-secret-with-at-least-32-characters";

// The origin that integration tests send with their requests.
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
