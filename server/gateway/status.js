const { runOpenClaw } = require("../openclaw/run");

const gatewayStatus = async (env) => {
  try {
    const { stdout } = await runOpenClaw(["gateway", "status"], { env });
    return { status: stdout.trim(), fallback: false };
  } catch {
    const { stdout } = await runOpenClaw(["status", "--all"], { env });
    return { status: stdout.trim(), fallback: true };
  }
};

module.exports = { gatewayStatus };
