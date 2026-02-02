const { runOpenClaw } = require("../openclaw/run");

const gatewayProbe = async (env) => {
  const { stdout } = await runOpenClaw(["gateway", "probe"], { env });
  return stdout.trim();
};

module.exports = { gatewayProbe };
