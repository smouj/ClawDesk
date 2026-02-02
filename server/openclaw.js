const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const BIN_CANDIDATES = ["openclaw", "clawdbot", "moltbot"];
let cachedBinary = null;

const findExecutable = (binary) => {
  const pathEntries = (process.env.PATH || "").split(path.delimiter);
  for (const entry of pathEntries) {
    const fullPath = path.join(entry, binary);
    try {
      fs.accessSync(fullPath, fs.constants.X_OK);
      return fullPath;
    } catch (error) {
      continue;
    }
  }
  return null;
};

const resolveOpenClawBinary = () => {
  if (cachedBinary) {
    return cachedBinary;
  }
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

const runOpenClaw = (args, { env = {}, timeout = 15000, maxBuffer = 512 * 1024, binary } = {}) =>
  new Promise((resolve, reject) => {
    const resolved = binary ? { binary } : resolveOpenClawBinary();
    execFile(
      resolved.binary,
      args,
      {
        timeout,
        maxBuffer,
        env: {
          ...process.env,
          ...env
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          const err = new Error(stderr || error.message);
          err.code = error.code;
          err.stdout = stdout;
          err.stderr = stderr;
          return reject(err);
        }
        resolve({ stdout, stderr, binary: resolved.binary });
      }
    );
  });

const parseListOutput = (raw) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json)) {
      return json;
    }
    return [json];
  } catch (error) {
    return trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  }
};

module.exports = { runOpenClaw, parseListOutput, resolveOpenClawBinary };
