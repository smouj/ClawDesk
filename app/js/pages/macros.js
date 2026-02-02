export const loadMacros = async ({ api, setState }) => {
  const data = await api.getMacros();
  setState({ macros: data.macros || {} });
};
