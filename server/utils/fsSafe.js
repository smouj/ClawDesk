const fs = require("fs");
const path = require("path");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
};

const readFileIfExists = (filePath, encoding = "utf-8") => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, encoding);
};

const writeFileSafe = (filePath, data, options = {}) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, data, { mode: 0o600, ...options });
};

const appendFileSafe = (filePath, data) => {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, data, { mode: 0o600 });
};

module.exports = {
  ensureDir,
  readFileIfExists,
  writeFileSafe,
  appendFileSafe,
};
