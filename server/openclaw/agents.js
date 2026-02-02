const { readOpenclawConfig, writeOpenclawConfig } = require("./storage");

const normalizeAgent = (agent, fallbackName) => {
  if (!agent) return null;
  if (typeof agent === "string") {
    return { name: agent, provider: null, model: null, storage_path: null, disabled: false };
  }
  return {
    name: agent.name || fallbackName,
    provider: agent.provider || null,
    model: agent.model || null,
    storage_path: agent.storage_path || agent.path || null,
    disabled: Boolean(agent.disabled),
    last_activity: agent.last_activity || null,
    metadata: agent.metadata || {},
  };
};

const getAgentContainer = (config) => {
  if (Array.isArray(config?.agents)) {
    const list = config.agents.map((agent) =>
      typeof agent === "string" ? { name: agent } : { ...agent }
    );
    return { source: "openclaw", list, defaultKey: config.defaultAgent };
  }
  if (config?.agents && Array.isArray(config.agents.list)) {
    return { source: "openclaw", list: config.agents.list, defaultKey: config.agents.default };
  }
  if (config?.agents && typeof config.agents === "object") {
    const list = Object.entries(config.agents)
      .filter(([key]) => key !== "default")
      .map(([name, agent]) => ({ ...agent, name }));
    return { source: "openclaw", list, defaultKey: config.agents.default };
  }
  if (config?.clawdesk?.agents) {
    const list = config.clawdesk.agents.list || [];
    return { source: "clawdesk", list, defaultKey: config.clawdesk.agents.default };
  }
  return { source: "clawdesk", list: [], defaultKey: null };
};

const writeAgentContainer = (config, container) => {
  const { source, list, defaultKey } = container;
  if (source === "openclaw" && Array.isArray(config?.agents)) {
    config.agents = list;
    if (defaultKey) config.defaultAgent = defaultKey;
    return config;
  }
  if (source === "openclaw" && config?.agents && Array.isArray(config.agents.list)) {
    config.agents = { ...config.agents, list, default: defaultKey };
    return config;
  }
  if (source === "openclaw" && config?.agents && typeof config.agents === "object") {
    const next = { default: defaultKey };
    list.forEach((agent) => {
      next[agent.name] = { ...agent };
      delete next[agent.name].name;
    });
    config.agents = next;
    return config;
  }
  config.clawdesk = config.clawdesk || {};
  config.clawdesk.agents = { list, default: defaultKey };
  return config;
};

const listAgents = () => {
  const { data, exists, path } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const normalized = container.list
    .map((agent) => normalizeAgent(agent, agent?.name))
    .filter(Boolean);
  const defaultAgent = container.defaultKey || normalized[0]?.name || null;
  return {
    agents: normalized.map((agent) => ({
      ...agent,
      default: defaultAgent === agent.name,
    })),
    defaultAgent,
    source: container.source,
    path,
    exists,
    warning: exists ? null : "No se encontró openclaw.json",
  };
};

const createAgent = ({ name, provider, model, storage_path, metadata }) => {
  const { data } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw new Error("Nombre de agente requerido");
  }
  if (container.list.some((agent) => agent.name === trimmed || agent === trimmed)) {
    throw new Error("Ya existe un agente con ese nombre");
  }
  const entry = {
    name: trimmed,
    provider: provider || null,
    model: model || null,
    storage_path: storage_path || null,
    disabled: false,
    last_activity: null,
    metadata: metadata || {},
  };
  container.list.push(entry);
  container.defaultKey = container.defaultKey || trimmed;
  writeOpenclawConfig(writeAgentContainer(config, container));
  return entry;
};

const setDefaultAgent = (name) => {
  const { data } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const exists = container.list.find((agent) =>
    typeof agent === "string" ? agent === name : agent.name === name
  );
  if (!exists) {
    throw new Error("Agente no encontrado");
  }
  container.defaultKey = name;
  writeOpenclawConfig(writeAgentContainer(config, container));
  return name;
};

const renameAgent = (name, nextName) => {
  const { data } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const trimmed = String(nextName || "").trim();
  if (!trimmed) {
    throw new Error("Nuevo nombre inválido");
  }
  if (container.list.some((agent) => agent.name === trimmed)) {
    throw new Error("Ya existe un agente con ese nombre");
  }
  const target = container.list.find((agent) => agent.name === name);
  if (!target) {
    throw new Error("Agente no encontrado");
  }
  target.name = trimmed;
  if (container.defaultKey === name) {
    container.defaultKey = trimmed;
  }
  writeOpenclawConfig(writeAgentContainer(config, container));
  return target;
};

const deleteAgent = (name) => {
  const { data } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const nextList = container.list.filter((agent) => agent.name !== name);
  if (nextList.length === container.list.length) {
    throw new Error("Agente no encontrado");
  }
  container.list = nextList;
  if (container.defaultKey === name) {
    container.defaultKey = nextList[0]?.name || null;
  }
  writeOpenclawConfig(writeAgentContainer(config, container));
  return true;
};

const importAgent = (agent) => {
  if (!agent || typeof agent !== "object") {
    throw new Error("Payload inválido");
  }
  return createAgent(agent);
};

const exportAgent = (name) => {
  const { data } = readOpenclawConfig();
  const config = data || {};
  const container = getAgentContainer(config);
  const target = container.list.find((agent) => agent.name === name);
  if (!target) {
    throw new Error("Agente no encontrado");
  }
  return normalizeAgent(target, name);
};

module.exports = {
  listAgents,
  createAgent,
  setDefaultAgent,
  renameAgent,
  deleteAgent,
  importAgent,
  exportAgent,
};
