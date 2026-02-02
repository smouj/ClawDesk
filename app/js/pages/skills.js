export const loadSkills = async ({ api, setState }) => {
  const data = await api.getSkills();
  setState({ skillsData: data });
};
