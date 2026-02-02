const { runOpenClaw } = require("../openclaw/run");

const gatewayLifecycle = async (action, env) => {
  const { stdout } = await runOpenClaw(["gateway", action], { env });
  return stdout.trim();
};

module.exports = { gatewayLifecycle };
