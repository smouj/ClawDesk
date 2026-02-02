export const loadLogs = async ({ api, setState }) => {
  const data = await api.getLogs();
  setState({ logs: data.lines || [] });
};
