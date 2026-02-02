export const loadSecurity = async ({ api, setState }) => {
  const health = await api.getHealth();
  setState({ health });
};
