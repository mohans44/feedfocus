import crypto from "node:crypto";

const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

const scryptAsync = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, (error, derivedKey) => {
      if (error) {
        return reject(error);
      }
      return resolve(derivedKey);
    });
  });

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
};

export const verifyPassword = async (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }
  const [algorithm, salt, hashHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hashHex) {
    return false;
  }
  const derived = await scryptAsync(password, salt);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, derived);
};
