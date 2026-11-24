// Runs before every server test file.
import "dotenv/config";

// Tests must never touch the development database.
// Whatever .env says, every test talks to fulgora_test.
process.env.DB_NAME = "fulgora_test";
