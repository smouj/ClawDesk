import { api, streamLogs } from "./api.js";
import { getState, setState, subscribe } from "./store.js";
import { showToast } from "./ui/components.js";
import { renderDashboard, renderProfiles, renderUsage, renderMacros, renderEvents, renderLogs } from "./ui/render.js";
import { loadDashboard } from "./pages/dashboard.js";
import { loadProfiles } from "./pages/profiles.js";
import { loadMacros } from "./pages/macros.js";
import { loadUsage } from "./pages/usage.js";
import { loadTimeline } from "./pages/timeline.js";
import { loadLogs } from "./pages/logs.js";
import { initSettings } from "./pages/settings.js";

const setActivePage = (page) => {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });
  document.querySelectorAll(".tabstrip button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
};

const renderAll = (state) => {
  renderDashboard(state);
  renderProfiles(state);
  renderUsage(state);
  renderMacros(state);
  renderEvents(state);
  renderLogs(state.logs || []);
};

subscribe(renderAll);

const init = async () => {
  initSettings();
  try {
    await loadDashboard({ api, setState });
    await loadProfiles({ api, setState });
    await loadMacros({ api, setState });
    await loadUsage({ api, setState });
    await loadTimeline({ api, setState });
    await loadLogs({ api, setState });
  } catch (error) {
    showToast(error.message, "warn");
  }

  const config = getState().config;
  const select = document.getElementById("profile-select");
  if (config && select) {
    select.innerHTML = config.profiles
      .map((profile) => `<option value="${profile.name}">${profile.name}</option>`)
      .join("");
    select.value = config.activeProfile;
    select.addEventListener("change", async (event) => {
      try {
        await api.activateProfile(event.target.value);
        await loadDashboard({ api, setState });
        showToast("Perfil activado", "ok");
      } catch (error) {
        showToast(error.message, "warn");
      }
    });
  }

  document.querySelectorAll(".tabstrip button").forEach((button) => {
    button.addEventListener("click", () => setActivePage(button.dataset.page));
  });

  document.getElementById("refresh-dashboard")?.addEventListener("click", async () => {
    await loadDashboard({ api, setState });
  });

  document.getElementById("open-control-ui")?.addEventListener("click", async () => {
    try {
      const data = await api.getGatewayControlUrl();
      window.open(data.url, "_blank", "noopener");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("profiles-list")?.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const name = event.target.dataset.name;
    if (!action || !name) return;
    try {
      if (action === "activate") {
        await api.activateProfile(name);
        await loadProfiles({ api, setState });
      }
      if (action === "delete") {
        await api.deleteProfile(name);
        await loadProfiles({ api, setState });
      }
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("macro-list")?.addEventListener("click", async (event) => {
    const name = event.target.dataset.name;
    if (!name) return;
    const output = document.getElementById("macro-output");
    try {
      output.textContent = `Running ${name}...`;
      const result = await api.runMacro(name);
      output.textContent = JSON.stringify(result.results, null, 2);
      showToast(`Macro ${name} ejecutada`, "ok");
    } catch (error) {
      output.textContent = error.message;
      showToast(error.message, "warn");
    }
  });

  document.getElementById("usage-range")?.addEventListener("change", async (event) => {
    await loadUsage({ api, setState }, event.target.value);
  });

  document.getElementById("export-json")?.addEventListener("click", async () => {
    const range = document.getElementById("usage-range").value;
    const data = await api.exportUsage(range, "json");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usage-${range}.json`;
    link.click();
  });

  document.getElementById("export-csv")?.addEventListener("click", async () => {
    const range = document.getElementById("usage-range").value;
    const csv = await api.exportUsage(range, "csv");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usage-${range}.csv`;
    link.click();
  });

  document.getElementById("refresh-events")?.addEventListener("click", async () => {
    await loadTimeline({ api, setState });
  });

  let paused = false;
  let logLines = [];
  const filterInput = document.getElementById("log-filter");
  document.getElementById("toggle-scroll")?.addEventListener("click", (event) => {
    paused = !paused;
    event.target.textContent = paused ? "Resume" : "Pause";
  });
  document.getElementById("download-logs")?.addEventListener("click", () => {
    const blob = new Blob([logLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gateway-logs.txt";
    link.click();
  });

  streamLogs((event, data) => {
    if (event === "logs") {
      logLines = data.lines || [];
      const filter = filterInput?.value?.toLowerCase() || "";
      const filtered = filter
        ? logLines.filter((line) => line.toLowerCase().includes(filter))
        : logLines;
      if (!paused) {
        setState({ logs: filtered });
      }
    }
  });
};

init();
