const isLoopbackHost = (host) => ["127.0.0.1", "localhost", "::1"].includes(host);

const normalizePort = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return null;
  }
  return port;
};

const validateConfig = (config) => {
  const configVersion = Number(config.configVersion || 3);
  if (!Number.isInteger(configVersion) || configVersion < 1) {
    throw new Error("configVersion inválido en config.json.");
  }
  const host = config.app?.host || "127.0.0.1";
  if (!isLoopbackHost(host)) {
    throw new Error("ClawDesk solo puede enlazarse a 127.0.0.1/localhost por seguridad.");
  }
  const port = normalizePort(config.app?.port) || 4178;

  if (!config.profiles || typeof config.profiles !== "object") {
    throw new Error("La configuración requiere un objeto profiles válido.");
  }
  const profiles = { ...config.profiles };
  for (const [name, profile] of Object.entries(profiles)) {
    const profilePort = normalizePort(profile.port);
    if (!profilePort) {
      throw new Error(`El puerto del perfil ${name} debe estar entre 1024 y 65535.`);
    }
    if (profile.bind && !isLoopbackHost(profile.bind) && !config.security?.enableRemoteProfiles) {
      throw new Error(`El perfil ${name} requiere enableRemoteProfiles para hosts remotos.`);
    }
    profiles[name] = {
      name,
      bind: profile.bind || "127.0.0.1",
      port: profilePort,
      token_path: profile.token_path || null,
      auth: {
        token: profile.auth?.token || "",
      },
    };
  }

  const activeProfile = profiles[config.activeProfile] ? config.activeProfile : "local";

  return {
    ...config,
    configVersion,
    app: {
      ...config.app,
      host,
      port,
    },
    profiles,
    activeProfile,
    security: {
      ...config.security,
      allow_actions: Array.isArray(config.security?.allow_actions)
        ? config.security.allow_actions
        : [],
      enableRemoteProfiles: Boolean(config.security?.enableRemoteProfiles),
      allowedRemoteHosts: Array.isArray(config.security?.allowedRemoteHosts)
        ? config.security.allowedRemoteHosts
        : [],
      allowedOrigins: Array.isArray(config.security?.allowedOrigins)
        ? config.security.allowedOrigins.filter(
            (origin) => typeof origin === "string" && origin.trim()
          )
        : [],
    },
  };
};

module.exports = { validateConfig, isLoopbackHost, normalizePort };
