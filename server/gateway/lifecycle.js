const { runOpenClaw } = require("../openclaw/run");

const gatewayLifecycle = async (action, env) => {
  const { stdout } = await runOpenClaw(["gateway", action], { env, timeout: 4000 });
  return stdout.trim();
};

module.exports = { gatewayLifecycle };
