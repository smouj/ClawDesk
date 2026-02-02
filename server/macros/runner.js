const { validateMacro } = require("./schema");
const { HttpError } = require("../utils/errors");

const runWithTimeout = (task, timeoutMs) =>
  new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      reject(new Error("Timeout excedido"));
    }, timeoutMs);

    task()
      .then((result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(error);
      });
  });

const runMacro = async ({ name, macro, actions, allowList, timeoutMs = 12_000, logEvent }) => {
  const { valid, errors } = validateMacro(macro);
  if (!valid) {
    throw new HttpError(400, "Macro inválida", errors);
  }

  const results = [];
  for (const step of macro.steps) {
    if (!allowList.has(step.action)) {
      throw new HttpError(403, `Acción ${step.action} no permitida`);
    }
    const handler = actions[step.action];
    if (!handler) {
      throw new HttpError(400, `Acción ${step.action} no soportada`);
    }
    const started = Date.now();
    try {
      const output = await runWithTimeout(() => handler(step.input || {}), timeoutMs);
      results.push({
        action: step.action,
        status: "ok",
        durationMs: Date.now() - started,
        output,
      });
    } catch (error) {
      results.push({
        action: step.action,
        status: "error",
        durationMs: Date.now() - started,
        error: error.message,
      });
      if (logEvent) {
        logEvent("macro.step.error", { name, action: step.action, error: error.message });
      }
      throw error;
    }
  }

  if (logEvent) {
    logEvent("macro.run", { name, steps: results.length });
  }

  return results;
};

module.exports = { runMacro };
