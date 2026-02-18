import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (payload) => {
  const expiresIn = `${env.jwtExpiryDays}d`;
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};
