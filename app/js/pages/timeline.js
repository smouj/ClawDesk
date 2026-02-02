export const loadTimeline = async ({ api, setState }) => {
  const data = await api.getEvents();
  setState({ events: data.entries || [] });
};
