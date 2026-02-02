const { readFileIfExists, writeFileSafe } = require("./fsSafe");

const readJson = (filePath, fallback = null) => {
  const raw = readFileIfExists(filePath);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, data) => {
  writeFileSafe(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

module.exports = { readJson, writeJson };
