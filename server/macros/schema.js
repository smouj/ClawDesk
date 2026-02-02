const validateMacro = (macro) => {
  const errors = [];
  if (!macro || typeof macro !== "object") {
    errors.push("Macro inválida.");
  }
  if (!Array.isArray(macro.steps) || macro.steps.length === 0) {
    errors.push("La macro debe incluir pasos.");
  }
  macro?.steps?.forEach((step, index) => {
    if (!step.action || typeof step.action !== "string") {
      errors.push(`Paso ${index + 1}: action requerida.`);
    }
  });
  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = { validateMacro };
