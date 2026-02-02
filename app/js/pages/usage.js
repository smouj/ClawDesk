export const loadUsage = async ({ api, setState }, range = "24h") => {
  const snapshot = await api.getUsageSnapshot();
  const history = await api.getUsageHistory(range);
  setState({ usage: snapshot, usageHistory: history.entries || [] });
};
