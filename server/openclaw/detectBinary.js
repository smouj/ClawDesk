const fs = require("fs");
const path = require("path");

const BIN_CANDIDATES = ["openclaw", "clawdbot", "moltbot"];
let cachedBinary = null;

const detectWsl = () => {
  try {
    return fs.readFileSync("/proc/version", "utf-8").toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
};

const getWindowsExtensions = () => {
  const raw = process.env.PATHEXT || ".EXE;.CMD;.BAT";
  return raw
    .split(";")
    .map((ext) => ext.trim())
    .filter(Boolean)
    .map((ext) => (ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
};

const buildCandidates = (binary, { includeWindowsExts }) => {
  const seen = new Set();
  const names = [binary];
  if (includeWindowsExts) {
    for (const ext of getWindowsExtensions()) {
      names.push(`${binary}${ext}`);
    }
  }
  return names.filter((name) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
};

const findExecutable = (binary, { allowNonExecutable = false, includeWindowsExts = false } = {}) => {
  const pathEntries = (process.env.PATH || "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidates = buildCandidates(binary, { includeWindowsExts });
  for (const entry of pathEntries) {
    for (const name of candidates) {
      const fullPath = path.join(entry, name);
      try {
        if (allowNonExecutable) {
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
          continue;
        }
        fs.accessSync(fullPath, fs.constants.X_OK);
        return fullPath;
      } catch {
        continue;
      }
    }
  }
  return null;
};

const detectBinary = () => {
  if (cachedBinary) return cachedBinary;
  const isWindows = process.platform === "win32";
  const isWsl = !isWindows && detectWsl();
  for (const candidate of BIN_CANDIDATES) {
    const resolvedPath = findExecutable(candidate, {
      allowNonExecutable: isWindows || isWsl,
      includeWindowsExts: isWindows || isWsl,
    });
    if (resolvedPath) {
      cachedBinary = { binary: resolvedPath, path: resolvedPath, name: candidate };
      return cachedBinary;
    }
  }
  cachedBinary = { binary: "openclaw", path: null, name: "openclaw" };
  return cachedBinary;
};

module.exports = { detectBinary };
