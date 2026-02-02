const { runOpenClaw } = require("../openclaw/run");

const gatewayProbe = async (env) => {
  const { stdout } = await runOpenClaw(["gateway", "probe"], { env, timeout: 4000 });
  return stdout.trim();
};

module.exports = { gatewayProbe };
