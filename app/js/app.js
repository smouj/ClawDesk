import { api, streamLogs } from "./api.js";
import { getState, setState, subscribe } from "./store.js";
import { showToast } from "./ui/components.js";
import {
  renderDashboard,
  renderProfiles,
  renderUsage,
  renderMacros,
  renderEvents,
  renderLogs,
  renderSettings,
} from "./ui/render.js";
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

const syncProfileSelect = (state) => {
  const select = document.getElementById("profile-select");
  if (!select || !state.config?.profiles?.length) return;
  const current = select.value;
  select.innerHTML = state.config.profiles
    .map((profile) => `<option value="${profile.name}">${profile.name}</option>`)
    .join("");
  select.value = state.config.activeProfile || current;
};

const renderAll = (state) => {
  renderDashboard(state);
  renderProfiles(state);
  renderUsage(state);
  renderMacros(state);
  renderEvents(state);
  renderLogs(state.logs || []);
  renderSettings(state);
  syncProfileSelect(state);
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

  const select = document.getElementById("profile-select");
  if (select) {
    syncProfileSelect(getState());
    select.addEventListener("change", async (event) => {
      try {
        await api.activateProfile(event.target.value);
        await loadProfiles({ api, setState });
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
  document.getElementById("view-agents")?.addEventListener("click", async () => {
    try {
      const data = await api.getGatewayControlUrl();
      window.open(data.url, "_blank", "noopener");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });
  document.getElementById("view-events")?.addEventListener("click", () => setActivePage("timeline"));

  const guideModal = document.getElementById("guide-modal");
  const guideTitle = document.getElementById("guide-title");
  const guideBody = document.getElementById("guide-body");
  const closeGuide = () => {
    guideModal?.classList.remove("open");
    guideModal?.setAttribute("aria-hidden", "true");
  };
  const openGuide = (title, body) => {
    if (!guideModal || !guideTitle || !guideBody) return;
    guideTitle.textContent = title;
    guideBody.innerHTML = body;
    guideModal.classList.add("open");
    guideModal.setAttribute("aria-hidden", "false");
  };
  guideModal?.addEventListener("click", (event) => {
    if (event.target === guideModal) closeGuide();
  });
  document.getElementById("guide-close")?.addEventListener("click", closeGuide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGuide();
  });
  document.getElementById("tailscale-guide")?.addEventListener("click", () => {
    openGuide(
      "Acceso remoto seguro con Tailscale",
      `
        <ol>
          <li>Instala Tailscale en el gateway y en el equipo remoto.</li>
          <li>Únelos al mismo Tailnet y valida que se vean con <code>tailscale status</code>.</li>
          <li>Usa la IP privada de Tailscale para abrir el panel, sin exponer puertos públicos.</li>
        </ol>
      `
    );
  });
  document.getElementById("ssh-guide")?.addEventListener("click", () => {
    openGuide(
      "Acceso remoto seguro con SSH Tunneling",
      `
        <ol>
          <li>Crea el túnel: <code>ssh -L 4178:127.0.0.1:4178 user@gateway</code>.</li>
          <li>Abre <code>http://127.0.0.1:4178</code> en tu navegador local.</li>
          <li>Mantén el túnel activo mientras operas el dashboard.</li>
        </ol>
      `
    );
  });

  const profileModal = document.getElementById("profile-modal");
  const profileForm = document.getElementById("profile-form");
  const openProfileModal = () => {
    profileModal?.classList.add("open");
    profileModal?.setAttribute("aria-hidden", "false");
    profileForm?.reset();
  };
  const closeProfileModal = () => {
    profileModal?.classList.remove("open");
    profileModal?.setAttribute("aria-hidden", "true");
  };
  document.getElementById("new-profile")?.addEventListener("click", openProfileModal);
  document.getElementById("profile-close")?.addEventListener("click", closeProfileModal);
  profileModal?.addEventListener("click", (event) => {
    if (event.target === profileModal) closeProfileModal();
  });
  const isLoopback = (value) => ["127.0.0.1", "localhost", "::1"].includes(value);
  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(profileForm);
    const name = String(formData.get("name") || "").trim();
    const bind = String(formData.get("bind") || "").trim() || "127.0.0.1";
    const port = Number(formData.get("port"));
    const token = String(formData.get("token") || "").trim();
    if (!name) {
      showToast("Nombre requerido", "warn");
      return;
    }
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      showToast("Puerto inválido (1024-65535)", "warn");
      return;
    }
    if (bind === "0.0.0.0") {
      showToast("Por seguridad, evita 0.0.0.0. Usa loopback o túneles.", "warn");
      return;
    }
    const currentConfig = getState().config;
    if (!isLoopback(bind) && !currentConfig?.security?.enableRemoteProfiles) {
      showToast("Remote profiles están deshabilitados en config.json", "warn");
      return;
    }
    try {
      await api.saveProfile({ name, data: { bind, port, token } });
      await loadProfiles({ api, setState });
      await loadDashboard({ api, setState });
      showToast("Perfil guardado", "ok");
      closeProfileModal();
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
  const applyLogFilter = () => {
    const filter = filterInput?.value?.toLowerCase() || "";
    const filtered = filter
      ? logLines.filter((line) => line.toLowerCase().includes(filter))
      : logLines;
    setState({ logs: filtered });
  };
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
  filterInput?.addEventListener("input", () => {
    applyLogFilter();
  });

  const refreshRateSlider = document.getElementById("refresh-rate");
  const savedInterval = localStorage.getItem("logInterval");
  if (refreshRateSlider && savedInterval) {
    refreshRateSlider.value = savedInterval;
    refreshRateSlider.dispatchEvent(new Event("input"));
  }

  let logSource = null;
  const startLogStream = (interval) => {
    logSource?.close();
    logSource = streamLogs((event, data) => {
      if (event === "logs") {
        logLines = data.lines || [];
        if (!paused) applyLogFilter();
      }
      if (event === "error") {
        showToast("Error al conectar logs en tiempo real", "warn");
      }
    }, { interval });
  };
  startLogStream(refreshRateSlider?.value || 1500);
  refreshRateSlider?.addEventListener("change", (event) => {
    const interval = Number(event.target.value);
    if (Number.isInteger(interval)) {
      localStorage.setItem("logInterval", String(interval));
      startLogStream(interval);
    }
  });
};

init();
