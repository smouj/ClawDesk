const fs = require("fs");
const path = require("path");

const BIN_CANDIDATES = ["openclaw", "clawdbot", "moltbot"];
let cachedBinary = null;

const findExecutable = (binary) => {
  const pathEntries = (process.env.PATH || "").split(path.delimiter);
  for (const entry of pathEntries) {
    const fullPath = path.join(entry, binary);
    try {
      fs.accessSync(fullPath, fs.constants.X_OK);
      return fullPath;
    } catch {
      continue;
    }
  }
  return null;
};

const detectBinary = () => {
  if (cachedBinary) return cachedBinary;
  for (const candidate of BIN_CANDIDATES) {
    const resolvedPath = findExecutable(candidate);
    if (resolvedPath) {
      cachedBinary = { binary: candidate, path: resolvedPath };
      return cachedBinary;
    }
  }
  cachedBinary = { binary: "openclaw", path: "openclaw" };
  return cachedBinary;
};

module.exports = { detectBinary };
