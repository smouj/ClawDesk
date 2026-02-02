import { getState } from "../store.js";

export const loadProfiles = async ({ api, setState }) => {
  const data = await api.getProfiles();
  const current = getState().config || {};
  setState({
    profiles: data.profiles,
    config: {
      ...current,
      activeProfile: data.activeProfile,
      profiles: data.profiles,
    },
  });
};
