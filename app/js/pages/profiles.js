export const loadProfiles = async ({ api, setState }) => {
  const data = await api.getProfiles();
  setState({ profiles: data.profiles, config: { ...(data.config || {}), activeProfile: data.activeProfile } });
};
