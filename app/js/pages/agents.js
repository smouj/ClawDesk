export const loadAgents = async ({ api, setState }) => {
  const data = await api.getAgents();
  setState({ agentsData: data });
};
