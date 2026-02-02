const { readFileIfExists, appendFileSafe } = require("../utils/fsSafe");

const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const recordSnapshot = (filePath, snapshot) => {
  appendFileSafe(filePath, `${JSON.stringify(snapshot)}\n`);
};

const loadHistory = (filePath, range = "24h") => {
  const raw = readFileIfExists(filePath);
  if (!raw) return [];
  const cutoff = Date.now() - (RANGE_MS[range] || RANGE_MS["24h"]);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && new Date(entry.timestamp).getTime() >= cutoff);
};

module.exports = { recordSnapshot, loadHistory };
