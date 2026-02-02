const { readFileIfExists } = require("../utils/fsSafe");
const { isLoopbackHost, normalizePort } = require("../config/validateConfig");
const { readOpenclawConfig } = require("../openclaw/storage");

const extractOpenclawGateway = (data) => {
  if (!data || typeof data !== "object") {
    return {};
  }
  const gateway = typeof data.gateway === "object" && data.gateway ? data.gateway : {};
  const app = typeof data.app === "object" && data.app ? data.app : {};
  const bind = gateway.bind || gateway.host || app.bind || app.host;
  const port = normalizePort(gateway.port ?? app.port);
  const tokenPath =
    gateway.token_path || gateway.tokenPath || app.token_path || app.tokenPath || null;
  return {
    bind: bind || null,
    port,
    token_path: tokenPath,
  };
};

const resolveProfile = ({ config, env = process.env, flags = {} } = {}) => {
  const activeName = flags.profile || config.activeProfile || "local";
  const profile = config.profiles?.[activeName] || config.profiles?.local;
  if (!profile) {
    throw new Error(`Perfil ${activeName} no encontrado.`);
  }

  const openclaw = readOpenclawConfig();
  const openclawGateway = extractOpenclawGateway(openclaw.data);
  const shouldSyncOpenclaw =
    activeName === "local" &&
    (openclawGateway.bind || openclawGateway.port || openclawGateway.token_path);
  const syncedProfile = shouldSyncOpenclaw
    ? {
        ...profile,
        bind: openclawGateway.bind ?? profile.bind,
        port: openclawGateway.port ?? profile.port,
        token_path: openclawGateway.token_path ?? profile.token_path,
      }
    : profile;

  const portFromFlags = normalizePort(flags.port);
  const envPort = normalizePort(env.OPENCLAW_GATEWAY_PORT);
  const configPort = normalizePort(syncedProfile.port);
  const port = portFromFlags ?? envPort ?? configPort ?? 18789;
  const portSource = portFromFlags ? "flag" : envPort ? "env" : configPort ? "config" : "default";

  const tokenFromFile = syncedProfile.token_path
    ? readFileIfExists(syncedProfile.token_path)?.trim()
    : null;
  const token =
    flags.token || env.OPENCLAW_GATEWAY_TOKEN || syncedProfile.auth?.token || tokenFromFile || null;
  const tokenSource = flags.token
    ? "flag"
    : env.OPENCLAW_GATEWAY_TOKEN
      ? "env"
      : syncedProfile.auth?.token
        ? "config"
        : tokenFromFile
          ? "file"
          : "missing";

  const bind = syncedProfile.bind || "127.0.0.1";
  const remote = !isLoopbackHost(bind);
  if (remote && !config.security?.enableRemoteProfiles) {
    throw new Error("Perfiles remotos desactivados por seguridad.");
  }
  if (remote && config.security?.allowedRemoteHosts?.length) {
    if (!config.security.allowedRemoteHosts.includes(bind)) {
      throw new Error("Host remoto no permitido por allowlist.");
    }
  }

  return {
    name: activeName,
    bind,
    port,
    token,
    tokenSource,
    portSource,
    url: `http://${bind}:${port}`,
    remote,
  };
};

module.exports = { resolveProfile };
