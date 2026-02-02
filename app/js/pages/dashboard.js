export const loadDashboard = async ({ api, setState }) => {
  const [config, gateway, usage] = await Promise.all([
    api.getConfig(),
    api.getGatewayStatus(),
    api.getUsageSnapshot(),
  ]);
  setState({ config, gateway, usage, profiles: config.profiles });
};
