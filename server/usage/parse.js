const normalizeTotals = (totals = {}) => {
  const tokensIn = totals.tokensIn ?? totals.tokens_in ?? totals.input ?? null;
  const tokensOut = totals.tokensOut ?? totals.tokens_out ?? totals.output ?? null;
  const cost = totals.cost ?? totals.usd ?? totals.total_cost ?? null;
  return {
    tokensIn: tokensIn != null ? Number(tokensIn) : null,
    tokensOut: tokensOut != null ? Number(tokensOut) : null,
    cost: cost != null ? Number(cost) : null,
  };
};

const normalizeEntries = (items = [], mapper) =>
  Array.isArray(items) ? items.map(mapper).filter((item) => item.name) : [];

const parseUsageJson = (raw) => {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const totals = normalizeTotals(data.totals || data.summary || {});
  const byProvider = normalizeEntries(data.byProvider || data.providers || [], (entry) => ({
    name: entry.name || entry.provider,
    tokens: entry.tokens ?? entry.token_count ?? null,
    cost: entry.cost ?? entry.usd ?? null,
    requests: entry.requests ?? entry.calls ?? null,
    notes: entry.notes || null,
  }));
  const byModel = normalizeEntries(data.byModel || data.models || [], (entry) => ({
    name: entry.name || entry.model,
    tokens: entry.tokens ?? entry.token_count ?? null,
    cost: entry.cost ?? entry.usd ?? null,
  }));
  const byTool = normalizeEntries(data.byTool || data.tools || [], (entry) => ({
    name: entry.name || entry.tool,
    usage: entry.usage ?? entry.count ?? null,
    cost: entry.cost ?? entry.usd ?? null,
    provider: entry.provider || null,
  }));
  return { totals, byProvider, byModel, byTool };
};

const parseUsageText = (raw) => {
  const totals = {};
  const byProvider = [];
  const byModel = [];
  const byTool = [];

  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const tokensMatch = line.match(/tokens?\s*in\s*[:=]\s*(\d+)/i);
      if (tokensMatch) {
        totals.tokensIn = Number(tokensMatch[1]);
      }
      const outMatch = line.match(/tokens?\s*out\s*[:=]\s*(\d+)/i);
      if (outMatch) {
        totals.tokensOut = Number(outMatch[1]);
      }
      const costMatch = line.match(/cost\s*[:=]\s*\$?([0-9.]+)/i);
      if (costMatch) {
        totals.cost = Number(costMatch[1]);
      }
      const providerMatch = line.match(/provider\s*[:=]\s*([^,]+),?\s*tokens?\s*[:=]\s*(\d+)/i);
      if (providerMatch) {
        byProvider.push({
          name: providerMatch[1].trim(),
          tokens: Number(providerMatch[2]),
          cost: null,
        });
      }
      const modelMatch = line.match(/model\s*[:=]\s*([^,]+),?\s*tokens?\s*[:=]\s*(\d+)/i);
      if (modelMatch) {
        byModel.push({ name: modelMatch[1].trim(), tokens: Number(modelMatch[2]), cost: null });
      }
      const toolMatch = line.match(/tool\s*[:=]\s*([^,]+),?\s*usage\s*[:=]\s*(\d+)/i);
      if (toolMatch) {
        byTool.push({
          name: toolMatch[1].trim(),
          usage: Number(toolMatch[2]),
          cost: null,
          provider: null,
        });
      }
    });

  return {
    totals: normalizeTotals(totals),
    byProvider,
    byModel,
    byTool,
  };
};

module.exports = { parseUsageJson, parseUsageText };
