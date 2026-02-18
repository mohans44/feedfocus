import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    await connectDb();
    app.listen(env.port, () => {
      console.log(`API running on :${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start API:", error.message);
    process.exit(1);
  }
};

start();
