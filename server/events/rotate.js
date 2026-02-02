const fs = require("fs");
const path = require("path");
const { ensureDir } = require("../utils/fsSafe");

const rotateIfNeeded = (filePath, maxBytes = 1024 * 1024) => {
  if (!fs.existsSync(filePath)) return;
  const stats = fs.statSync(filePath);
  if (stats.size < maxBytes) return;
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const rotated = `${filePath}.${Date.now()}.bak`;
  fs.renameSync(filePath, rotated);
};

module.exports = { rotateIfNeeded };
