const fs = require("fs");
const path = require("path");
const os = require("os");

const { ensureDir } = require("../utils/fsSafe");
const { readJson, writeJson } = require("../utils/jsonSafe");

const OPENCLAW_DIR = process.env.OPENCLAW_CONFIG_DIR || path.join(os.homedir(), ".openclaw");
const OPENCLAW_CONFIG_PATH =
  process.env.OPENCLAW_CONFIG_PATH || path.join(OPENCLAW_DIR, "openclaw.json");
const OPENCLAW_SKILLS_PATH =
  process.env.OPENCLAW_SKILLS_PATH || path.join(OPENCLAW_DIR, "skills.json");

const readOpenclawConfig = () => {
  if (!fs.existsSync(OPENCLAW_CONFIG_PATH)) {
    return { exists: false, path: OPENCLAW_CONFIG_PATH, data: null };
  }
  return {
    exists: true,
    path: OPENCLAW_CONFIG_PATH,
    data: readJson(OPENCLAW_CONFIG_PATH, null),
  };
};

const writeOpenclawConfig = (data) => {
  ensureDir(OPENCLAW_DIR);
  if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = `${OPENCLAW_CONFIG_PATH}.bak-${stamp}`;
    fs.copyFileSync(OPENCLAW_CONFIG_PATH, backup);
  }
  writeJson(OPENCLAW_CONFIG_PATH, data);
  return OPENCLAW_CONFIG_PATH;
};

const readSkillsConfig = () => {
  if (!fs.existsSync(OPENCLAW_SKILLS_PATH)) {
    return { exists: false, path: OPENCLAW_SKILLS_PATH, data: null };
  }
  return {
    exists: true,
    path: OPENCLAW_SKILLS_PATH,
    data: readJson(OPENCLAW_SKILLS_PATH, null),
  };
};

const writeSkillsConfig = (data) => {
  ensureDir(OPENCLAW_DIR);
  if (fs.existsSync(OPENCLAW_SKILLS_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = `${OPENCLAW_SKILLS_PATH}.bak-${stamp}`;
    fs.copyFileSync(OPENCLAW_SKILLS_PATH, backup);
  }
  writeJson(OPENCLAW_SKILLS_PATH, data);
  return OPENCLAW_SKILLS_PATH;
};

module.exports = {
  OPENCLAW_DIR,
  OPENCLAW_CONFIG_PATH,
  OPENCLAW_SKILLS_PATH,
  readOpenclawConfig,
  writeOpenclawConfig,
  readSkillsConfig,
  writeSkillsConfig,
};
