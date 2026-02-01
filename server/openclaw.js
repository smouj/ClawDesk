const { execFile } = require("child_process");

const runOpenClaw = (args, { env = {}, timeout = 15000 } = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      "openclaw",
      args,
      {
        timeout,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          ...env
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          const err = new Error(stderr || error.message);
          err.code = error.code;
          err.stdout = stdout;
          err.stderr = stderr;
          return reject(err);
        }
        resolve({ stdout, stderr });
      }
    );
  });

const parseListOutput = (raw) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json)) {
      return json;
    }
    return [json];
  } catch (error) {
    return trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  }
};

module.exports = { runOpenClaw, parseListOutput };
