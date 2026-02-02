export const loadConfigDetail = async ({ api, setState }) => {
  const data = await api.getConfig();
  setState({ configDetail: data, config: data, profiles: data.profiles });
};
