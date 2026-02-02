const ALLOWED_ACTIONS = {
  "openclaw.doctor": ["doctor"],
  "openclaw.audit": ["security", "audit"],
  "openclaw.audit.deep": ["security", "audit", "--deep"],
};

const getAllowedArgs = (action) => ALLOWED_ACTIONS[action] || null;

module.exports = { getAllowedArgs, ALLOWED_ACTIONS };
