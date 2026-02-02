export const loadDashboard = async ({ api, setState }) => {
  const [config, gateway, usage, health] = await Promise.all([
    api.getConfig(),
    api.getGatewayStatus(),
    api.getUsageSnapshot(),
    api.getHealth(),
  ]);
  setState({ config, gateway, usage, health, profiles: config.profiles });
};
