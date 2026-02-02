const { readOpenclawConfig, readSkillsConfig, writeSkillsConfig } = require("./storage");

const resolveSkillsList = () => {
  const openclaw = readOpenclawConfig();
  if (openclaw.data?.skills) {
    return {
      source: "openclaw",
      list: Array.isArray(openclaw.data.skills) ? openclaw.data.skills : [],
      path: openclaw.path,
      exists: openclaw.exists,
      warning: null,
    };
  }
  const skills = readSkillsConfig();
  return {
    source: "skills.json",
    list: Array.isArray(skills.data?.skills) ? skills.data.skills : [],
    path: skills.path,
    exists: skills.exists,
    warning: skills.exists ? null : "No se encontró skills.json",
  };
};

const checkRequirement = (requirement) => {
  if (!requirement) return true;
  if (requirement.type === "bin") {
    const name = String(requirement.name || "");
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) return false;
    const result = require("child_process").spawnSync("which", [name], { shell: false });
    return result.status === 0;
  }
  return true;
};

const normalizeSkill = (skill) => {
  if (!skill || typeof skill !== "object") return null;
  const requirements = Array.isArray(skill.requirements)
    ? skill.requirements.map((req) =>
        typeof req === "string" ? { type: "bin", name: req, command: `which ${req}` } : req
      )
    : [];
  const missing = requirements.filter((req) => !checkRequirement(req));
  const enabled = Boolean(skill.enabled);
  return {
    name: skill.name,
    description: skill.description || "",
    enabled,
    status: missing.length ? "missing" : enabled ? "enabled" : "disabled",
    requirements,
    missing_requirements: missing,
  };
};

const listSkills = () => {
  const source = resolveSkillsList();
  const normalized = source.list.map(normalizeSkill).filter(Boolean);
  return {
    skills: normalized,
    source: source.source,
    path: source.path,
    exists: source.exists,
    warning: source.warning,
  };
};

const toggleSkill = (name, enabled) => {
  const source = resolveSkillsList();
  const skills = source.list.map((skill) => ({ ...skill }));
  const target = skills.find((skill) => skill.name === name);
  if (!target) {
    throw new Error("Skill no encontrada");
  }
  target.enabled = Boolean(enabled);
  writeSkillsConfig({ skills });
  return normalizeSkill(target);
};

const refreshSkills = () => listSkills();

module.exports = { listSkills, toggleSkill, refreshSkills };
