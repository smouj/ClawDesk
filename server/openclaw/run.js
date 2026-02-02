const { execFile } = require("child_process");
const { detectBinary } = require("./detectBinary");

const sanitizeArgs = (args) => {
  if (!Array.isArray(args)) return [];
  return args.filter((arg) => typeof arg === "string" && arg.trim().length > 0);
};

const runOpenClaw = (args, { env = {}, timeout = 15_000, maxBuffer = 512 * 1024, binary } = {}) =>
  new Promise((resolve, reject) => {
    const resolved = binary ? { binary } : detectBinary();
    const safeArgs = sanitizeArgs(args);
    execFile(
      resolved.binary,
      safeArgs,
      {
        timeout,
        maxBuffer,
        env: {
          ...process.env,
          ...env,
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          const err = new Error(stderr || error.message);
          err.code = error.code;
          err.stdout = stdout;
          err.stderr = stderr;
          return reject(err);
        }
        resolve({ stdout, stderr, binary: resolved.binary });
      }
    );
  });

module.exports = { runOpenClaw };
