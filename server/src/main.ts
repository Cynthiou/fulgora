import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.APP_PORT) || 3310;

app.listen(port, () => {
  console.info(`Server is listening on port ${port}`);
});
