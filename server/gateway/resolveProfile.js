const { readFileIfExists } = require("../utils/fsSafe");
const { isLoopbackHost, normalizePort } = require("../config/validateConfig");

const resolveProfile = ({ config, env = process.env, flags = {} } = {}) => {
  const activeName = flags.profile || config.activeProfile || "local";
  const profile = config.profiles?.[activeName] || config.profiles?.local;
  if (!profile) {
    throw new Error(`Perfil ${activeName} no encontrado.`);
  }

  const portFromFlags = normalizePort(flags.port);
  const envPort = normalizePort(env.OPENCLAW_GATEWAY_PORT);
  const configPort = normalizePort(profile.port);
  const port = portFromFlags ?? envPort ?? configPort ?? 18789;
  const portSource = portFromFlags ? "flag" : envPort ? "env" : configPort ? "config" : "default";

  const tokenFromFile = profile.token_path ? readFileIfExists(profile.token_path)?.trim() : null;
  const token =
    flags.token || env.OPENCLAW_GATEWAY_TOKEN || profile.auth?.token || tokenFromFile || null;
  const tokenSource = flags.token
    ? "flag"
    : env.OPENCLAW_GATEWAY_TOKEN
      ? "env"
      : profile.auth?.token
        ? "config"
        : tokenFromFile
          ? "file"
          : "missing";

  const bind = profile.bind || "127.0.0.1";
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
