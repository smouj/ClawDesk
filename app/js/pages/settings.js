export const initSettings = () => {
  const slider = document.getElementById("refresh-rate");
  const label = document.getElementById("refresh-rate-label");
  if (!slider || !label) return;
  const update = () => {
    label.textContent = `${slider.value}ms`;
  };
  slider.addEventListener("input", update);
  update();
};
