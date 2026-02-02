const { runOpenClaw } = require("./run");

const detectCapabilities = async (env = {}) => {
  try {
    const { stdout } = await runOpenClaw(["status", "--help"], { env, timeout: 6000 });
    const text = stdout.toLowerCase();
    return {
      usageFlag: text.includes("--usage"),
      usageJson: text.includes("--json") || text.includes("json"),
    };
  } catch {
    return { usageFlag: false, usageJson: false };
  }
};

module.exports = { detectCapabilities };
