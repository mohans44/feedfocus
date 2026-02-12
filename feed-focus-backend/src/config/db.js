import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

export const connectDb = async () => {
  if (isConnected) {
    return;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  isConnected = true;
};
