const navItems = document.querySelectorAll(".nav-item");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const wizardModal = document.getElementById("wizard-modal");
const launchWizard = document.getElementById("launch-wizard");
const closeWizard = document.getElementById("close-wizard");
const confirmWizard = document.getElementById("confirm-wizard");
const supportBundleButtons = document.querySelectorAll(
  "#support-bundle, .log-card .mini:last-child"
);

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
  });
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleButtons.forEach((toggle) => toggle.classList.remove("active"));
    button.classList.add("active");
  });
});

const openModal = () => {
  wizardModal.classList.add("active");
  wizardModal.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  wizardModal.classList.remove("active");
  wizardModal.setAttribute("aria-hidden", "true");
};

launchWizard.addEventListener("click", openModal);
closeWizard.addEventListener("click", closeModal);
confirmWizard.addEventListener("click", closeModal);

supportBundleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const event = new CustomEvent("clawdesk:bundle", {
      detail: {
        time: new Date().toISOString(),
        status: "bundle-generated",
      },
    });
    window.dispatchEvent(event);
    button.textContent = "Bundle listo (descarga)";
  });
});

window.addEventListener("clawdesk:bundle", (event) => {
  console.info("Support bundle generated", event.detail);
});
