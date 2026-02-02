import { api, streamLogs } from "./api.js";
import { getState, setState, subscribe } from "./store.js";
import { debounce, showToast } from "./ui/components.js";
import {
  renderDashboard,
  renderProfiles,
  renderUsage,
  renderMacros,
  renderEvents,
  renderLogs,
  renderSettings,
  renderAgents,
  renderSkills,
  renderConfig,
  renderSecurity,
  renderDiagnostics,
} from "./ui/render.js";
import { loadDashboard } from "./pages/dashboard.js";
import { loadProfiles } from "./pages/profiles.js";
import { loadMacros } from "./pages/macros.js";
import { loadUsage } from "./pages/usage.js";
import { loadTimeline } from "./pages/timeline.js";
import { loadLogs } from "./pages/logs.js";
import { initSettings } from "./pages/settings.js";
import { loadAgents } from "./pages/agents.js";
import { loadSkills } from "./pages/skills.js";
import { loadConfigDetail } from "./pages/config.js";
import { loadSecurity } from "./pages/security.js";

const AUTO_SYNC_INTERVAL_MS = 8000;

const setActivePage = (page) => {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });
  document.querySelectorAll(".tabstrip button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
    const isActive = button.dataset.page === page;
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("tabindex", isActive ? "0" : "-1");
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
  renderAgents(state);
  renderSkills(state);
  renderConfig(state);
  renderSecurity(state);
  renderDiagnostics(state);
  syncProfileSelect(state);
};

subscribe(renderAll);

const startAutoSync = ({ api, setState }) => {
  let inFlight = false;
  let timer = null;

  const sync = async () => {
    if (inFlight || document.hidden) return;
    inFlight = true;
    try {
      await loadDashboard({ api, setState });
      await loadTimeline({ api, setState });
    } catch (error) {
      showToast(error.message, "warn");
    } finally {
      inFlight = false;
    }
  };

  const onVisibility = () => {
    if (!document.hidden) sync();
  };

  document.addEventListener("visibilitychange", onVisibility);
  timer = window.setInterval(sync, AUTO_SYNC_INTERVAL_MS);
  sync();

  return () => {
    if (timer) window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};

const init = async () => {
  initSettings();
  try {
    await loadDashboard({ api, setState });
    await loadConfigDetail({ api, setState });
    await loadAgents({ api, setState });
    await loadSkills({ api, setState });
    await loadSecurity({ api, setState });
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

  const tabButtons = Array.from(document.querySelectorAll(".tabstrip button"));
  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => setActivePage(button.dataset.page));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabButtons.length) % tabButtons.length;
      const nextButton = tabButtons[nextIndex];
      nextButton.focus();
      setActivePage(nextButton.dataset.page);
    });
  });

  document.getElementById("refresh-dashboard")?.addEventListener("click", async () => {
    await loadDashboard({ api, setState });
  });

  document.getElementById("agents-refresh")?.addEventListener("click", async () => {
    await loadAgents({ api, setState });
  });
  document.getElementById("skills-refresh")?.addEventListener("click", async () => {
    await loadSkills({ api, setState });
  });
  document.getElementById("config-refresh")?.addEventListener("click", async () => {
    await loadConfigDetail({ api, setState });
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
  document
    .getElementById("view-events")
    ?.addEventListener("click", () => setActivePage("timeline"));
  document.getElementById("open-logs")?.addEventListener("click", () => setActivePage("logs"));

  document.getElementById("agents-list")?.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const name = event.target.dataset.name;
    if (!action || !name) return;
    try {
      if (action === "default") {
        await api.setDefaultAgent(name);
      }
      if (action === "delete") {
        await api.deleteAgent(name);
      }
      if (action === "export") {
        const data = await api.exportAgent(name);
        const blob = new Blob([JSON.stringify(data.agent, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${name}.agent.json`;
        link.click();
      }
      await loadAgents({ api, setState });
      showToast("Acción aplicada", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("agent-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      const metadataRaw = String(formData.get("metadata") || "").trim();
      const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
      await api.createAgent({
        name: formData.get("name"),
        provider: formData.get("provider"),
        model: formData.get("model"),
        storage_path: formData.get("storage_path"),
        metadata,
      });
      event.target.reset();
      await loadAgents({ api, setState });
      showToast("Agente creado", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("agent-import-btn")?.addEventListener("click", async () => {
    const textarea = document.getElementById("agent-import");
    if (!textarea?.value) return;
    try {
      const payload = JSON.parse(textarea.value);
      await api.importAgent(payload);
      textarea.value = "";
      await loadAgents({ api, setState });
      showToast("Agente importado", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("skills-list")?.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const name = event.target.dataset.name;
    if (action !== "toggle" || !name) return;
    const enabled = event.target.dataset.enabled === "true";
    try {
      await api.toggleSkill(name, enabled);
      await loadSkills({ api, setState });
      showToast("Skill actualizada", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("skills-copy")?.addEventListener("click", async () => {
    const requirements = document.getElementById("skills-requirements")?.textContent || "";
    if (!requirements.trim()) return;
    await navigator.clipboard.writeText(requirements);
    showToast("Comandos copiados", "ok");
  });

  const parseJsonFromTextarea = (id) => {
    const textarea = document.getElementById(id);
    if (!textarea) return null;
    return JSON.parse(textarea.value);
  };

  document.getElementById("clawdesk-save")?.addEventListener("click", async () => {
    try {
      await api.updateConfig("clawdesk", parseJsonFromTextarea("clawdesk-config"));
      await loadConfigDetail({ api, setState });
      showToast("Config guardada", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });
  document.getElementById("openclaw-save")?.addEventListener("click", async () => {
    try {
      await api.updateConfig("openclaw", parseJsonFromTextarea("openclaw-config"));
      await loadConfigDetail({ api, setState });
      showToast("Config OpenClaw guardada", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });
  document.getElementById("clawdesk-format")?.addEventListener("click", () => {
    const textarea = document.getElementById("clawdesk-config");
    if (!textarea) return;
    try {
      textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
    } catch (error) {
      showToast(`JSON inválido: ${error.message}`, "warn");
    }
  });
  document.getElementById("openclaw-format")?.addEventListener("click", () => {
    const textarea = document.getElementById("openclaw-config");
    if (!textarea) return;
    try {
      textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
    } catch (error) {
      showToast(`JSON inválido: ${error.message}`, "warn");
    }
  });
  document.getElementById("clawdesk-validate")?.addEventListener("click", () => {
    try {
      JSON.parse(document.getElementById("clawdesk-config").value);
      showToast("JSON válido", "ok");
    } catch (error) {
      showToast(`JSON inválido: ${error.message}`, "warn");
    }
  });
  document.getElementById("openclaw-validate")?.addEventListener("click", () => {
    try {
      JSON.parse(document.getElementById("openclaw-config").value);
      showToast("JSON válido", "ok");
    } catch (error) {
      showToast(`JSON inválido: ${error.message}`, "warn");
    }
  });

  const refreshBackups = async () => {
    try {
      const clawdeskBackups = await api.listConfigBackups("clawdesk");
      const openclawBackups = await api.listConfigBackups("openclaw");
      const clawdeskSelect = document.getElementById("clawdesk-backups");
      const openclawSelect = document.getElementById("openclaw-backups");
      if (clawdeskSelect) {
        clawdeskSelect.innerHTML = (clawdeskBackups.backups || [])
          .map((entry) => `<option value="${entry}">${entry}</option>`)
          .join("");
      }
      if (openclawSelect) {
        openclawSelect.innerHTML = (openclawBackups.backups || [])
          .map((entry) => `<option value="${entry}">${entry}</option>`)
          .join("");
      }
    } catch (error) {
      showToast(error.message, "warn");
    }
  };
  await refreshBackups();

  document.getElementById("clawdesk-restore")?.addEventListener("click", async () => {
    const backup = document.getElementById("clawdesk-backups")?.value;
    if (!backup) return;
    await api.restoreConfigBackup("clawdesk", backup);
    await loadConfigDetail({ api, setState });
    showToast("Backup restaurado", "ok");
  });
  document.getElementById("openclaw-restore")?.addEventListener("click", async () => {
    const backup = document.getElementById("openclaw-backups")?.value;
    if (!backup) return;
    await api.restoreConfigBackup("openclaw", backup);
    await loadConfigDetail({ api, setState });
    showToast("Backup restaurado", "ok");
  });

  document.getElementById("security-audit")?.addEventListener("click", async () => {
    try {
      const result = await api.runSecurityAudit(false);
      setState({ securityReport: result.summary || "Audit completado." });
      showToast("Audit ejecutado", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });
  document.getElementById("security-audit-deep")?.addEventListener("click", async () => {
    try {
      const result = await api.runSecurityAudit(true);
      setState({ securityReport: result.summary || "Audit deep completado." });
      showToast("Audit deep ejecutado", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  document.getElementById("run-doctor")?.addEventListener("click", async () => {
    try {
      const result = await api.runDoctor();
      setState({ securityReport: result.summary || "Doctor ejecutado." });
      showToast("Doctor ejecutado", "ok");
    } catch (error) {
      showToast(error.message, "warn");
    }
  });

  const bindAction = (id, action, label) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener("click", async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Procesando...";
      try {
        await api.gatewayAction(action);
        await loadDashboard({ api, setState });
        showToast(`${label} ejecutado`, "ok");
      } catch (error) {
        showToast(error.message, "warn");
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  };
  bindAction("gateway-start", "start", "Inicio");
  bindAction("gateway-stop", "stop", "Detención");
  bindAction("gateway-restart", "restart", "Reinicio");

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
  const applyLogFilterDebounced = debounce(applyLogFilter, 200);
  document.getElementById("toggle-scroll")?.addEventListener("click", (event) => {
    paused = !paused;
    event.target.textContent = paused ? "Reanudar" : "Pausar";
  });
  document.getElementById("download-logs")?.addEventListener("click", () => {
    const blob = new Blob([logLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gateway-logs.txt";
    link.click();
  });
  document.getElementById("clear-logs")?.addEventListener("click", () => {
    logLines = [];
    setState({ logs: [] });
  });
  filterInput?.addEventListener("input", () => {
    applyLogFilterDebounced();
  });

  const refreshRateSlider = document.getElementById("refresh-rate");
  const savedInterval = localStorage.getItem("logInterval");
  if (refreshRateSlider && savedInterval) {
    refreshRateSlider.value = savedInterval;
    refreshRateSlider.dispatchEvent(new Event("input"));
  }

  let logSource = null;
  let reconnectTimer = null;
  let reconnectCount = 0;
  const scheduleLogReconnect = (interval) => {
    if (reconnectTimer) return;
    const delay = Math.min(8000, 1000 * 2 ** reconnectCount);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      reconnectCount += 1;
      startLogStream(interval);
    }, delay);
  };
  const startLogStream = (interval) => {
    logSource?.close();
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    logSource = streamLogs(
      (event, data) => {
        if (event === "logs") {
          reconnectCount = 0;
          logLines = data.lines || [];
          if (!paused) applyLogFilter();
        }
        if (event === "error") {
          scheduleLogReconnect(interval);
        }
      },
      { interval }
    );
  };
  startLogStream(refreshRateSlider?.value || 1500);
  refreshRateSlider?.addEventListener("change", (event) => {
    const interval = Number(event.target.value);
    if (Number.isInteger(interval)) {
      localStorage.setItem("logInterval", String(interval));
      startLogStream(interval);
    }
  });

  startAutoSync({ api, setState });
};

init();
